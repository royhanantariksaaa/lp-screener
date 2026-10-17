import { put } from "@vercel/blob";

const publishToken = () => String(process.env.X_FEED_PUBLISH_TOKEN ?? "").trim();
const readBody = async (req) => {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};
const authorized = (req) => {
  const expected = publishToken();
  if (!expected) return false;
  const header = String(req.headers?.authorization ?? "");
  return header === `Bearer ${expected}`;
};
const reply = (res, status, payload) => {
  res.status(status).setHeader("Cache-Control", "no-store").json(payload);
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return reply(res, 405, { error: "method_not_allowed" });
  if (!authorized(req)) return reply(res, 401, { error: "unauthorized" });
  if (!String(process.env.BLOB_READ_WRITE_TOKEN ?? "").trim()) return reply(res, 503, { error: "blob_not_configured" });
  try {
    const payload = await readBody(req);
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.posts) || typeof payload.profiles !== "object") return reply(res, 400, { error: "invalid_x_feed_snapshot" });
    const body = JSON.stringify({ ...payload, status: "LIVE", source: String(payload.source ?? "Authorized X snapshot worker"), fetchedAt: String(payload.fetchedAt ?? new Date().toISOString()) });
    if (Buffer.byteLength(body, "utf8") > 4 * 1024 * 1024) return reply(res, 413, { error: "snapshot_too_large" });
    const blob = await put("x-feed/snapshot.json", body, { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 0 });
    return reply(res, 200, { status: "LIVE", source: "Vercel Blob · private X feed snapshot", pathname: blob.pathname, updatedAt: new Date().toISOString() });
  } catch (error) {
    return reply(res, 400, { error: error instanceof Error ? error.message : "invalid_snapshot" });
  }
}
