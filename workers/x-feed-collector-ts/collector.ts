import { promises as fs } from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

type XPostEvidence = {
  id: string;
  xHandle: string;
  url: string;
  text: string;
  createdAt?: string;
  contractAddresses: string[];
  tokenMentions: string[];
  isReply: boolean;
  replyToUserId?: string;
  publicMetrics: { replies: number; likes: number; reposts: number; quotes: number };
  authorConfidence: "EXACT";
};

type XProfile = {
  xHandle: string;
  posts: XPostEvidence[];
  summary: {
    postCount: number;
    replyCount: number;
    contractCount: number;
    engagement: number;
    latestAt?: string;
  };
};

type XFeedSnapshot = {
  status: "LIVE";
  source: string;
  profiles: Record<string, XProfile>;
  posts: XPostEvidence[];
  fetchedAt: string;
  window: string;
  stale: false;
  note?: string;
};

type CursorState = { cursor: number };

const ROOT = process.cwd();
const value = (key: string, fallback = "") => String(process.env[key] ?? fallback).trim();
const numberValue = (key: string, fallback: number, min: number, max: number) => {
  const parsed = Number.parseInt(value(key), 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

function loadDotEnv(filePath: string) {
  return fs.readFile(filePath, "utf8").then((contents) => {
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim();
      let parsed = line.slice(separator + 1).trim();
      if ((parsed.startsWith("\"") && parsed.endsWith("\"")) || (parsed.startsWith("'") && parsed.endsWith("'"))) parsed = parsed.slice(1, -1);
      if (process.env[key] === undefined) process.env[key] = parsed;
    }
  }).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
  });
}

const unique = (items: string[]) => [...new Set(items.filter(Boolean))];
const safeHandle = (handle: string) => handle.trim().replace(/^@+/, "").slice(0, 15);
const handleKey = (handle: string) => safeHandle(handle).toLowerCase();

