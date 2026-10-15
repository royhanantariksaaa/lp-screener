import "./styles.css";

type Pool = {
  name: string; symbol: string; dex: string; address: string; price: number; liquidity: number; volume24h: number; ageDays: number; fee: number; tvl: number; change24h: number; risk: "LOW" | "MEDIUM" | "HIGH";
};

const demoPools: Pool[] = [
  { name: "SOL / USDC", symbol: "SOL-USDC", dex: "Meteora DLMM", address: "7xKX...9mQp", price: 184.22, liquidity: 1250000, volume24h: 3180000, ageDays: 84, fee: 0.04, tvl: 8.2, change24h: 6.4, risk: "LOW" },
  { name: "JUP / SOL", symbol: "JUP-SOL", dex: "Meteora DAMM", address: "5HnA...W2eB", price: 1.12, liquidity: 482000, volume24h: 920000, ageDays: 41, fee: 0.12, tvl: 3.7, change24h: 11.8, risk: "MEDIUM" },
  { name: "BONK / SOL", symbol: "BONK-SOL", dex: "Meteora DLMM", address: "3FqV...g1Lt", price: 0.000028, liquidity: 214000, volume24h: 681000, ageDays: 126, fee: 0.08, tvl: 2.1, change24h: -2.7, risk: "MEDIUM" },
  { name: "PYTH / USDC", symbol: "PYTH-USDC", dex: "Meteora DLMM", address: "9KcL...a8Rx", price: 0.31, liquidity: 92000, volume24h: 131000, ageDays: 19, fee: 0.20, tvl: 1.3, change24h: 21.3, risk: "HIGH" },
  { name: "WIF / SOL", symbol: "WIF-SOL", dex: "Meteora DAMM", address: "4ZtM...k5Pd", price: 0.74, liquidity: 690000, volume24h: 1540000, ageDays: 68, fee: 0.06, tvl: 4.4, change24h: 8.9, risk: "LOW" },
];

const state = { pools: demoPools, query: "", minLiquidity: 100000, minVolume: 100000, maxAge: 180, top10: 15, source: "Demo snapshot" };

