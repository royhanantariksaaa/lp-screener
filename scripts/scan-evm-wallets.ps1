param(
  [int]$PageLimit = 50,
  [int]$Max = 0,
  [int]$MinIntervalMs = 750,
  [switch]$Reset
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$InputPath = Join-Path $Root "src\data\kol-wallets.json"
$StatePath = Join-Path $Root "api\evm-wallet-scan-state.json"
$SnapshotPath = Join-Path $Root "api\evm-wallet-clusters.json"
$ChainConfigs = @{
  ethereum = @{ label = "Ethereum"; base = "https://eth.blockscout.com/api/v2" }
  base = @{ label = "Base"; base = "https://base.blockscout.com/api/v2" }
  robinhood = @{ label = "Robinhood Chain"; base = "https://robinhoodchain.blockscout.com/api/v2" }
  bnb = @{ label = "BNB Chain"; unavailable = "Public BNB mainnet history needs a BscScan/BSCTrace indexer key." }
}
$Script:NextRequestAt = [DateTime]::UtcNow

function Write-AtomicJson([string]$Path, $Value) {
  $temp = "$Path.tmp"
  $Value | ConvertTo-Json -Depth 30 | Set-Content -Path $temp -Encoding utf8
  Move-Item -LiteralPath $temp -Destination $Path -Force
}

function Read-JsonOr([string]$Path, $Fallback) {
  if (-not (Test-Path $Path)) { return $Fallback }
  try { return (Get-Content -Raw -Path $Path | ConvertFrom-Json) } catch { return $Fallback }
}

function Invoke-IndexedJson([string]$Url) {
  $last = $null
  for ($attempt = 0; $attempt -lt 5; $attempt++) {
    $wait = ($Script:NextRequestAt - [DateTime]::UtcNow).TotalMilliseconds
    if ($wait -gt 0) { Start-Sleep -Milliseconds ([int]$wait) }
    $Script:NextRequestAt = [DateTime]::UtcNow.AddMilliseconds($MinIntervalMs)
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 30
      return ($response.Content | ConvertFrom-Json)
    } catch {
      $last = $_
      $status = 0
      try { $status = [int]$_.Exception.Response.StatusCode } catch { }
      if ($status -in @(400, 401, 403, 404)) { throw }
      Start-Sleep -Milliseconds ([int][Math]::Min(15000, 500 * [Math]::Pow(2, $attempt)))
    }
  }
  throw $last
}

function Get-Address([object]$Value) {
  if ($Value -is [string]) { return [string]$Value }
  if ($null -ne $Value) {
    if ($Value.hash) { return [string]$Value.hash }
    if ($Value.address_hash) { return [string]$Value.address_hash }
  }
  return ""
}

function Add-Candidate([hashtable]$Map, [string]$Owner, [string]$Wallet, [string]$Evidence, [string]$Hash, [string]$Timestamp, [string]$Direction, [string]$Token) {
  if ($Wallet -notmatch '^0x[0-9a-fA-F]{40}$' -or $Wallet.ToLowerInvariant() -eq $Owner.ToLowerInvariant()) { return }
  $key = $Wallet.ToLowerInvariant()
  if (-not $Map.ContainsKey($key)) { $Map[$key] = [pscustomobject]@{ address = $Wallet; hits = 0; signatures = @(); evidence = @(); directions = @(); tokens = @(); lastSeen = $Timestamp } }
  $row = $Map[$key]
  $row.hits++
  if ($Hash -and -not ($row.signatures -contains $Hash)) { $row.signatures += $Hash }
  if ($Evidence -and -not ($row.evidence -contains $Evidence)) { $row.evidence += $Evidence }
  if ($Direction -and -not ($row.directions -contains $Direction)) { $row.directions += $Direction }
  if ($Token -and -not ($row.tokens -contains $Token)) { $row.tokens += $Token }
  if ($Timestamp -and ([string]$Timestamp -gt [string]$row.lastSeen)) { $row.lastSeen = $Timestamp }
}

function Convert-Rows([object]$Task, [array]$Transactions, [array]$Transfers) {
  $map = @{}
  foreach ($tx in @($Transactions)) {
    $from = Get-Address $tx.from
    $to = Get-Address $tx.to
    $hash = [string]($tx.hash ?? $tx.transaction_hash)
    $time = [string]($tx.timestamp ?? $tx.timeStamp)
    if ($from.ToLowerInvariant() -eq $Task.address.ToLowerInvariant()) { Add-Candidate $map $Task.address $to "native transaction" $hash $time "outbound" "" }
    if ($to.ToLowerInvariant() -eq $Task.address.ToLowerInvariant()) { Add-Candidate $map $Task.address $from "native transaction" $hash $time "inbound" "" }
  }
  foreach ($transfer in @($Transfers)) {
    $from = Get-Address $transfer.from
    $to = Get-Address $transfer.to
    $hash = [string]($transfer.transaction_hash ?? $transfer.hash)
    $time = [string]($transfer.timestamp ?? $transfer.timeStamp)
    $token = [string]($transfer.token.symbol ?? $transfer.token.name ?? $transfer.contractAddress)
    if ($from.ToLowerInvariant() -eq $Task.address.ToLowerInvariant()) { Add-Candidate $map $Task.address $to "indexed token transfer" $hash $time "outbound" $token }
    if ($to.ToLowerInvariant() -eq $Task.address.ToLowerInvariant()) { Add-Candidate $map $Task.address $from "indexed token transfer" $hash $time "inbound" $token }
  }
  @($map.Values | Sort-Object @{Expression="hits";Descending=$true}, @{Expression={ $_.signatures.Count };Descending=$true}, address | Select-Object -First 50 | ForEach-Object {
    [pscustomobject]@{
      address = $_.address; hits = $_.hits; signatures = $_.signatures.Count; evidence = @($_.evidence); directions = @($_.directions); tokens = @($_.tokens | Select-Object -First 8); confidence = if ($_.hits -ge 3) { "REPEATED" } elseif ($_.hits -ge 2) { "OBSERVED" } else { "SINGLE" }; lastSeen = $_.lastSeen
    }
  })
}

