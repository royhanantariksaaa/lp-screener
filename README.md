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

Each KOL detail also includes a manual X review record. The reviewer can save an X handle, evidence note, and status locally as `CONFIRMED`, `LIKELY`, or `NO_MATCH`; the app never infers a social identity from a similar name. The seeded review layer now covers nine cautious `LIKELY` candidates (`0xdetweiler`, `unipcs`, `ogle`, `DumbCrayonEater`, `Aurelius0121`, `Salem1299534`, `Natan_benish`, `AvgJoesCrypto`, and `brrrgrrrz`/`notanicecat69`) with source trails in `src/data/twitter-review-seeds.json`. These are public-profile correlations for research and still require direct proof before a handle is marked `CONFIRMED`.

The same panel has a manual `ADD TOKEN THESIS MATCH` form. It stores a token/symbol, the public post or mirror used as evidence, and a short thesis note in `localStorage` under `lp-screener-twitter-reviews-v1`, so an X narrative can be reviewed next to the wallet-backed FOMO profile. Four seed thesis leads are included for follow-up (Ogle/PONS, Natan_benish/LONG, AvgJoesCrypto/PONS, and brrrgrrrz/AI-LONG). Indirect citations are deliberately labeled as leads and are not automated sentiment, trade recommendations, or proof that the linked wallet authored the post. Local reviews override the seeds and can be changed without modifying captured wallet data.

The persisted wallet snapshots are generated with `npm run scan:solana` and `npm run scan:evm` (the EVM command uses the Windows PowerShell runner to pass Blockscout's Cloudflare edge). Each scanner resumes from its state file and writes after every address. The current snapshot covers 269 Solana wallets and 139 indexed EVM tasks; BNB rows remain marked `KEY_REQUIRED`.

`npm run analyze:wallets` joins those snapshots into `api/wallet-graph.json` and the KOL Radar's related-wallet graph. It reports direct counterparties, repeated links, counterparties shared by multiple tracked wallets, same-address reuse across EVM chains, tracked-wallet matches, and candidate graph clusters. High-fanout addresses are separated as infrastructure-like so a router, token contract, or exchange hub is not presented as a person-controlled wallet. The graph is exposed through `/api/market?kind=wallet-graph` and remains research evidence rather than proof of common ownership.

The `brrrgrrrz`/`notanicecat69` grouping above represents two separate seed rows, so the review seed file contains ten profile entries.

The next review tranche adds eight more cautious candidates (`koy`, `jotagezin`, `MoneyLord`, `OhMyJack`, `starcatcher444`, `RugDalio`, `artthatfucks`, and `SolSwizzle`). Their seed records preserve the public source trail and add a token thesis lead where a public X mirror or on-chain activity index exposes one. Indirect FOMO analytics are labeled as such and still need original-post review.

The following tranche adds four more (`motiyawerey`, `TheOnlyOMP`, `kv4rl`, and `inyourwalls`) with the same evidence and thesis fields. The review layer now contains twenty-two profile rows; rows without an account-owned X mirror remain `LIKELY` and explicitly say so.

The next ranked tranche adds four more (`pointfarmcap`, `NachSOL`, `RZDxbt`, and `CryptoCurb`). Each row carries a source trail and a thesis lead; the public evidence is still indirect where it does not include an account-owned wallet disclosure, so all four remain `LIKELY`.

## Production

`main` deploys to GitHub Pages through `.github/workflows/deploy-pages.yml`.