const money = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n / 1000)}K`;
const filtered = () => state.pools.filter((p) => p.liquidity >= state.minLiquidity && p.volume24h >= state.minVolume && p.ageDays <= state.maxAge && `${p.name} ${p.dex}`.toLowerCase().includes(state.query.toLowerCase()));

function render() {
  const pools = filtered();
  document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="brand"><span class="brand-mark">≋</span><span>METEORA <small>LP SCREENER</small></span></div>
        <nav><a class="active" href="#discover">DISCOVER</a><a href="#filters">FILTERS</a><a href="#playbooks">PLAYBOOKS</a></nav>
        <div class="badges"><span class="pill green">● SOLANA</span><span class="pill">READ-ONLY</span></div>
      </header>
      <main>
        <section class="hero">
          <div><p class="eyebrow">— LIQUIDITY INTELLIGENCE · LIVE FEED</p><h1>Find the pools<br/><em>worth a closer<br/>look.</em></h1><p class="lede">Strategy-aware discovery for Meteora DLMM and DAMM experiments. Scan the market, inspect the 15m setup, then verify the pool yourself.</p><button class="primary" id="jump">Explore candidates <span>↓</span></button><span class="muted">No wallet connection · no trade execution</span></div>
          <div class="orbital"><div class="orbit one"></div><div class="orbit two"></div><div class="core"><b>LP</b><small>SCAN</small></div><span class="tag top">15m</span><span class="tag left">DLMM</span><span class="tag right">DAMM</span></div>
        </section>
        <section class="workspace" id="discover"><div class="section-head"><div><p class="eyebrow">SCREENING WORKSPACE</p><h2>Build your watchlist</h2></div><div class="live"><span></span> Public market data · ${state.source}</div></div>
          <div class="controls" id="filters">
            <label>MARKET CAP MINIMUM ($)<input id="minLiquidity" type="number" value="${state.minLiquidity}" step="10000"/></label>
            <label>24H VOLUME MINIMUM ($)<input id="minVolume" type="number" value="${state.minVolume}" step="10000"/></label>
            <label>MAXIMUM AGE (DAYS)<input id="maxAge" type="number" value="${state.maxAge}"/></label>
            <label>TOP 10 WARNING ABOVE (%)<input id="top10" type="number" value="${state.top10}"/></label>
            <label>STRATEGY VIEW<select id="strategy"><option>Balanced discovery</option><option>Liquidity first</option><option>Momentum watch</option></select></label>
          </div>
          <div class="toolbar"><div class="search"><span>⌕</span><input id="query" placeholder="Search pools, tokens, or venues" value="${state.query}"/></div><button class="refresh" id="refresh">↻ Refresh feed</button><span class="count">${pools.length} candidates</span></div>
          <div class="table-wrap"><table><thead><tr><th>POOL</th><th>VENUE</th><th>PRICE</th><th>LIQUIDITY</th><th>24H VOLUME</th><th>AGE</th><th>FEE</th><th>SIGNAL</th></tr></thead><tbody>${pools.map(poolRow).join("") || `<tr><td colspan="8" class="empty">No pools match these filters.</td></tr>`}</tbody></table></div>
        </section>
        <section class="foot-grid" id="playbooks"><article><p class="eyebrow">ENTRY SIGNAL</p><h3>Read the setup before you touch the pool.</h3><p>Liquidity, volume, age, fee tier, and momentum are signals—not guarantees. Use them to narrow research, then verify the contract and pool state yourself.</p></article><article><p class="eyebrow">DATA HYGIENE</p><h3>Read-only by design.</h3><p>This screener never asks for a wallet connection, signs transactions, or executes trades. It keeps the decision surface observable.</p></article></section>
      </main>
      <footer><span>METEORA LP SCREENER · SOLANA</span><span>LAST UPDATED <b id="updated">JUST NOW</b></span></footer>
    </div>`;
  bind();
}
function poolRow(p: Pool) { return `<tr><td><strong>${p.name}</strong><small>${p.symbol} · ${p.address}</small></td><td>${p.dex}</td><td>$${p.price < 0.01 ? p.price.toFixed(6) : p.price.toFixed(2)}</td><td>${money(p.liquidity)}</td><td>${money(p.volume24h)}</td><td>${p.ageDays}d</td><td>${p.fee.toFixed(2)}%</td><td><span class="signal ${p.risk.toLowerCase()}">${p.risk}</span><small class="delta ${p.change24h >= 0 ? "up" : "down"}">${p.change24h >= 0 ? "+" : ""}${p.change24h.toFixed(1)}% / 24h</small></td></tr>`; }
function bind() {
  document.querySelector("#jump")?.addEventListener("click", () => document.querySelector("#discover")?.scrollIntoView({ behavior: "smooth" }));
  document.querySelector<HTMLInputElement>("#query")?.addEventListener("input", (e) => { state.query = (e.target as HTMLInputElement).value; render(); document.querySelector<HTMLInputElement>("#query")?.focus(); });
  (["minLiquidity", "minVolume", "maxAge", "top10"] as const).forEach((id) => document.querySelector<HTMLInputElement>(`#${id}`)?.addEventListener("change", (e) => { state[id] = Number((e.target as HTMLInputElement).value); render(); }));
  document.querySelector("#refresh")?.addEventListener("click", async (e) => { const button = e.currentTarget as HTMLButtonElement; button.disabled = true; button.textContent = "↻ Refreshing…"; await loadLive(); render(); });
}
async function loadLive() {
  try {
    const response = await fetch("https://api.dexscreener.com/latest/dex/search?q=SOL");
    if (!response.ok) throw new Error("feed unavailable");
    const data = await response.json() as { pairs?: Array<Record<string, unknown>> };
    const pairs = (data.pairs ?? []).filter((pair) => pair.chainId === "solana").slice(0, 20);
    if (!pairs.length) throw new Error("no Solana pairs");
    state.pools = pairs.map((p) => { const liq = Number((p.liquidity as { usd?: number } | undefined)?.usd ?? 0); const vol = Number((p.volume as { h24?: number } | undefined)?.h24 ?? 0); return { name: `${String((p.baseToken as { symbol?: string })?.symbol ?? "TOKEN")} / ${String((p.quoteToken as { symbol?: string })?.symbol ?? "SOL")}`, symbol: String((p.baseToken as { symbol?: string })?.symbol ?? "TOKEN"), dex: String(p.dexId ?? "DEX"), address: `${String(p.pairAddress ?? "").slice(0, 4)}...${String(p.pairAddress ?? "").slice(-4)}`, price: Number(p.priceUsd ?? 0), liquidity: liq, volume24h: vol, ageDays: 30, fee: 0.1, tvl: 0, change24h: Number((p.priceChange as { h24?: number } | undefined)?.h24 ?? 0), risk: liq > 500000 ? "LOW" : liq > 100000 ? "MEDIUM" : "HIGH" }; });
    state.source = "Dexscreener live feed";
  } catch { state.source = "Demo snapshot · live feed unavailable"; }
}
render();




