import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const kolPath = path.join(root, "src", "data", "kol-wallets.json");
const solanaPath = path.join(root, "api", "solana-wallet-clusters.json");
const evmPath = path.join(root, "api", "evm-wallet-clusters.json");
const outputPath = path.join(root, "api", "wallet-graph.json");

const readJson = async (file) => JSON.parse(await fs.readFile(file, "utf8"));
const isSolanaAddress = (value) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(value ?? ""));
const isEvmAddress = (value) => /^0x[0-9a-fA-F]{40}$/.test(String(value ?? ""));
const normalize = (value) => String(value ?? "").trim().toLowerCase();
const edgeKey = (chain, address) => `${chain}:${normalize(address)}`;
const unique = (values) => [...new Set(values.filter(Boolean))];
const sortByScore = (a, b) => b.repeatedHits - a.repeatedHits || b.hits - a.hits || (b.sourceCount ?? b.sourceKeys?.length ?? 0) - (a.sourceCount ?? a.sourceKeys?.length ?? 0) || a.address.localeCompare(b.address);

function collectTracked(dataset) {
  const wallets = [];
  const byChainAddress = new Map();
  const byEvmAddress = new Map();
  for (const profile of dataset.records ?? []) {
    for (const wallet of profile.wallets ?? []) {
      const chains = unique(wallet.chains ?? []);
      const row = {
        profile: { handle: profile.handle, name: profile.name, confidence: wallet.confidence },
        address: String(wallet.address ?? "").trim(),
        addressKey: normalize(wallet.address),
        chains,
      };
      if (!row.addressKey) continue;
      wallets.push(row);
      for (const chain of chains) {
        const key = edgeKey(chain, row.address);
        const rows = byChainAddress.get(key) ?? [];
        rows.push(row);
        byChainAddress.set(key, rows);
      }
      if (isEvmAddress(row.address)) {
        const rows = byEvmAddress.get(row.addressKey) ?? [];
        rows.push(row);
        byEvmAddress.set(row.addressKey, rows);
      }
    }
  }
  return { wallets, byChainAddress, byEvmAddress };
}

function sourceRows(solana, evm) {
  const rows = [];
  for (const record of solana.records ?? []) {
    rows.push({
      key: edgeKey("solana", record.address),
      chain: "solana",
      address: record.address,
      profiles: record.profiles ?? [],
      status: record.status,
      source: record.source,
      scannedTransactions: record.scannedTransactions ?? 0,
      scannedTransfers: 0,
      relatedWallets: Array.isArray(record.relatedWallets) ? record.relatedWallets : [],
      scannedAt: record.scannedAt,
    });
  }
  for (const record of evm.records ?? []) {
    rows.push({
      key: edgeKey(record.chain, record.address),
      chain: record.chain,
      address: record.address,
      profiles: record.profiles ?? [],
      status: record.status,
      source: record.source,
      scannedTransactions: record.scannedTransactions ?? 0,
      scannedTransfers: record.scannedTransfers ?? 0,
      relatedWallets: Array.isArray(record.relatedWallets) ? record.relatedWallets : [],
      scannedAt: record.scannedAt,
    });
  }
  return rows;
}

function cleanTarget(chain, address) {
  const value = String(address ?? "").trim();
  if (chain === "solana") return isSolanaAddress(value) ? value : "";
  if (!isEvmAddress(value) || /^0x0{40}$/i.test(value)) return "";
  return value;
}

