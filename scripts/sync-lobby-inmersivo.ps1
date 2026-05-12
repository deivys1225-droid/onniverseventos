$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
node (Join-Path $root "scripts\sync-lobby-inmersivo.mjs")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
