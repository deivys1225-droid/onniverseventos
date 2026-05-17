# Empaqueta SOLO lobby inmersivo + texturas Tierra/Luna (+ corazón .glb) para Android.
# No toca src/: compila lobby.html y copia assets estáticos necesarios.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$distLobby = Join-Path $Root "dist-lobby-earth"
$androidPublic = Join-Path $Root "android\app\src\main\assets\public"
$exportReady = Join-Path $Root "ANDROID_LOBBY_TIERRA_LISTO"

Write-Host "[lobby-earth] Compilando lobby (NeonRoom + Tierra)..." -ForegroundColor Cyan
npx vite build --config vite.lobby.config.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$textureDirs = @(
  "assets\textures\earth",
  "assets\textures\moon",
  "assets\models"
)

function Copy-Tree($from, $to) {
  if (-not (Test-Path $from)) {
    Write-Warning "No existe: $from"
    return
  }
  New-Item -ItemType Directory -Force -Path $to | Out-Null
  robocopy $from $to /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  if ($LASTEXITCODE -ge 8) { exit $LASTEXITCODE }
}

Write-Host "[lobby-earth] Copiando a Android assets/public..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $androidPublic | Out-Null

# Lobby compilado -> .../public/lobby-inmersivo/  (MainActivity: https://localhost/lobby-inmersivo)
$lobbyTarget = Join-Path $androidPublic "lobby-inmersivo"
if (Test-Path $lobbyTarget) { Remove-Item $lobbyTarget -Recurse -Force }
Copy-Tree $distLobby $lobbyTarget
# Capacitor/WebView resuelve la carpeta con index.html, no lobby.html
$lobbyHtml = Join-Path $lobbyTarget "lobby.html"
$lobbyIndex = Join-Path $lobbyTarget "index.html"
if (Test-Path $lobbyHtml) {
  Copy-Item $lobbyHtml $lobbyIndex -Force
}

# Texturas Tierra/Luna y modelo corazón en raíz /assets/ (rutas absolutas en LobbyDecorEarthMoon)
foreach ($rel in $textureDirs) {
  $src = Join-Path $Root "public\$rel"
  $dst = Join-Path $androidPublic $rel
  Copy-Tree $src $dst
}

Write-Host "[lobby-earth] Carpeta lista para copiar/pegar: $exportReady" -ForegroundColor Cyan
if (Test-Path $exportReady) { Remove-Item $exportReady -Recurse -Force }
New-Item -ItemType Directory -Force -Path $exportReady | Out-Null
$exportLobby = Join-Path $exportReady "lobby-inmersivo"
Copy-Tree $lobbyTarget $exportLobby
if (Test-Path (Join-Path $exportLobby "lobby.html")) {
  Copy-Item (Join-Path $exportLobby "lobby.html") (Join-Path $exportLobby "index.html") -Force
}
foreach ($rel in $textureDirs) {
  Copy-Tree (Join-Path $Root "public\$rel") (Join-Path $exportReady $rel)
}

$nFiles = (Get-ChildItem $exportReady -Recurse -File | Measure-Object).Count
$sizeMb = [math]::Round((Get-ChildItem $exportReady -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
Write-Host "[lobby-earth] Listo: $nFiles archivos, $sizeMb MB" -ForegroundColor Green
Write-Host "  Android: $androidPublic" -ForegroundColor Green
Write-Host "  Export:  $exportReady" -ForegroundColor Green
Write-Host "  Pega el contenido de ANDROID_LOBBY_TIERRA_LISTO dentro de assets\public\" -ForegroundColor Yellow
