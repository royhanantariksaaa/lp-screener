import { get } from "@vercel/blob";

const snapshotToken = () => String(process.env.X_FEED_SNAPSHOT_TOKEN ?? process.env.X_FEED_PUBLISH_TOKEN ?? "").trim();
const authorized = (req) => {
  const expected = snapshotToken();
  if (!expected) return false;
  return String(req.headers?.authorization ?? "") === `Bearer ${expected}`;
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  if (!authorized(req)) return res.status(401).json({ error: "unauthorized" });
  if (!String(process.env.BLOB_READ_WRITE_TOKEN ?? "").trim()) return res.status(503).json({ error: "blob_not_configured" });
  try {
    const blob = await get("x-feed/snapshot.json", { access: "private" });
    if (!blob) return res.status(404).json({ error: "snapshot_not_found" });
    const payload = JSON.parse(await new Response(blob.stream).text());
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : "snapshot_unavailable" });
  }
}
