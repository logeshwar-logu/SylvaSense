Set-Location "$PSScriptRoot\frontend"
if (!(Test-Path "node_modules")) {
  Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
  npm install
}
npm run dev