function buildEdges(sources, tracked) {
  const raw = [];
  for (const source of sources) {
    const grouped = new Map();
    for (const link of source.relatedWallets) {
      const address = cleanTarget(source.chain, link.address);
      if (!address) continue;
      const key = edgeKey(source.chain, address);
      const row = grouped.get(key) ?? {
        chain: source.chain,
        address,
        addressKey: normalize(address),
        hits: 0,
        signatures: 0,
        repeatedHits: 0,
        evidence: new Set(),
        directions: new Set(),
        tokens: new Set(),
        sourceKeys: new Set(),
        sourceProfiles: new Map(),
        lastSeen: undefined,
        confidence: "SINGLE",
      };
      row.hits += Number(link.hits ?? 0);
      row.signatures += Number(link.signatures ?? 0);
      if (link.confidence === "REPEATED") row.repeatedHits += Number(link.hits ?? 0);
      for (const evidence of link.evidence ?? []) row.evidence.add(evidence);
      for (const direction of link.directions ?? []) row.directions.add(direction);
      for (const token of link.tokens ?? []) row.tokens.add(token);
      if (Array.isArray(link.mints)) for (const mint of link.mints) row.tokens.add(String(mint));
      else if (Number(link.mints) > 0) row.tokens.add(`${link.mints} token mint${Number(link.mints) === 1 ? "" : "s"}`);
      row.sourceKeys.add(source.key);
      for (const profile of source.profiles) row.sourceProfiles.set(profile.handle, profile);
      if (String(link.lastSeen ?? "") > String(row.lastSeen ?? "")) row.lastSeen = link.lastSeen;
      if (link.confidence === "REPEATED" || (link.confidence === "OBSERVED" && row.confidence === "SINGLE")) row.confidence = link.confidence;
      grouped.set(key, row);
    }
    for (const row of grouped.values()) raw.push(row);
  }

  const byTarget = new Map();
  for (const row of raw) {
    const rows = byTarget.get(`${row.chain}:${row.addressKey}`) ?? [];
    rows.push(row);
    byTarget.set(`${row.chain}:${row.addressKey}`, rows);
  }
  const evmTargets = new Map();
  for (const row of raw) {
    if (row.chain === "solana") continue;
    const rows = evmTargets.get(row.addressKey) ?? [];
    rows.push(row);
    evmTargets.set(row.addressKey, rows);
  }

  const trackedSourceKeys = new Set(sources.map((source) => source.key));
  return raw.map((row) => {
    const sameTargetRows = byTarget.get(`${row.chain}:${row.addressKey}`) ?? [];
    const sourceKeys = unique(sameTargetRows.flatMap((item) => [...item.sourceKeys]));
    const sourceProfiles = unique(sameTargetRows.flatMap((item) => [...item.sourceProfiles.keys()]));
    const trackedMatches = (tracked.byChainAddress.get(edgeKey(row.chain, row.address)) ?? []).filter((item) => !sourceKeys.some((key) => key === edgeKey(row.chain, item.address)));
    const sameAddressChains = row.chain === "solana" ? [] : unique((evmTargets.get(row.addressKey) ?? []).map((item) => item.chain));
    const highFanout = sourceKeys.length > 20;
    const classification = trackedMatches.length
      ? "tracked-wallet-match"
      : highFanout
        ? "high-fanout-infrastructure"
        : sourceKeys.length > 1
          ? "shared-counterparty"
          : sameAddressChains.length > 1
            ? "cross-chain-counterparty"
            : "direct-counterparty";
    const evidence = [...row.evidence];
    if (sourceKeys.length > 1) evidence.push(`seen from ${sourceKeys.length} tracked wallets`);
    if (sameAddressChains.length > 1) evidence.push(`same address on ${sameAddressChains.join(", ")}`);
    if (trackedMatches.length) evidence.push(`matches ${trackedMatches.length} tracked wallet${trackedMatches.length === 1 ? "" : "s"}`);
    return {
      chain: row.chain,
      address: row.address,
      hits: row.hits,
      signatures: row.signatures,
      repeatedHits: row.repeatedHits,
      evidence: unique(evidence),
      directions: [...row.directions],
      tokens: [...row.tokens].slice(0, 8),
      confidence: row.confidence,
      lastSeen: row.lastSeen,
      sourceCount: sourceKeys.length,
      sourceKeys,
      sourceProfiles,
      trackedMatches: trackedMatches.map((item) => ({ handle: item.profile.handle, name: item.profile.name, confidence: item.profile.confidence, address: item.address, chains: item.chains })),
      sameAddressChains,
      classification,
    };
  });
}

