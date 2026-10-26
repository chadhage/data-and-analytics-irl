#Requires -Version 7.2
[CmdletBinding()]
param([switch] $SkipBicep)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = Split-Path -Parent $PSScriptRoot
$scripts = Get-ChildItem -LiteralPath (Join-Path $root 'examples') -Filter '*.ps1' -Recurse -File
foreach ($script in $scripts) {
    $tokens = $null
    $parseErrors = $null
    $null = [System.Management.Automation.Language.Parser]::ParseFile($script.FullName, [ref] $tokens, [ref] $parseErrors)
    if ($parseErrors.Count -gt 0) {
        throw "PowerShell parse errors in $($script.Name): $($parseErrors.Message -join '; ')"
    }
}
Write-Host "Parsed $($scripts.Count) reference PowerShell scripts."

& (Join-Path $root 'examples\azure\Deploy-Network.ps1') `
    -SubscriptionId '11111111-1111-1111-1111-111111111111' `
    -ResourceGroupName 'validation-only' -Location 'eastus' -Owner 'validation-team' -WhatIf
& (Join-Path $root 'examples\powerbi\Invoke-EnhancedRefresh.ps1') `
    -TenantId '11111111-1111-1111-1111-111111111111' `
    -WorkspaceId '22222222-2222-2222-2222-222222222222' `
    -SemanticModelId '33333333-3333-3333-3333-333333333333' -WhatIf
Write-Host 'Both -WhatIf paths returned without authentication, module import, or cloud calls.'

if ($SkipBicep) {
    Write-Warning 'Bicep compilation explicitly skipped. No Azure deployment validation is claimed.'
    return
}
$null = Get-Command az -ErrorAction Stop
$output = Join-Path ([System.IO.Path]::GetTempPath()) ('bi-network-' + [guid]::NewGuid().ToString('N') + '.json')
try {
    & az bicep build --file (Join-Path $root 'examples\azure\main.bicep') --outfile $output
    if ($LASTEXITCODE -ne 0) {
        throw "Bicep compilation failed with exit code $LASTEXITCODE."
    }
    $compiled = Get-Content -LiteralPath $output -Raw | ConvertFrom-Json
    if ($compiled.resources.Count -ne 1 -or $compiled.resources[0].type -ne 'Microsoft.Network/virtualNetworks') {
        throw 'The compiled starter has an unexpected resource scope.'
    }
    Write-Host 'Bicep compiled successfully. Compilation does not validate subscription policy, permissions, region, or connectivity.'
} finally {
    if (Test-Path -LiteralPath $output) {
        Remove-Item -LiteralPath $output
    }
}
