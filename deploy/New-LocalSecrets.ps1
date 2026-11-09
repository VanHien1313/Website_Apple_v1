$ErrorActionPreference = 'Stop'
$secretDirectory = Join-Path $PSScriptRoot 'secrets'
New-Item -ItemType Directory -Force -Path $secretDirectory | Out-Null
foreach ($name in @('sql-sa-password.txt', 'sql-app-password.txt')) {
    $path = Join-Path $secretDirectory $name
    if (Test-Path -LiteralPath $path) { Write-Host "$name already exists; preserved."; continue }
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $secret = [Convert]::ToBase64String($bytes) + 'Aa1!'
    $stream = [System.IO.File]::Open($path, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    try { $encoded = [System.Text.Encoding]::UTF8.GetBytes($secret); $stream.Write($encoded, 0, $encoded.Length) } finally { $stream.Dispose() }
    $secret = $null
    Write-Host "$name created (value not printed)."
}
