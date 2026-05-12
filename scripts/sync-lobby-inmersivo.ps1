$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$lobbyProject = Join-Path $root "Proyecto base1"
$dest = Join-Path $root "public\lobby-inmersivo"

Write-Host "[sync-lobby-inmersivo] Compilando lobby estatico..." -ForegroundColor Cyan
Push-Location -LiteralPath $lobbyProject
npm run build:static-lobby
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

$lobbyHtml = Join-Path $dest "lobby.html"
$indexHtml = Join-Path $dest "index.html"
if (-not (Test-Path -LiteralPath $lobbyHtml)) {
  throw "No se genero lobby.html en public/lobby-inmersivo."
}

if (Test-Path -LiteralPath $indexHtml) {
  Remove-Item -LiteralPath $indexHtml -Force
}
Move-Item -LiteralPath $lobbyHtml -Destination $indexHtml -Force
Write-Host "[sync-lobby-inmersivo] Listo en public/lobby-inmersivo/index.html" -ForegroundColor Green