function buildClusters(edges, sources) {
  const sourceKeys = sources.map((source) => source.key);
  const parent = new Map(sourceKeys.map((key) => [key, key]));
  const find = (key) => {
    let current = key;
    while (parent.get(current) !== current) {
      parent.set(current, parent.get(parent.get(current)));
      current = parent.get(current);
    }
    return current;
  };
  const union = (a, b) => { const rootA = find(a); const rootB = find(b); if (rootA !== rootB) parent.set(rootB, rootA); };
  const usable = edges.filter((edge) => edge.classification === "shared-counterparty" || edge.classification === "tracked-wallet-match" || edge.classification === "cross-chain-counterparty");
  for (const edge of usable) {
    for (const source of edge.sourceKeys.slice(1)) union(edge.sourceKeys[0], source);
  }
  const groups = new Map();
  for (const source of sources) {
    const root = find(source.key);
    const rows = groups.get(root) ?? [];
    rows.push(source);
    groups.set(root, rows);
  }
  let index = 0;
  return [...groups.values()]
    .filter((rows) => rows.length > 1)
    .map((rows) => {
      const keys = new Set(rows.map((row) => row.key));
      const groupEdges = usable.filter((edge) => edge.sourceKeys.some((key) => keys.has(key)));
      const profiles = unique(rows.flatMap((row) => row.profiles.map((profile) => profile.handle)));
      const chains = unique(rows.map((row) => row.chain));
      return {
        id: `cluster-${String(++index).padStart(3, "0")}`,
        sourceWallets: rows.map((row) => ({ chain: row.chain, address: row.address, profiles: row.profiles.map((profile) => profile.handle) })),
        profiles,
        chains,
        sharedLinks: groupEdges.filter((edge) => edge.classification === "shared-counterparty").length,
        repeatedLinks: groupEdges.filter((edge) => edge.confidence === "REPEATED").length,
        topLinks: groupEdges.sort(sortByScore).slice(0, 12).map((edge) => ({ chain: edge.chain, address: edge.address, classification: edge.classification, sourceCount: edge.sourceCount, sourceProfiles: edge.sourceProfiles, hits: edge.hits, repeatedHits: edge.repeatedHits, confidence: edge.confidence, evidence: edge.evidence, sameAddressChains: edge.sameAddressChains })),
      };
    })
    .sort((a, b) => b.sourceWallets.length - a.sourceWallets.length || b.sharedLinks - a.sharedLinks || a.id.localeCompare(b.id));
}

function buildProfileSummaries(tracked, sources, edges, clusters) {
  const clusterBySource = new Map();
  for (const cluster of clusters) for (const source of cluster.sourceWallets) clusterBySource.set(edgeKey(source.chain, source.address), cluster.id);
  const sourceByKey = new Map(sources.map((source) => [source.key, source]));
  const byHandle = new Map();
  for (const wallet of tracked.wallets) {
    const row = byHandle.get(wallet.profile.handle) ?? { handle: wallet.profile.handle, name: wallet.profile.name, wallets: [], clusters: new Set(), links: [] };
    for (const chain of wallet.chains) {
      const key = edgeKey(chain, wallet.address);
      const source = sourceByKey.get(key);
      row.wallets.push({ chain, address: wallet.address, confidence: wallet.profile.confidence, status: source?.status ?? "UNAVAILABLE" });
      const clusterId = clusterBySource.get(key);
      if (clusterId) row.clusters.add(clusterId);
      row.links.push(...edges.filter((edge) => edge.sourceKeys.includes(key)));
    }
    byHandle.set(wallet.profile.handle, row);
  }
  return [...byHandle.values()].map((row) => {
    const links = [...new Map(row.links.map((link) => [`${link.chain}:${link.address.toLowerCase()}`, link])).values()].sort(sortByScore);
    return {
      handle: row.handle,
      name: row.name,
      wallets: row.wallets,
      clusters: [...row.clusters],
      summary: {
        directLinks: links.length,
        repeatedLinks: links.filter((link) => link.confidence === "REPEATED").length,
        sharedCounterparties: links.filter((link) => link.classification === "shared-counterparty").length,
        trackedWalletMatches: links.filter((link) => link.classification === "tracked-wallet-match").length,
        crossChainCounterparties: links.filter((link) => link.classification === "cross-chain-counterparty").length,
        infrastructureLike: links.filter((link) => link.classification === "high-fanout-infrastructure").length,
      },
      links: links.slice(0, 36).map((link) => ({ chain: link.chain, address: link.address, hits: link.hits, repeatedHits: link.repeatedHits, signatures: link.signatures, confidence: link.confidence, classification: link.classification, sourceCount: link.sourceCount, sourceProfiles: link.sourceProfiles, trackedMatches: link.trackedMatches, sameAddressChains: link.sameAddressChains, evidence: link.evidence, tokens: link.tokens, lastSeen: link.lastSeen })),
    };
  }).sort((a, b) => a.handle.localeCompare(b.handle));
}

