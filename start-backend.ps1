Set-Location "$PSScriptRoot\backend"
if (!(Test-Path ".venv\Scripts\python.exe")) {
  Write-Host "Backend virtual environment not found. Run: python -m venv .venv" -ForegroundColor Yellow
  exit 1
}
& ".venv\Scripts\python.exe" -m uvicorn main:app --reload --port 8000
