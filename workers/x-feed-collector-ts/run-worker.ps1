$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

if (-not (Test-Path -LiteralPath '.\dist\collector.js')) {
  npm run build
}

node .\dist\collector.js
