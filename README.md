# Solana LP Screener

A lightweight Vite + vanilla TypeScript interface for read-only Solana LP discovery.

## Development

```bash
npm install
npm run dev
```

The refresh control attempts to load Solana pairs from Dexscreener and falls back to a deterministic demo snapshot when the public feed is unavailable. The UI never requests a wallet connection or executes trades.

## Production

`main` deploys to GitHub Pages through `.github/workflows/deploy-pages.yml`.
