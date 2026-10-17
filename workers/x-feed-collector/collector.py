#!/usr/bin/env python3
"""Collect a bounded X profile snapshot and publish the app's xfeed schema.

The collector is intentionally separate from the public app. Credentials and the
twscrape account database stay in the worker environment; only normalized post
evidence is sent to the authenticated publish endpoint.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from twscrape import API, gather


BASE_DIR = Path(__file__).resolve().parent
SNAPSHOT_PATH = Path(os.getenv("SNAPSHOT_PATH", BASE_DIR / "data" / "x-feed-snapshot.json"))
HANDLE_PATTERN = re.compile(r"^[A-Za-z0-9_]{1,15}$")
SOLANA_PATTERN = re.compile(r"(?<![A-Za-z0-9])[1-9A-HJ-NP-Za-km-z]{32,44}(?![A-Za-z0-9])")
EVM_PATTERN = re.compile(r"(?<![A-Za-z0-9])0x[a-fA-F0-9]{40}(?![A-Za-z0-9])")
TICKER_PATTERN = re.compile(r"(?<![A-Za-z0-9$])\$?[A-Z][A-Z0-9_]{2,14}\b")


def env_int(name: str, default: int, minimum: int, maximum: int) -> int:
    try:
        return max(minimum, min(maximum, int(os.getenv(name, str(default)))))
    except ValueError:
        return default


def unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(value for value in values if value))


def handles_from_config() -> list[str]:
    configured = os.getenv("X_HANDLES", "").strip()
    if configured:
        values = re.split(r"[\s,;]+", configured)
    else:
        source = BASE_DIR / "handles.txt"
        values = source.read_text(encoding="utf-8").splitlines() if source.exists() else []
    return [value.lstrip("@").strip() for value in values if HANDLE_PATTERN.fullmatch(value.lstrip("@"))]


def select_handles(handles: list[str]) -> list[str]:
    limit = env_int("X_HANDLES_PER_RUN", 20, 1, 100)
    if len(handles) <= limit:
        return handles
    run_number = int(os.getenv("GITHUB_RUN_NUMBER", "0") or 0)
    start = (run_number * limit) % len(handles)
    return [handles[(start + offset) % len(handles)] for offset in range(limit)]


def iso_date(value: object) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return str(value.isoformat())
    return str(value)


def tweet_to_post(tweet: object, fallback_handle: str) -> dict | None:
    tweet_id = str(getattr(tweet, "id_str", getattr(tweet, "id", "")) or "").strip()
    user = getattr(tweet, "user", None)
    handle = str(getattr(user, "username", fallback_handle) or fallback_handle).lstrip("@").strip()
    text = str(getattr(tweet, "rawContent", "") or "").strip()
    if not tweet_id or not handle:
        return None
    contract_addresses = unique(SOLANA_PATTERN.findall(text) + EVM_PATTERN.findall(text))[:8]
    cashtags = [f"${value.lstrip('$').upper()}" for value in (getattr(tweet, "cashtags", []) or [])]
    token_mentions = unique(cashtags + [value.upper() for value in TICKER_PATTERN.findall(text)])[:16]
    reply_id = getattr(tweet, "inReplyToTweetIdStr", getattr(tweet, "inReplyToTweetId", None))
    return {
        "id": tweet_id,
        "xHandle": handle,
        "url": str(getattr(tweet, "url", f"https://x.com/{handle}/status/{tweet_id}")),
        "text": text[:560],
        "createdAt": iso_date(getattr(tweet, "date", None)),
        "contractAddresses": contract_addresses,
        "tokenMentions": token_mentions,
        "isReply": reply_id is not None,
        "replyToUserId": str(reply_id) if reply_id is not None else None,
        "publicMetrics": {
            "replies": int(getattr(tweet, "replyCount", 0) or 0),
            "likes": int(getattr(tweet, "likeCount", 0) or 0),
            "reposts": int(getattr(tweet, "retweetCount", 0) or 0),
            "quotes": int(getattr(tweet, "quoteCount", 0) or 0),
        },
        "authorConfidence": "EXACT",
    }


def build_profiles(posts: list[dict], handles: list[str]) -> dict:
    profiles: dict[str, dict] = {}
    for handle in handles:
        profile_posts = sorted(
            [post for post in posts if post["xHandle"].lower() == handle.lower()],
            key=lambda post: str(post.get("createdAt") or ""),
            reverse=True,
        )
        profiles[handle.lower()] = {
            "xHandle": handle,
            "posts": profile_posts,
            "summary": {
                "postCount": len(profile_posts),
                "replyCount": sum(1 for post in profile_posts if post["isReply"]),
                "contractCount": sum(len(post["contractAddresses"]) for post in profile_posts),
                "engagement": sum(
                    sum(post["publicMetrics"].values()) for post in profile_posts
                ),
                "latestAt": profile_posts[0].get("createdAt") if profile_posts else None,
            },
        }
    return profiles


async def collect() -> dict:
    handles = handles_from_config()
    selected_handles = select_handles(handles)
    if not selected_handles:
        raise RuntimeError("No valid handles configured in handles.txt or X_HANDLES")
    cookies = os.getenv("TWS_COOKIES", "").strip()
    if not cookies:
        raise RuntimeError("TWS_COOKIES is required in the worker secret store")

    db_path = str(Path(os.getenv("TWS_DB_PATH", BASE_DIR / "data" / "accounts.db")))
    account_name = os.getenv("TWS_ACCOUNT", "collector")
    api = API(db_path, raise_when_no_account=True, wait_timeout=30)
    await api.pool.add_account_cookies(account_name, cookies)

    limit = env_int("X_POSTS_PER_HANDLE", 30, 1, 100)
    posts: list[dict] = []
    errors: list[dict] = []
    for handle in selected_handles:
        try:
            user = await api.user_by_login(handle)
            if not user:
                errors.append({"handle": handle, "error": "profile_not_found"})
                continue
            tweets = await gather(api.user_tweets_and_replies(user.id, limit=limit))
            for tweet in tweets:
                post = tweet_to_post(tweet, handle)
                if post:
                    posts.append(post)
            await asyncio.sleep(0.25)
        except Exception as error:  # Keep one profile failure from dropping the run.
            errors.append({"handle": handle, "error": str(error)[:240]})

    deduped = {post["id"]: post for post in posts}
    ordered_posts = sorted(deduped.values(), key=lambda post: str(post.get("createdAt") or ""), reverse=True)
    return {
        "status": "LIVE",
        "source": "Private X collector · twscrape",
        "profiles": build_profiles(ordered_posts, selected_handles),
        "posts": ordered_posts,
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "window": "7d",
        "note": f"Collected {len(selected_handles)} profiles; {len(errors)} profile errors.",
        "collector": {
            "handlesRequested": len(selected_handles),
            "posts": len(ordered_posts),
            "errors": errors,
        },
    }


def write_snapshot(snapshot: dict) -> None:
    SNAPSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)
    SNAPSHOT_PATH.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def publish(snapshot: dict) -> None:
    url = os.getenv("PUBLISH_URL", "").strip()
    token = os.getenv("PUBLISH_TOKEN", "").strip()
    if not url or not token:
        print("PUBLISH_URL/PUBLISH_TOKEN not configured; snapshot was written locally")
        return
    body = json.dumps(snapshot, ensure_ascii=False).encode("utf-8")
    request = Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "lp-screener-x-collector/1.0",
        },
    )
    try:
        with urlopen(request, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))
        print(json.dumps({"published": True, "status": result.get("status"), "source": result.get("source")}))
    except (HTTPError, URLError, TimeoutError) as error:
        raise RuntimeError(f"snapshot publish failed: {error}") from error


async def main() -> int:
    snapshot = await collect()
    write_snapshot(snapshot)
    if not snapshot["posts"] and os.getenv("ALLOW_EMPTY_PUBLISH", "0") != "1":
        print("No posts collected; keeping the previous remote snapshot")
        return 0
    publish(snapshot)
    print(json.dumps({"handles": snapshot["collector"]["handlesRequested"], "posts": snapshot["collector"]["posts"], "errors": len(snapshot["collector"]["errors"])}))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(asyncio.run(main()))
    except KeyboardInterrupt:
        raise SystemExit(130)
