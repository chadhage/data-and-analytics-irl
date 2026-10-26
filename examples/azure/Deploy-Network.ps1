#Requires -Version 7.2
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High')]
param(
    [Parameter(Mandatory)]
    [guid] $SubscriptionId,

    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string] $ResourceGroupName,

    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string] $Location,

    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string] $Owner,

    [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
    [string] $ParametersFile = (Join-Path $PSScriptRoot 'parameters.example.json'),

    [switch] $Deploy
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if ($SubscriptionId -eq [guid]::Empty) {
    throw 'SubscriptionId must not be the empty GUID.'
}

$target = "subscription $SubscriptionId / resource group $ResourceGroupName / region $Location"
$action = if ($Deploy) { 'Deploy the reviewed BI network foundation' } else { 'Run Azure deployment what-if only' }
if ($WhatIfPreference) {
    $null = $PSCmdlet.ShouldProcess($target, $action)
    return
}
if ($Deploy -and -not $PSCmdlet.ShouldProcess($target, $action)) {
    return
}

$null = Get-Command az -ErrorAction Stop
$template = Join-Path $PSScriptRoot 'main.bicep'
$parameters = (Resolve-Path -LiteralPath $ParametersFile).Path
$operation = if ($Deploy) { 'create' } else { 'what-if' }
$arguments = @(
    'deployment', 'group', $operation,
    '--subscription', $SubscriptionId.ToString(),
    '--resource-group', $ResourceGroupName,
    '--name', ('bi-network-' + [DateTime]::UtcNow.ToString('yyyyMMddHHmmss')),
    '--template-file', $template,
    '--parameters', "@$parameters", "location=$Location", "owner=$Owner"
)

Write-Information "$action in $target" -InformationAction Continue
& az @arguments
if ($LASTEXITCODE -ne 0) {
    throw "Azure deployment $operation failed with exit code $LASTEXITCODE. No success is inferred; inspect the Azure error and deployment state."
}
