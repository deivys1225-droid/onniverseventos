# Configura Google/Facebook OAuth en Supabase (proyecto remoto).
# Uso seguro: define variables en tu terminal, NO las subas a Git.
#
#   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."   # https://supabase.com/dashboard/account/tokens
#   $env:GOOGLE_CLIENT_ID = "123456789-xxxx.apps.googleusercontent.com"
#   $env:GOOGLE_CLIENT_SECRET = "GOCSPX-..."
#   $env:FACEBOOK_APP_ID = "1234567890123456"
#   $env:FACEBOOK_APP_SECRET = "abcdef..."
#   .\scripts\configure-supabase-oauth.ps1
#
# Redirect URI que debes añadir en Google Cloud y Meta (no se puede hacer desde aquí):
#   https://rwyhakcsvdbsavignogh.supabase.co/auth/v1/callback

param(
  [string]$ProjectRef = "rwyhakcsvdbsavignogh"
)

$token = $env:SUPABASE_ACCESS_TOKEN
if (-not $token) {
  Write-Error "Falta SUPABASE_ACCESS_TOKEN. Créalo en https://supabase.com/dashboard/account/tokens"
  exit 1
}

$body = @{}
if ($env:GOOGLE_CLIENT_ID -and $env:GOOGLE_CLIENT_SECRET) {
  $body.external_google_enabled = $true
  $body.external_google_client_id = $env:GOOGLE_CLIENT_ID.Trim()
  $body.external_google_secret = $env:GOOGLE_CLIENT_SECRET.Trim()
}
if ($env:FACEBOOK_APP_ID -and $env:FACEBOOK_APP_SECRET) {
  $body.external_facebook_enabled = $true
  $body.external_facebook_client_id = $env:FACEBOOK_APP_ID.Trim()
  $body.external_facebook_secret = $env:FACEBOOK_APP_SECRET.Trim()
}

if ($body.Count -eq 0) {
  Write-Error "Define GOOGLE_CLIENT_ID/SECRET y/o FACEBOOK_APP_ID/SECRET antes de ejecutar."
  exit 1
}

$json = $body | ConvertTo-Json
$headers = @{
  Authorization = "Bearer $token"
  "Content-Type" = "application/json"
}

Write-Host "Actualizando OAuth en Supabase ($ProjectRef)..." -ForegroundColor Cyan
$response = Invoke-RestMethod -Method PATCH `
  -Uri "https://api.supabase.com/v1/projects/$ProjectRef/config/auth" `
  -Headers $headers `
  -Body $json

Write-Host "OK" -ForegroundColor Green
Write-Host "  Google habilitado: $($response.external_google_enabled)"
Write-Host "  Google Client ID:  $($response.external_google_client_id)"
Write-Host "  Facebook habilitado: $($response.external_facebook_enabled)"
Write-Host "  Facebook App ID:     $($response.external_facebook_client_id)"
Write-Host ""
Write-Host "Recuerda en Google Cloud y Meta añadir redirect URI:" -ForegroundColor Yellow
Write-Host "  https://$ProjectRef.supabase.co/auth/v1/callback"
