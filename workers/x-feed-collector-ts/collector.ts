import { promises as fs } from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";

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
  summary: { postCount: number; replyCount: number; contractCount: number; engagement: number; latestAt?: string };
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
type ScrapedTweet = { id: string; xHandle: string; url: string; text: string; createdAt?: string; labels: string[]; isReply: boolean };

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

function extractEvidence(text: string) {
  const solana = text.match(/(?<![A-Za-z0-9])[1-9A-HJ-NP-Za-km-z]{32,44}(?![A-Za-z0-9])/g) ?? [];
  const evm = text.match(/(?<![A-Za-z0-9])0x[a-fA-F0-9]{40}(?![A-Za-z0-9])/g) ?? [];
  const dollar = text.match(/\$[A-Za-z][A-Za-z0-9_]{1,14}/g) ?? [];
  const hashtag = text.match(/#[A-Za-z][A-Za-z0-9_]{1,14}/g) ?? [];
  const uppercase = text.match(/\b[A-Z][A-Z0-9_]{2,14}\b/g) ?? [];
  const stopwords = new Set(["THE", "AND", "FOR", "NOT", "THIS", "THAT", "WITH", "FROM", "JUST", "SOL", "USD", "USDC", "LFG", "DYOR", "ATH", "ATL", "CA"]);
  return {
    contractAddresses: unique([...solana, ...evm]).slice(0, 8),
    tokenMentions: unique([...dollar, ...hashtag, ...uppercase].map((token) => token.replace(/^[#$]/, "").toUpperCase()).filter((token) => token.length >= 2 && !stopwords.has(token))).slice(0, 16),
  };
}

function parseMetric(labels: string[], pattern: RegExp) {
  const label = labels.find((candidate) => pattern.test(candidate));
  const match = label?.match(/([\d,.]+)\s*/);
  return match ? Number(match[1].replace(/,/g, "")) : 0;
}

function normalizeScrapedTweet(raw: { id: string; xHandle: string; url: string; text: string; createdAt?: string; labels: string[]; isReply: boolean }): XPostEvidence {
  const evidence = extractEvidence(raw.text);
  return {
    id: raw.id,
    xHandle: safeHandle(raw.xHandle),
    url: raw.url,
    text: raw.text.slice(0, 560),
    createdAt: raw.createdAt,
    ...evidence,
    isReply: raw.isReply,
    publicMetrics: {
      replies: parseMetric(raw.labels, /repl(?:y|ies)/i),
      likes: parseMetric(raw.labels, /like/i),
      reposts: parseMetric(raw.labels, /repost|retweet/i),
      quotes: parseMetric(raw.labels, /quote/i),
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

async function scrapeBatch(page: Page, handles: string[], recentDays: number): Promise<XPostEvidence[]> {
  const query = `(${handles.map((handle) => `from:${handle}`).join(" OR ")}) -filter:replies`;
  const url = `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(3_000);
  for (let index = 0; index < 2; index += 1) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.4));
    await page.waitForTimeout(1_000);
  }
  const rawTweets = await page.locator('article[data-testid="tweet"]').evaluateAll((nodes) => nodes.map((node) => {
    const article = node as HTMLElement;
    const links = Array.from(article.querySelectorAll<HTMLAnchorElement>('a[href]')).map((link) => link.href);
    const statusLink = links.find((link) => /\/[^/]+\/status\/\d+/.test(link));
    const match = statusLink?.match(/https?:\/\/[^/]+\/([^/]+)\/status\/(\d+)/);
    const labels = Array.from(article.querySelectorAll<HTMLElement>("[aria-label]")).map((element) => element.getAttribute("aria-label") ?? "");
    const time = article.querySelector("time")?.getAttribute("datetime") ?? undefined;
    const text = (article.innerText ?? "").trim();
    return match && text ? { id: match[2], xHandle: match[1], url: statusLink, text, createdAt: time, labels, isReply: /^@[A-Za-z0-9_]{1,15}\b/.test(text) } : undefined;
  })) as Array<ScrapedTweet | undefined>;
  const tweets = rawTweets.filter((tweet): tweet is ScrapedTweet => Boolean(tweet));
  if (!tweets.length) {
    const bodyText = await page.locator("body").innerText().catch(() => "");
    if (/log in|sign up|something went wrong|try again/i.test(bodyText)) throw new Error("X session cookies are invalid, expired, or blocked; refresh auth_token and ct0");
  }
  const cutoff = Date.now() - recentDays * 86_400_000;
  return tweets.map((tweet) => normalizeScrapedTweet(tweet)).filter((post) => !post.createdAt || Date.parse(post.createdAt) >= cutoff);
}

async function scrapeWithCookies(handles: string[], authToken: string, ct0: string, recentDays: number, batchSize: number) {
  const browserPath = value("X_BROWSER_PATH");
  const browser: Browser = await chromium.launch({ headless: value("X_HEADLESS", "1") !== "0", executablePath: browserPath || undefined });
  const context = await browser.newContext({ locale: "en-US", viewport: { width: 1440, height: 1000 }, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36" });
  await context.addCookies([
    { name: "auth_token", value: authToken, domain: ".x.com", path: "/", httpOnly: true, secure: true },
    { name: "ct0", value: ct0, domain: ".x.com", path: "/", httpOnly: false, secure: true },
  ]);
  const page = await context.newPage();
  const posts: XPostEvidence[] = [];
  try {
    for (let index = 0; index < handles.length; index += batchSize) {
      const batch = handles.slice(index, index + batchSize);
      console.log(`Scraping ${batch.length} handles (${index + 1}-${index + batch.length}/${handles.length})`);
      posts.push(...await scrapeBatch(page, batch, recentDays));
    }
  } finally {
    await context.close();
    await browser.close();
  }
  return [...new Map(posts.map((post) => [post.id, post])).values()].sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
}

async function main() {
  await loadDotEnv(path.join(ROOT, ".env.local"));
  const publishUrl = value("PUBLISH_URL");
  const publishToken = value("PUBLISH_TOKEN");
  const authToken = value("X_AUTH_TOKEN", value("AUTH_TOKEN", value("auth_token")));
  const ct0 = value("X_CT0", value("CT0", value("ct0")));
  if (!publishUrl || !publishToken) throw new Error("PUBLISH_URL and PUBLISH_TOKEN are required in .env.local");
  if (!authToken || !ct0) throw new Error("X_AUTH_TOKEN and X_CT0 are required; these are your auth_token and ct0 X session cookies");
  const handles = await readHandles();
  const stateFile = path.resolve(ROOT, value("X_STATE_FILE", "./data/cursor.json"));
  const snapshotFile = path.resolve(ROOT, value("X_SNAPSHOT_FILE", "./data/x-feed-snapshot.json"));
  const cursor = await readCursor(stateFile);
  const { selected, nextCursor } = selectHandles(handles, cursor, numberValue("X_HANDLES_PER_RUN", 20, 1, handles.length));
  const recentDays = numberValue("X_RECENT_DAYS", 7, 1, 7);
  const batchSize = numberValue("X_BATCH_SIZE", 10, 1, 20);
  const posts = await scrapeWithCookies(selected, authToken, ct0, recentDays, batchSize);
  if (!posts.length && value("X_ALLOW_EMPTY_PUBLISH", "0") !== "1") {
    console.log("No posts returned; preserving the last Vercel snapshot and cursor.");
    return;
  }
  const profiles: Record<string, XProfile> = {};
  for (const handle of selected) {
    const profilePosts = posts.filter((post) => handleKey(post.xHandle) === handleKey(handle));
    profiles[handleKey(handle)] = { xHandle: handle, posts: profilePosts, summary: summarize(profilePosts) };
  }
  const snapshot: XFeedSnapshot = {
    status: "LIVE",
    source: "X web session · local Windows Task Scheduler worker",
    profiles,
    posts,
    fetchedAt: new Date().toISOString(),
    window: `${recentDays}d`,
    stale: false,
    note: `Rotated ${selected.length} of ${handles.length} tracked profiles.`,
  };
  await writeJson(snapshotFile, snapshot);
  if (value("X_DRY_RUN", "0") === "1") {
    await writeJson(stateFile, { cursor: nextCursor });
    console.log(`Dry run complete: ${posts.length} posts, cursor ${nextCursor}.`);
    return;
  }
  const response = await fetch(publishUrl, { method: "POST", headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${publishToken}`, "user-agent": "lp-screener-x-session-collector/1.0" }, body: JSON.stringify(snapshot) });
  const result = await response.json().catch(() => ({})) as JsonRecord;
  if (!response.ok) throw new Error(`Vercel publish failed (${response.status}): ${String(result.error ?? result.message ?? "unknown error")}`);
  await writeJson(stateFile, { cursor: nextCursor });
  console.log(`Published ${posts.length} posts for ${selected.length} handles; next cursor ${nextCursor}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
