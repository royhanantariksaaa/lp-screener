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

- `GET /api/market?kind=feed&q=SOL` proxies the public Dexscreener search feed. The client also merges the latest Solana token profiles through Dexscreener's public token endpoints so newly launched and ultra-microcap pools can enter the same screening universe.
- `GET /api/market?kind=chains` proxies DeFiLlama chain TVL context for the sidebar; it is informational and never changes pool eligibility.
- `GET /api/market?kind=ocula&ageBucket=all` proxies Ocula's public Solana discovery feed. The client joins Ocula token addresses to Dexscreener pair data, preserving Ocula's live 1h volume, holder count, change, buy/sell counts, and public social links as candidate context. Ocula discovery expands the universe, but it never bypasses the screener's safety, technical, wallet, or KOL gates.
- `GET /api/market?kind=ohlcv&pool=<solana-pool-address>` proxies GeckoTerminal 15-minute OHLCV data.
- `GET /api/market?kind=wallets&pool=<solana-pool-address>&base=<token-mint>&limit=6` reads recent pool transactions from the public Solana RPC and returns the number and direction of recent signer activity. This is on-chain recent-trader activity, not a profitability claim.
- `GET /api/market?kind=token&mint=<token-mint>` checks mint authority, freeze authority, and the top-ten holder concentration proxy through Solana RPC.
- `GET /api/market?kind=kol&symbol=<token-symbol>` reads the 24-hour LunarCrush topic summary and top creators. Set `LUNARCRUSH_API_KEY` as a Vercel server environment variable; it is only read by the serverless function and is never bundled into the client.

The client refreshes the market feed on load and every 60 seconds. It derives pool age from `pairCreatedAt`, then calculates Supertrend, Bollinger Bands (20, 2), RSI(2), history-high drawdown, candle freshness, and playbook states from the returned 15m candles. Candle enrichment is deliberately rate-limit aware: the highest-volume six pools are fetched with bounded concurrency and cached for five minutes.

The client calls token-safety checks for the highest-volume candidates, then enriches technical, wallet, and KOL evidence. The default workspace is `Eligible setups`: a pool must clear the microcap liquidity floor ($5K), activity floor ($2K 24h volume), age window (365 days), fresh bullish 15m state, live smart-wallet and KOL/attention evidence, and token-safety checks. `Open now` is reserved for an eligible pool with a fresh flip or reclaim trigger. Without `LUNARCRUSH_API_KEY`, KOL fields remain explicitly unavailable and the UI shows that provider requirement instead of fabricating mentions. These gates are screening evidence, not a profitability guarantee.

## Provider health and optional holder enrichment

`GET /api/market?kind=providers` returns readiness for the public sources and credential-gated adapters without exposing any secret values. The UI displays these states in the source panel.

When `BIRDEYE_API_KEY` is configured, token checks also request Birdeye's Solana holder-profile endpoint as enrichment. The Solana RPC safety gate remains authoritative; Birdeye holder behavior is evidence, not a bypass.

Ocula is a public discovery source and is shown as LIVE in provider health. Its public fields are holder/social context, not smart-wallet or KOL confirmation. Credential-gated context links (GMGN, Bubblemaps, Kaito, Cielo, Moby, Nansen, and Artemis) remain visibly marked as configured or key-required until their authenticated APIs are connected. They are never treated as live eligibility evidence by default.
