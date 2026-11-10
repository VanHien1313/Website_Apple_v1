$ErrorActionPreference = 'Stop'
$path = Join-Path $PSScriptRoot 'secrets/demo-accounts.json'
if (-not (Test-Path -LiteralPath $path)) { throw 'Run npm run demo:start first.' }
$accounts = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
Write-Host 'DEMO ONLY: http://localhost:4001 — do not use these accounts on port 4000.'
@(
    [PSCustomObject]@{ Role = 'Owner'; Email = $accounts.ownerEmail; Password = $accounts.ownerPassword }
    [PSCustomObject]@{ Role = 'Editor'; Email = $accounts.editorEmail; Password = $accounts.editorPassword }
    [PSCustomObject]@{ Role = 'Customer'; Email = $accounts.customerEmail; Password = $accounts.customerPassword }
) | Format-List
$accounts = $null
