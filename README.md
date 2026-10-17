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

Each KOL detail also includes a manual X review record. The reviewer can save an X handle, evidence note, and status locally as `CONFIRMED`, `LIKELY`, or `NO_MATCH`; the app never infers a social identity from a similar name. The seeded review layer contains cautious `LIKELY` candidates with source trails in `src/data/twitter-review-seeds.json`. These are public-profile correlations for research and still require direct proof before a handle is marked `CONFIRMED`.

The same panel has a manual `ADD TOKEN THESIS MATCH` form. It stores a token/symbol, the public post or mirror used as evidence, and a short thesis note in `localStorage` under `lp-screener-twitter-reviews-v1`, so an X narrative can be reviewed next to the wallet-backed FOMO profile. Seed rows include thesis leads where a public post, mirror, or on-chain activity index exposes one. Indirect citations are deliberately labeled as leads and are not automated sentiment, trade recommendations, or proof that the linked wallet authored the post. Local reviews override the seeds and can be changed without modifying captured wallet data.

The persisted wallet snapshots are generated with `npm run scan:solana` and `npm run scan:evm` (the EVM command uses the Windows PowerShell runner to pass Blockscout's Cloudflare edge). Each scanner resumes from its state file and writes after every address. The current snapshot covers 269 Solana wallets and 139 indexed EVM tasks; BNB rows remain marked `KEY_REQUIRED`.

`npm run analyze:wallets` joins those snapshots into `api/wallet-graph.json` and the KOL Radar's related-wallet graph. It reports direct counterparties, repeated links, counterparties shared by multiple tracked wallets, same-address reuse across EVM chains, tracked-wallet matches, and candidate graph clusters. High-fanout addresses are separated as infrastructure-like so a router, token contract, or exchange hub is not presented as a person-controlled wallet. The graph is exposed through `/api/market?kind=wallet-graph` and remains research evidence rather than proof of common ownership.

The `brrrgrrrz`/`notanicecat69` grouping above represents two separate seed rows. After the ranked tranches below, the review seed file contains one hundred twenty-seven profile entries.

The next review tranche adds eight more cautious candidates (`koy`, `jotagezin`, `MoneyLord`, `OhMyJack`, `starcatcher444`, `RugDalio`, `artthatfucks`, and `SolSwizzle`). Their seed records preserve the public source trail and add a token thesis lead where a public X mirror or on-chain activity index exposes one. Indirect FOMO analytics are labeled as such and still need original-post review.

The following tranche adds four more (`motiyawerey`, `TheOnlyOMP`, `kv4rl`, and `inyourwalls`) with the same evidence and thesis fields. The review layer now contains twenty-two profile rows; rows without an account-owned X mirror remain `LIKELY` and explicitly say so.

The next ranked tranche adds four more (`pointfarmcap`, `NachSOL`, `RZDxbt`, and `CryptoCurb`). Each row carries a source trail and a thesis lead; the public evidence is still indirect where it does not include an account-owned wallet disclosure, so all four remain `LIKELY`.

The following tranche adds `BertLuvv`, `valueandtime`, `zakum`, and `cryptoalbus` from the next score band. Their rows preserve public thesis mirrors or wallet-backed token records and remain `LIKELY` until direct ownership evidence is available.

The next score-band tranche adds `zeri_term` (public mirror `zeri_terminal`), `TheDazzleNovak`, `Mazinotrenches`, and `lordarbiter`. Each row keeps the public handle, wallet/profile source trail, and a token thesis lead in the review panel; all remain `LIKELY` because the evidence does not prove account-owned wallet control. `tvmx` remains queued for review because no reliable public thesis trail was found in this pass.

The following tranche adds `igniteBTW`, `the_nutgod`, `opensecret`, and `m0f0`. Their source trails include public X mirrors, Provadata, FomoLens, Fomp, Foma, or FomoRadar as available. `tvmx` remains queued because its X account is suspended and no reliable public thesis record was found.

The next evidence pass adds `dtrainz`, `vvvvvvvvvv`, and `dylansdegens`. `dtrainz` has no live X profile and is kept as a cautious mapping; the other two have public thesis records and wallet/profile corroboration. `brokeSzn` remains queued because its current public sources expose no reliable token thesis.

The following pass adds `LP1111`, `Pyro` (public X mirror `PyroNFT`), and `BTCdayu`. Their rows preserve FomoLens or public X thesis calls alongside the wallet/profile source trail; `brokeSzn` remains queued pending a usable token thesis record.

The next evidence pass adds the highest-ranked profiles with current thesis records: `tvmx`, `000000` (public call mirror `lesabrefomo`), `Chubbi230`, `DONBAGS` (X canonical handle `Donbags`), and `pianches`. Their rows preserve the FomoLens call text, token context, wallet/profile sources, and explicit caveats; `0xBEC001`, `SweetPriorCod`, `exitliqexe`, `GL_AW_AT_PARAGON`, and `xbtDLN` remain queued until a usable token thesis trail is available. `tvmx` is marked cautiously because its X account is currently suspended.

The following tranche adds `Kale_Abe`, `CryptoTalkMan`, `SpicyPeruvian_`, `TMtheOG`, and `bamblewood8`. Their rows capture the next score-band FomoLens theses and public X identities, including direct TMtheOG post links where available; all remain `LIKELY` because wallet ownership and social authorship are separate evidence layers. `brokeSzn`, `0xBEC001`, `SweetPriorCod`, `exitliqexe`, `GL_AW_AT_PARAGON`, and `xbtDLN` remain queued without a usable token thesis record.

The next score-band pass adds `0xscripting`, `BTCwolf`, and `justdeeds26`. Their rows preserve the FomoLens token calls, public X handles, wallet/profile sources, and cautious attribution notes; all remain `LIKELY` pending stronger account-owned wallet evidence.

The following pass adds `heat`, `CrudeStillGuan`, and `earn168`. Their rows capture the next available FomoLens calls and X/source trails; indirect quoted-post evidence is labeled explicitly where it applies.

The next score-band pass adds `0xAvast`, `aki11a`, `bluntz_capital`, `ether_monk`, `The__Solstice`, and `ThePumponomics`. Their rows preserve public X identities, FomoLens token calls, and resolver or verified wallet context, with indirect call attribution labeled where needed.

The following pass adds `moonshyne` and `excesscapital`. Both have current FomoLens thesis records and X/source trails; `excesscapital` is explicitly marked weak because its public X account is sparse and the call quotes another account.

The next score-band pass adds `Bull_Path`, `cryptochi3f_`, and `boosteryting`. Their rows preserve resolver-backed wallet context, public X handles, FomoLens thesis records, and direct post links where available.

The following pass adds `Tekkerrss` and `Samisa_btc`, preserving their resolver-backed wallet context, public X profiles, and multi-token FomoLens thesis trails.

The next pass adds `attnmarkets` and `yeon__`, preserving their public X identities, resolver-backed source trails, and token thesis context with quoted external references labeled as indirect.

The latest evidence refresh adds the score-91 `0xesprezzo` profile after FomoLens exposed a current HOOKR thesis; its X, Provadata, and FOMO profile trail is retained as a `LIKELY` mapping.

The next pass adds `Pasterniq` and `Zapoleon`, preserving their FomoLens token calls, X handles, and resolver or verified wallet source trails.

The following pass adds `jelitics`, `PoorGoat_`, and `soby0x`, preserving their public X identities, FomoLens thesis calls, and resolver or provider source trails.

The next pass adds `sadcrissy` and `0xsneakky`, preserving their live X profiles, resolver-backed source trails, and cautious indirect thesis notes.

The latest pass adds `RareDualJay` with an explicitly weak identity caveat because its X profile has minimal public detail; its ORBIO call and resolver source trail remain preserved for review.

The next evidence pass adds `AwareFinePrawn`, `prometheusx91`, `bystevenr`, and `ResellCalendar`, preserving their public trading identities, FomoLens thesis records, and resolver-backed source trails.

The following pass adds `Bayc364`, `Altcoinist`, and `mrfernando88`, preserving their public crypto identities, token calls, and resolver or verified wallet context.

The next pass adds `montyMole44`, `eyezenhour`, and `wenaltseason`, preserving their public trading identities, FomoLens calls, and resolver-backed source trails. The follow-up adds `bigbabba`, `looc`, and `NotARandomUser`, each with same-handle X evidence, readable FomoLens theses, and explicit likely-mapping caveats. The current tranche adds `niyedie`, `chosen_1`, and `ImBrentJames`; the last has a verified Provadata wallet while all three retain separate social-authorship caveats. The next tranche adds `Washedupke3d`, `spartee`, and `Hifive_07` with same-handle X pages, resolver-backed FOMO records, and token-specific call evidence. The latest tranche adds `Rowdy`, `jxnwa`, and `nova6`, preserving their current calls and explicit display-name caveats. This pass adds `picametalica`, `facap`, and `plottwisst`, retaining indirect-post and sparse-bio caveats where applicable. The current tranche adds `drews888`, `GuavaGuy2001`, and `kenobi_wif` with readable token calls and sparse-bio caveats. The latest tranche adds `rarety`, `rook63`, and `Carver_`, retaining display-name caveats while preserving their current call evidence. This tranche adds `397397`, `VexRex23`, and `DonnyDicey`; the last includes a direct X thesis link from FomoLens. The latest pass adds `clickl3ss`, `naP0Liano`, and `Guden`, preserving their current calls and normalized-handle caveats. The current pass adds `Grovyle`, `GerardGamba`, and `Izakalon`; the last sanitizes offensive source wording while retaining token references and provenance. This tranche adds `teepanddestroy`, `davidonchainx`, and `DineroDom0` with crypto-native X bios and current token calls.

## Production

`main` deploys to GitHub Pages through `.github/workflows/deploy-pages.yml`.