async function main() {
  const [dataset, solana, evm] = await Promise.all([readJson(kolPath), readJson(solanaPath), readJson(evmPath)]);
  const tracked = collectTracked(dataset);
  const sources = sourceRows(solana, evm);
  const edges = buildEdges(sources, tracked);
  const clusters = buildClusters(edges, sources);
  const profiles = buildProfileSummaries(tracked, sources, edges, clusters);
  const liveSolana = (solana.records ?? []).filter((record) => record.status === "LIVE").length;
  const liveEvm = (evm.records ?? []).filter((record) => record.status === "LIVE").length;
  const keyRequiredEvm = (evm.records ?? []).filter((record) => record.status === "KEY_REQUIRED").length;
  const chainCounts = {};
  for (const wallet of tracked.wallets) for (const chain of wallet.chains) chainCounts[chain] = (chainCounts[chain] ?? 0) + 1;
  const multiChainTrackedAddresses = [...tracked.byEvmAddress.values()].filter((rows) => unique(rows.flatMap((row) => row.chains)).length > 1).length;
  const shared = edges.filter((edge) => edge.sourceCount > 1);
  const sharedTargets = new Set(shared.map((edge) => `${edge.chain}:${edge.address.toLowerCase()}`));
  const possible = edges.filter((edge) => edge.classification === "shared-counterparty" || edge.classification === "tracked-wallet-match" || edge.classification === "cross-chain-counterparty");
  const highFanout = edges.filter((edge) => edge.classification === "high-fanout-infrastructure");
  const capturedAt = [solana.capturedAt, evm.capturedAt, dataset.capturedAt].filter(Boolean).sort().at(-1);
  const output = {
    schemaVersion: 1,
    capturedAt,
    sources: {
      solana: { label: solana.source, capturedAt: solana.capturedAt, signatureLimit: solana.signatureLimit, walletsTotal: solana.walletsTotal, walletsScanned: liveSolana },
      evm: { label: evm.source, capturedAt: evm.capturedAt, tasksTotal: evm.tasksTotal, tasksScanned: liveEvm, tasksKeyRequired: keyRequiredEvm },
    },
    summary: {
      trackedProfiles: dataset.records?.length ?? 0,
      trackedWalletRows: tracked.wallets.length,
      uniqueTrackedAddresses: new Set(tracked.wallets.map((wallet) => wallet.addressKey)).size,
      uniqueTrackedChainAddresses: tracked.byChainAddress.size,
      multiChainTrackedAddresses,
      chainCounts,
      scannedSourceWallets: sources.filter((row) => row.status === "LIVE").length,
      directLinks: edges.length,
      repeatedLinks: edges.filter((edge) => edge.confidence === "REPEATED").length,
      sharedCounterparties: sharedTargets.size,
      sharedCounterpartyEdges: shared.length,
      possibleSharedWalletLinks: possible.length,
      highFanoutInfrastructure: highFanout.length,
      crossChainCounterparties: edges.filter((edge) => edge.classification === "cross-chain-counterparty").length,
      trackedWalletMatches: edges.filter((edge) => edge.classification === "tracked-wallet-match").length,
      graphClusters: clusters.length,
      bnbTasksKeyRequired: keyRequiredEvm,
    },
    methodology: "Direct counterparties are joined across the persisted PublicNode Solana RPC and Blockscout indexed EVM windows. A shared counterparty is a candidate relationship only; high-fanout addresses are separated as likely infrastructure. Same-address EVM reuse is reported as chain reuse, not identity proof.",
    clusters,
    profiles,
  };
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ outputPath, summary: output.summary }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