function Get-LegacyRows([string]$Base, [string]$Address, [string]$Action) {
  $origin = $Base -replace '/api/v2$', ''
  $url = "$origin/api?module=account&action=$Action&address=$([uri]::EscapeDataString($Address))&page=1&offset=$PageLimit&sort=desc"
  $payload = Invoke-IndexedJson $url
  if ($payload.result -is [array]) { return @($payload.result) }
  return @()
}

function Get-IndexedRows([hashtable]$Config, [string]$Address, [string]$Path, [string]$LegacyAction) {
  $url = "$($Config.base)/addresses/$Address/$Path`?items_count=$PageLimit"
  try {
    $payload = Invoke-IndexedJson $url
    if ($payload.items -is [array]) { return @($payload.items) }
    return @()
  } catch {
    return Get-LegacyRows $Config.base $Address $LegacyAction
  }
}

$dataset = Get-Content -Raw -Path $InputPath | ConvertFrom-Json
$taskMap = @{}
foreach ($profile in @($dataset.records)) {
  foreach ($wallet in @($profile.wallets)) {
    if ($wallet.address -notmatch '^0x[0-9a-fA-F]{40}$') { continue }
    foreach ($chain in @($wallet.chains)) {
      if (-not $ChainConfigs.ContainsKey($chain)) { continue }
      $key = "$chain`:$($wallet.address.ToLowerInvariant())"
      if (-not $taskMap.ContainsKey($key)) { $taskMap[$key] = [pscustomobject]@{ key = $key; chain = $chain; address = $wallet.address; profiles = @() } }
      $task = $taskMap[$key]
      if (-not (@($task.profiles | ForEach-Object handle) -contains $profile.handle)) { $task.profiles += [pscustomobject]@{ handle = $profile.handle; name = $profile.name; confidence = $wallet.confidence } }
    }
  }
}
$allTasks = @($taskMap.Values | Sort-Object key)
$tasks = if ($Max -gt 0) { @($allTasks | Select-Object -First $Max) } else { $allTasks }
$blank = [pscustomobject]@{ schemaVersion = 1; source = "Blockscout indexed EVM history"; startedAt = [DateTime]::UtcNow.ToString("o"); updatedAt = [DateTime]::UtcNow.ToString("o"); nextIndex = 0; tasksTotal = $tasks.Count; records = @() }
$state = if ($Reset) { $blank } else { Read-JsonOr $StatePath $blank }
$records = @{}
foreach ($record in @($state.records)) { if ($record.key) { $records[$record.key] = $record } }
for ($index = 0; $index -lt $tasks.Count; $index++) {
  $task = $tasks[$index]
  if ($records.ContainsKey($task.key) -and @("LIVE", "KEY_REQUIRED") -contains $records[$task.key].status) { continue }
  $config = $ChainConfigs[$task.chain]
  try {
    if ($config.unavailable) {
      $records[$task.key] = [pscustomobject]@{ key=$task.key; chain=$task.chain; address=$task.address; profiles=$task.profiles; status="KEY_REQUIRED"; source=$config.unavailable; relatedWallets=@(); scannedTransactions=0; scannedTransfers=0; scannedAt=[DateTime]::UtcNow.ToString("o") }
    } else {
      $transactions = Get-IndexedRows $config $task.address "transactions" "txlist"
      $transfers = Get-IndexedRows $config $task.address "token-transfers" "tokentx"
      $links = Convert-Rows $task $transactions $transfers
      $records[$task.key] = [pscustomobject]@{ key=$task.key; chain=$task.chain; address=$task.address; profiles=$task.profiles; status="LIVE"; source="$($config.label) Blockscout indexed API"; scannedTransactions=$transactions.Count; scannedTransfers=$transfers.Count; relatedWallets=$links; scannedAt=[DateTime]::UtcNow.ToString("o") }
    }
    Write-Host "[$($index + 1)/$($tasks.Count)] $($task.chain) $($task.address) · $(@($records[$task.key].relatedWallets).Count) links"
  } catch {
    $records[$task.key] = [pscustomobject]@{ key=$task.key; chain=$task.chain; address=$task.address; profiles=$task.profiles; status="ERROR"; source="Blockscout indexed API unavailable"; error=$_.Exception.Message; relatedWallets=@(); scannedAt=[DateTime]::UtcNow.ToString("o") }
    Write-Warning "[$($index + 1)/$($tasks.Count)] $($task.chain) $($task.address) · $($_.Exception.Message)"
  }
  $recordList = @($records.Values | Sort-Object key)
  $now = [DateTime]::UtcNow.ToString("o")
  Write-AtomicJson $StatePath ([pscustomobject]@{ schemaVersion=1; source="Blockscout indexed EVM history"; startedAt=$state.startedAt; updatedAt=$now; nextIndex=$index + 1; tasksTotal=$tasks.Count; records=$recordList })
  Write-AtomicJson $SnapshotPath ([pscustomobject]@{ schemaVersion=1; source="Blockscout indexed EVM history"; capturedAt=$now; tasksTotal=$tasks.Count; tasksScanned=@($recordList | Where-Object { $_.status -in @("LIVE", "KEY_REQUIRED") }).Count; tasksWithErrors=@($recordList | Where-Object { $_.status -eq "ERROR" }).Count; records=$recordList })
}
Write-Host "Completed $($records.Count)/$($tasks.Count) indexed EVM tasks."
