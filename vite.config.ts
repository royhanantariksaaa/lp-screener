import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

const localMarketProxy = (): Plugin => ({
  name: "local-market-proxy",
  configureServer(server) {
    server.middlewares.use("/api/market", async (request, response, next) => {
      try {
        const query = new URL(request.url ?? "/", "http://localhost").searchParams;
        const kind = query.get("kind") ?? "feed";
        if (kind === "wallet-graph") {
          const graph = JSON.parse(readFileSync(path.resolve(process.cwd(), "api", "wallet-graph.json"), "utf8"));
          const handle = (query.get("handle") ?? "").trim().toLowerCase();
          const address = (query.get("address") ?? "").trim().toLowerCase();
          const profile = handle || address
            ? graph.profiles.find((item: { handle?: string; wallets?: Array<{ address?: string; chain?: string }> }) => handle
              ? String(item.handle ?? "").toLowerCase() === handle
              : (item.wallets ?? []).some((wallet) => String(wallet.address ?? "").toLowerCase() === address))
            : undefined;
          const payload = handle || address
            ? { status: profile ? "LIVE" : "UNAVAILABLE", source: "Persisted wallet graph · PublicNode + Blockscout", capturedAt: graph.capturedAt, methodology: graph.methodology, summary: graph.summary, profile }
            : { status: "LIVE", source: "Persisted wallet graph · PublicNode + Blockscout", capturedAt: graph.capturedAt, methodology: graph.methodology, summary: graph.summary, clusters: (graph.clusters ?? []).slice(0, 12).map((cluster: { topLinks?: unknown[] }) => ({ ...cluster, topLinks: (cluster.topLinks ?? []).slice(0, 6) })) };
          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify(payload));
          return;
        }
        if (kind === "xfeed") {
          const snapshotPath = process.env.X_FEED_SNAPSHOT_FILE?.trim();
          if (snapshotPath) {
            try {
              const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
              response.statusCode = 200;
              response.setHeader("Content-Type", "application/json; charset=utf-8");
              response.end(JSON.stringify(snapshot));
              return;
            } catch {
              // Fall through to the explicit key-required state below.
            }
          }
          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ status: "KEY_REQUIRED", source: "X API v2 · bearer token required", profiles: {}, posts: [], fetchedAt: new Date().toISOString(), note: "Set X_BEARER_TOKEN or X_FEED_SNAPSHOT_FILE on the local server to fetch recent public posts and replies." }));
          return;
        }
        const upstream = kind === "ohlcv"
          ? `https://api.geckoterminal.com/api/v2/networks/solana/pools/${encodeURIComponent(query.get("pool") ?? "")}/ohlcv/minute?aggregate=15&limit=100`
          : kind === "scan"
            ? `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(query.get("token") ?? "")}`
            : `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query.get("q") ?? "SOL")}`;
        const result = await fetch(upstream, { headers: { accept: "application/json" } });
        response.statusCode = result.status;
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.end(await result.text());
      } catch {
        next();
      }
    });
  },
});

export default defineConfig({
  // Relative asset URLs work on both the GitHub Pages project path and Vercel root.
  base: "./",
  plugins: [localMarketProxy()],
});

