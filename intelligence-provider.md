# Intelligence provider contract

The screener accepts an optional `VITE_INTELLIGENCE_API_URL` build-time variable. When configured, it requests:

`GET <endpoint>?symbols=SOL-USDC,JUP-SOL,...`

The response shape is:

```json
{
  "pools": [
    {
      "symbol": "SOL-USDC",
      "smartWallets": 12,
      "walletFlow": "INFLOW",
      "kolMentions": 6,
      "kolRecency": "18m",
      "screenScore": 89
    }
  ]
}
```

`walletFlow` is one of `INFLOW`, `OUTFLOW`, `MIXED`, or `UNAVAILABLE`. The UI marks provider-backed rows as live and leaves the wallet/KOL fields explicitly unavailable when the variable is absent or the provider fails.

## Live market and 15m signals

The public Vercel deployment uses the `/api/market` serverless function to avoid browser CORS and rate-limit issues:

- `GET /api/market?kind=feed&q=SOL` proxies the public Dexscreener search feed.
- `GET /api/market?kind=ohlcv&pool=<solana-pool-address>` proxies GeckoTerminal 15-minute OHLCV data.

The client refreshes the market feed on load and every 60 seconds. It derives pool age from `pairCreatedAt`, then calculates Supertrend, Bollinger Bands (20, 2), RSI(2), history-high drawdown, candle freshness, and playbook states from the returned 15m candles. Candle enrichment is deliberately rate-limit aware: the highest-volume six pools are fetched serially and cached for five minutes.

Smart-wallet and KOL evidence remains provider-backed. Live market data is never relabeled as wallet or KOL intelligence when `VITE_INTELLIGENCE_API_URL` is absent.

