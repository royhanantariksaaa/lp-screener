# Solana LP Screener

A lightweight Vite + vanilla TypeScript interface for read-only Solana LP discovery.

## Development

```bash
npm install
npm run dev
```

The refresh control attempts to load Solana pairs from Dexscreener and falls back to a deterministic demo snapshot when the public feed is unavailable. The UI never requests a wallet connection or executes trades.

### 15m candles

The `/api/market?kind=ohlcv` route uses DexPaprika for pool-specific 15-minute OHLCV when the server has a `DEXPAPRIKA_API_KEY`. Keep the key server-side (for example, as a Vercel environment variable); it is never bundled into the browser. GeckoTerminal remains an automatic fallback when the primary request is unavailable. DexPaprika's free key supports 15-minute pool candles, while its Dev/Pro plans provide higher request limits for large chart batches.

The KOL Radar wallet detail view can run an on-demand Solana related-wallet scan through `/api/market?kind=wallet-cluster&chain=solana&address=...`. It reads recent finalized signatures, co-signers, and SPL token-account owners from the configured RPCs. Results are candidate relationships for research and are never presented as proof of common ownership. EVM and Robinhood history requires indexed transfer logs or trace data; same-address reuse across the captured chain labels remains separate evidence.

## Production

`main` deploys to GitHub Pages through `.github/workflows/deploy-pages.yml`.
