param([string]$Email)
$ErrorActionPreference = 'Stop'
if (-not $Email) { $Email = Read-Host 'Owner email' }
$dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
$dockerPath = if ($dockerCommand) { $dockerCommand.Source } else { Join-Path $env:ProgramFiles 'Docker\Docker\resources\bin\docker.exe' }
if (-not (Test-Path -LiteralPath $dockerPath)) { throw 'Docker CLI not found. Open a new terminal after installing Docker Desktop.' }
$name = Read-Host 'Owner name'
$securePassword = Read-Host 'Owner password (12-128 characters)' -AsSecureString
$password = [System.Net.NetworkCredential]::new('', $securePassword).Password
$payload = @{ email = $Email; name = $name; password = $password } | ConvertTo-Json -Compress
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    $payload | & $dockerPath compose run --rm --no-deps -T app node backend/dist/auth/bootstrap-cli.js
    if ($LASTEXITCODE -ne 0) { throw 'Owner bootstrap failed; existing accounts are not overwritten.' }
} finally { Pop-Location; $password = $null; $payload = $null; $securePassword.Dispose() }
