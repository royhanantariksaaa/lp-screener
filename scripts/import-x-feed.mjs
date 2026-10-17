#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const inputPath = process.argv[2];
const outputPath = process.argv[3] ?? path.resolve("api", "x-feed-snapshot.json");

if (!inputPath) {
  console.error("Usage: node scripts/import-x-feed.mjs <twscrape-json-or-jsonl> [output.json]");
  process.exit(1);
}

const source = await readFile(inputPath, "utf8");
let parsed;
try {
  parsed = JSON.parse(source);
} catch {
  parsed = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); } catch (error) { throw new Error(`Invalid JSONL at line ${index + 1}: ${error.message}`); }
  });
}

const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.posts) ? parsed.posts : Array.isArray(parsed?.data) ? parsed.data : [parsed];
const unique = (values) => [...new Set(values.filter(Boolean).map(String))];
const textOf = (row) => String(row?.text ?? row?.rawContent ?? row?.fullText ?? row?.content ?? "").trim();
const handleOf = (row) => String(row?.xHandle ?? row?.username ?? row?.user?.username ?? row?.author?.username ?? "").replace(/^@+/, "").trim();
const idOf = (row) => String(row?.id ?? row?.tweetId ?? row?.restId ?? "").trim();
const dateOf = (row) => row?.createdAt ?? row?.created_at ?? row?.date ?? row?.created ?? undefined;
const numberOf = (...values) => {
  for (const value of values) {
    const parsedValue = Number(value);
    if (Number.isFinite(parsedValue)) return parsedValue;
  }
  return 0;
};
const extractContractAddresses = (text) => unique([
  ...(text.match(/(?<![A-Za-z0-9])[1-9A-HJ-NP-Za-km-z]{32,44}(?![A-Za-z0-9])/g) ?? []),
  ...(text.match(/(?<![A-Za-z0-9])0x[a-fA-F0-9]{40}(?![A-Za-z0-9])/g) ?? []),
]).slice(0, 8);
const extractTokenMentions = (text) => unique([
  ...(text.match(/\$[A-Za-z][A-Za-z0-9_]{1,14}/g) ?? []).map((value) => value.toUpperCase()),
  ...(text.match(/#[A-Za-z][A-Za-z0-9_]{1,14}/g) ?? []).map((value) => value.toUpperCase()),
  ...(text.match(/(?<![A-Za-z0-9$])\b[A-Z][A-Z0-9_]{2,9}\b(?![A-Za-z0-9])/g) ?? []),
]).slice(0, 16);

const posts = rows.map((row) => {
  const handle = handleOf(row);
  const id = idOf(row);
  const text = textOf(row);
  if (!handle || !id) return undefined;
  const metrics = row?.publicMetrics ?? row?.public_metrics ?? {};
  const replyTo = row?.replyToUserId ?? row?.in_reply_to_user_id ?? row?.inReplyToTweetId ?? row?.inReplyToStatusId;
  return {
    id,
    xHandle: handle,
    url: String(row?.url ?? row?.tweetUrl ?? `https://x.com/${encodeURIComponent(handle)}/status/${encodeURIComponent(id)}`),
    text: text.slice(0, 560),
    createdAt: dateOf(row) ? String(dateOf(row)) : undefined,
    contractAddresses: Array.isArray(row?.contractAddresses) ? unique(row.contractAddresses).slice(0, 8) : extractContractAddresses(text),
    tokenMentions: Array.isArray(row?.tokenMentions) ? unique(row.tokenMentions).slice(0, 16) : extractTokenMentions(text),
    isReply: Boolean(row?.isReply ?? row?.inReplyToUserId ?? row?.in_reply_to_user_id ?? row?.inReplyToTweetId ?? row?.inReplyToStatusId),
    replyToUserId: replyTo ? String(replyTo) : undefined,
    publicMetrics: {
      replies: numberOf(metrics.replies, metrics.reply_count, row?.replyCount),
      likes: numberOf(metrics.likes, metrics.like_count, row?.likeCount),
      reposts: numberOf(metrics.reposts, metrics.retweet_count, row?.retweetCount),
      quotes: numberOf(metrics.quotes, metrics.quote_count, row?.quoteCount),
    },
    authorConfidence: "EXACT",
  };
}).filter(Boolean);

const profiles = Object.fromEntries([...new Set(posts.map((post) => post.xHandle))].map((handle) => {
  const profilePosts = posts.filter((post) => post.xHandle.toLowerCase() === handle.toLowerCase()).sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
  return [handle.toLowerCase(), {
    xHandle: handle,
    posts: profilePosts,
    summary: {
      postCount: profilePosts.length,
      replyCount: profilePosts.filter((post) => post.isReply).length,
      contractCount: profilePosts.reduce((total, post) => total + post.contractAddresses.length, 0),
      engagement: profilePosts.reduce((total, post) => total + post.publicMetrics.replies + post.publicMetrics.likes + post.publicMetrics.reposts + post.publicMetrics.quotes, 0),
      latestAt: profilePosts.map((post) => post.createdAt).filter(Boolean).sort().at(-1),
    },
  }];
}));

const output = {
  status: "LIVE",
  source: "Authorized X snapshot import",
  profiles,
  posts,
  fetchedAt: new Date().toISOString(),
  window: "7d",
  note: "Imported from a private collector. Keep the source account/session outside the repository.",
};

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Imported ${posts.length} posts for ${Object.keys(profiles).length} profiles into ${outputPath}`);
