# Sincroniza la web (src -> dist) con el proyecto Android.
# La UI NO se edita en android/app/src/main/assets/public/ — solo aquí, con este script.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)
Write-Host "[sync-android] Compilando web desde src/..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "[sync-android] Copiando dist/ al proyecto Android (cap sync)..." -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "[sync-android] Listo. Abre Android Studio y Run; no edites assets/public a mano." -ForegroundColor Green