function extractPost(tweet: JsonRecord, users: Map<string, JsonRecord>): XPostEvidence | undefined {
  const author = users.get(String(tweet.author_id ?? ""));
  const username = safeHandle(String(author?.username ?? ""));
  const id = String(tweet.id ?? "").trim();
  if (!username || !id) return undefined;
  const text = String(tweet.text ?? "").trim();
  const solana = text.match(/(?<![A-Za-z0-9])[1-9A-HJ-NP-Za-km-z]{32,44}(?![A-Za-z0-9])/g) ?? [];
  const evm = text.match(/(?<![A-Za-z0-9])0x[a-fA-F0-9]{40}(?![A-Za-z0-9])/g) ?? [];
  const dollar = text.match(/\$[A-Za-z][A-Za-z0-9_]{1,14}/g) ?? [];
  const hashtag = text.match(/#[A-Za-z][A-Za-z0-9_]{1,14}/g) ?? [];
  const uppercase = text.match(/\b[A-Z][A-Z0-9_]{2,14}\b/g) ?? [];
  const stopwords = new Set(["THE", "AND", "FOR", "NOT", "THIS", "THAT", "WITH", "FROM", "JUST", "SOL", "USD", "USDC", "LFG", "DYOR", "ATH", "ATL", "CA"]);
  const tokenMentions = unique([...dollar, ...hashtag, ...uppercase].map((token) => token.replace(/^[#$]/, "").toUpperCase()).filter((token) => token.length >= 2 && !stopwords.has(token)));
  const metrics = (tweet.public_metrics as JsonRecord | undefined) ?? {};
  const referenced = Array.isArray(tweet.referenced_tweets) ? tweet.referenced_tweets as JsonRecord[] : [];
  const isReply = Boolean(tweet.in_reply_to_user_id || referenced.some((item) => item.type === "replied_to"));
  return {
    id,
    xHandle: username,
    url: `https://x.com/${encodeURIComponent(username)}/status/${encodeURIComponent(id)}`,
    text: text.slice(0, 560),
    createdAt: typeof tweet.created_at === "string" ? tweet.created_at : undefined,
    contractAddresses: unique([...solana, ...evm]).slice(0, 8),
    tokenMentions: tokenMentions.slice(0, 16),
    isReply,
    replyToUserId: tweet.in_reply_to_user_id ? String(tweet.in_reply_to_user_id) : undefined,
    publicMetrics: {
      replies: Number(metrics.reply_count ?? 0),
      likes: Number(metrics.like_count ?? 0),
      reposts: Number(metrics.retweet_count ?? 0),
      quotes: Number(metrics.quote_count ?? 0),
    },
    authorConfidence: "EXACT",
  };
}

function summarize(posts: XPostEvidence[]): XProfile["summary"] {
  return {
    postCount: posts.length,
    replyCount: posts.filter((post) => post.isReply).length,
    contractCount: posts.reduce((count, post) => count + post.contractAddresses.length, 0),
    engagement: posts.reduce((count, post) => count + post.publicMetrics.replies + post.publicMetrics.likes + post.publicMetrics.reposts + post.publicMetrics.quotes, 0),
    latestAt: posts.map((post) => post.createdAt).filter(Boolean).sort().at(-1),
  };
}

async function fetchJson(url: string, init: RequestInit, retries = 2): Promise<JsonRecord> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, init);
      const body = await response.json().catch(() => ({})) as JsonRecord;
      if (response.ok) return body;
      const detail = String(body.detail ?? body.title ?? body.error ?? body.message ?? `HTTP ${response.status}`);
      const error = new Error(detail);
      (error as Error & { status?: number }).status = response.status;
      if (response.status !== 429 && response.status < 500) throw error;
      lastError = error;
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      if (status !== undefined && status !== 429 && status < 500) throw error;
      lastError = error;
      if (attempt === retries) break;
    }
    await new Promise((resolve) => setTimeout(resolve, 750 * 2 ** attempt));
  }
  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

async function readHandles() {
  const contents = await fs.readFile(path.join(ROOT, "handles.txt"), "utf8");
  const handles = contents.split(/\r?\n/).map(safeHandle).filter((handle) => /^[A-Za-z0-9_]{1,15}$/.test(handle));
  if (!handles.length) throw new Error("handles.txt is empty or contains no valid X handles");
  return unique(handles);
}

async function readCursor(filePath: string): Promise<CursorState> {
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf8")) as Partial<CursorState>;
    return { cursor: Number.isFinite(parsed.cursor) ? Math.max(0, Number(parsed.cursor)) : 0 };
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return { cursor: 0 };
    throw error;
  }
}

async function writeJson(filePath: string, payload: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function selectHandles(handles: string[], cursor: CursorState, count: number) {
  const start = cursor.cursor % handles.length;
  const selected = Array.from({ length: Math.min(count, handles.length) }, (_, index) => handles[(start + index) % handles.length]);
  return { selected, nextCursor: (start + selected.length) % handles.length };
}

async function queryBatch(handles: string[], bearer: string, recentDays: number): Promise<XPostEvidence[]> {
  const query = `(${handles.map((handle) => `from:${handle}`).join(" OR ")}) -is:retweet`;
  const params = new URLSearchParams({
    query,
    max_results: "100",
    start_time: new Date(Date.now() - recentDays * 86_400_000).toISOString(),
    "tweet.fields": "created_at,author_id,conversation_id,in_reply_to_user_id,public_metrics,referenced_tweets,entities",
    expansions: "author_id",
    "user.fields": "username,name,profile_image_url,public_metrics",
  });
  const apiBase = value("X_API_BASE_URL", "https://api.x.com").replace(/\/$/, "");
  const payload = await fetchJson(`${apiBase}/2/tweets/search/recent?${params}`, { headers: { accept: "application/json", authorization: `Bearer ${bearer}` } });
  const users = new Map<string, JsonRecord>();
  const includes = (payload.includes as JsonRecord | undefined) ?? {};
  for (const user of Array.isArray(includes.users) ? includes.users as JsonRecord[] : []) users.set(String(user.id ?? ""), user);
  const posts = (Array.isArray(payload.data) ? payload.data as JsonRecord[] : []).map((tweet) => extractPost(tweet, users)).filter((post): post is XPostEvidence => Boolean(post));
  return posts;
}

async function main() {
  await loadDotEnv(path.join(ROOT, ".env.local"));
  const publishUrl = value("PUBLISH_URL");
  const publishToken = value("PUBLISH_TOKEN");
  const bearer = value("X_BEARER_TOKEN");
  if (!publishUrl || !publishToken) throw new Error("PUBLISH_URL and PUBLISH_TOKEN are required in .env.local");
  if (!bearer) throw new Error("X_BEARER_TOKEN is required for the official X API v2 feed");
  const handles = await readHandles();
  const stateFile = path.resolve(ROOT, value("X_STATE_FILE", "./data/cursor.json"));
  const snapshotFile = path.resolve(ROOT, value("X_SNAPSHOT_FILE", "./data/x-feed-snapshot.json"));
  const cursor = await readCursor(stateFile);
  const { selected, nextCursor } = selectHandles(handles, cursor, numberValue("X_HANDLES_PER_RUN", 20, 1, handles.length));
  const batchSize = numberValue("X_BATCH_SIZE", 10, 1, 20);
  const recentDays = numberValue("X_RECENT_DAYS", 7, 1, 7);
  const posts: XPostEvidence[] = [];
  for (let index = 0; index < selected.length; index += batchSize) {
    const batch = selected.slice(index, index + batchSize);
    console.log(`Querying ${batch.length} handles (${index + 1}-${index + batch.length}/${selected.length})`);
    posts.push(...await queryBatch(batch, bearer, recentDays));
  }
  const deduped = [...new Map(posts.map((post) => [post.id, post])).values()].sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
  if (!deduped.length && value("X_ALLOW_EMPTY_PUBLISH", "0") !== "1") {
    console.log("No posts returned; preserving the last Vercel snapshot and cursor.");
    return;
  }
  const profiles: Record<string, XProfile> = {};
  for (const handle of selected) {
    const profilePosts = deduped.filter((post) => handleKey(post.xHandle) === handleKey(handle));
    profiles[handleKey(handle)] = { xHandle: handle, posts: profilePosts, summary: summarize(profilePosts) };
  }
  const snapshot: XFeedSnapshot = {
    status: "LIVE",
    source: "Official X API v2 · local Windows Task Scheduler worker",
    profiles,
    posts: deduped,
    fetchedAt: new Date().toISOString(),
    window: `${recentDays}d`,
    stale: false,
    note: `Rotated ${selected.length} of ${handles.length} tracked profiles.`,
  };
  await writeJson(snapshotFile, snapshot);
  if (value("X_DRY_RUN", "0") === "1") {
    await writeJson(stateFile, { cursor: nextCursor });
    console.log(`Dry run complete: ${deduped.length} posts, cursor ${nextCursor}.`);
    return;
  }
  const response = await fetch(publishUrl, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${publishToken}`, "user-agent": "lp-screener-x-feed-collector/1.0" },
    body: JSON.stringify(snapshot),
  });
  const result = await response.json().catch(() => ({})) as JsonRecord;
  if (!response.ok) throw new Error(`Vercel publish failed (${response.status}): ${String(result.error ?? result.message ?? "unknown error")}`);
  await writeJson(stateFile, { cursor: nextCursor });
  console.log(`Published ${deduped.length} posts for ${selected.length} handles; next cursor ${nextCursor}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
