$ErrorActionPreference = 'Stop'
$taskName = 'Meteora LP Screener X Feed'
& schtasks.exe /Delete /TN $taskName /F
if ($LASTEXITCODE -ne 0) { throw "Task Scheduler removal failed with exit code $LASTEXITCODE" }
Write-Host "Removed '$taskName'."
