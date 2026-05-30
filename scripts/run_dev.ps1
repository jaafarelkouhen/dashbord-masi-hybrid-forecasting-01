# Démarre le dashboard MASI en mode dev (Windows PowerShell)
#
# Pré-requis : .\.venv créé et requirements.txt installé.

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

# Activer venv si présent
$Venv = Join-Path $Root ".venv\Scripts\Activate.ps1"
if (Test-Path $Venv) {
    . $Venv
}

# Charger .env si présent (pour API_HOST, API_PORT, MASI_PROJECT_ROOT, etc.)
$EnvFile = Join-Path $Root ".env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $name = $parts[0].Trim()
            $value = $parts[1].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

$ApiHost = if ($env:API_HOST) { $env:API_HOST } else { "127.0.0.1" }
$ApiPort = if ($env:API_PORT) { $env:API_PORT } else { "8000" }

Write-Host "→ Dashboard : http://$ApiHost`:$ApiPort/"
Write-Host "→ API docs : http://$ApiHost`:$ApiPort/docs"

python -m uvicorn app.main:app --host $ApiHost --port $ApiPort --reload
