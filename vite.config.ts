import { defineConfig, type Plugin } from "vite";

const localMarketProxy = (): Plugin => ({
  name: "local-market-proxy",
  configureServer(server) {
    server.middlewares.use("/api/market", async (request, response, next) => {
      try {
        const query = new URL(request.url ?? "/", "http://localhost").searchParams;
        const kind = query.get("kind") ?? "feed";
        const upstream = kind === "ohlcv"
          ? `https://api.geckoterminal.com/api/v2/networks/solana/pools/${encodeURIComponent(query.get("pool") ?? "")}/ohlcv/minute?aggregate=15&limit=100`
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

