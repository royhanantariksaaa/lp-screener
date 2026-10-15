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
- `GET /api/market?kind=wallets&pool=<solana-pool-address>&base=<token-mint>&limit=6` reads recent pool transactions from the public Solana RPC and returns the number and direction of recent signer activity. This is on-chain recent-trader activity, not a profitability claim.
- `GET /api/market?kind=kol&symbol=<token-symbol>` reads the 24-hour LunarCrush topic summary and top creators. Set `LUNARCRUSH_API_KEY` as a Vercel server environment variable; it is only read by the serverless function and is never bundled into the client.

The client refreshes the market feed on load and every 60 seconds. It derives pool age from `pairCreatedAt`, then calculates Supertrend, Bollinger Bands (20, 2), RSI(2), history-high drawdown, candle freshness, and playbook states from the returned 15m candles. Candle enrichment is deliberately rate-limit aware: the highest-volume six pools are fetched serially and cached for five minutes.

The client calls the wallet route for the highest-volume live pools and the LunarCrush route for the highest-volume token topics. Without `LUNARCRUSH_API_KEY`, KOL fields remain explicitly unavailable and the UI shows that provider requirement instead of fabricating mentions. Live market data is never relabeled as wallet or KOL intelligence.

