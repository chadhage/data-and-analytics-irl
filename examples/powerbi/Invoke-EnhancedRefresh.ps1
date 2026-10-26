#Requires -Version 7.2
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High', DefaultParameterSetName = 'Interactive')]
param(
    [Parameter(Mandatory)]
    [guid] $TenantId,

    [Parameter(Mandatory)]
    [guid] $WorkspaceId,

    [Parameter(Mandatory)]
    [guid] $SemanticModelId,

    [Parameter(Mandatory, ParameterSetName = 'Certificate')]
    [guid] $ApplicationId,

    [Parameter(Mandatory, ParameterSetName = 'Certificate')]
    [ValidatePattern('^[A-Fa-f0-9]{40}$')]
    [string] $CertificateThumbprint,

    [ValidateRange(1, 8)]
    [int] $MaxParallelism = 2,

    [switch] $Wait,

    [ValidateRange(60, 7200)]
    [int] $MaxWaitSeconds = 900
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

foreach ($identifier in @($TenantId, $WorkspaceId, $SemanticModelId)) {
    if ($identifier -eq [guid]::Empty) {
        throw 'Tenant, workspace, and semantic model identifiers must not be empty GUIDs.'
    }
}
if ($PSCmdlet.ParameterSetName -eq 'Certificate' -and $ApplicationId -eq [guid]::Empty) {
    throw 'ApplicationId must not be the empty GUID.'
}

$endpoint = "https://api.powerbi.com/v1.0/myorg/groups/$WorkspaceId/datasets/$SemanticModelId/refreshes"
if (-not $PSCmdlet.ShouldProcess($endpoint, 'Request a transactional enhanced refresh; source/capacity charges can apply')) {
    return
}

Import-Module MicrosoftPowerBIMgmt.Profile -ErrorAction Stop
if ($PSCmdlet.ParameterSetName -eq 'Certificate') {
    Connect-PowerBIServiceAccount -ServicePrincipal -Tenant $TenantId.ToString() `
        -ApplicationId $ApplicationId.ToString() -CertificateThumbprint $CertificateThumbprint | Out-Null
} else {
    Connect-PowerBIServiceAccount -Tenant $TenantId.ToString() | Out-Null
}
$headers = Get-PowerBIAccessToken
$body = @{
    type = 'full'
    commitMode = 'transactional'
    applyRefreshPolicy = $true
    maxParallelism = $MaxParallelism
    retryCount = 1
} | ConvertTo-Json -Compress

# Do not retry POST automatically: a lost response may still represent an accepted operation.
$response = Invoke-WebRequest -Uri $endpoint -Method Post -Headers $headers `
    -ContentType 'application/json' -Body $body
if ($response.StatusCode -ne 202) {
    throw "Expected 202 Accepted; received $($response.StatusCode). Inspect refresh history before submitting again."
}

$operationUrl = [string](@($response.Headers['Location'])[0])
$expectedPattern = '^' + [regex]::Escape($endpoint) + '/[0-9a-fA-F-]{36}$'
if ($operationUrl -notmatch $expectedPattern) {
    throw 'Refresh was accepted, but a valid operation Location was not returned. Inspect service refresh history; do not automatically resubmit.'
}
Write-Information "Accepted refresh operation: $operationUrl" -InformationAction Continue

if (-not $Wait) {
    [pscustomobject]@{ Status = 'Accepted'; OperationUrl = $operationUrl }
    return
}

$deadline = [DateTime]::UtcNow.AddSeconds($MaxWaitSeconds)
while ([DateTime]::UtcNow -lt $deadline) {
    $detail = Invoke-RestMethod -Uri $operationUrl -Method Get -Headers $headers `
        -MaximumRetryCount 3 -RetryIntervalSec 5
    if ($detail.status -eq 'Completed') {
        [pscustomobject]@{ Status = 'Completed'; OperationUrl = $operationUrl; Detail = $detail }
        return
    }
    if ($detail.status -notin @('Unknown', 'NotStarted', 'InProgress')) {
        throw "Refresh ended or returned an unexpected state '$($detail.status)'. Inspect $operationUrl for execution details."
    }
    Start-Sleep -Seconds 10
}
throw "Client wait timed out after $MaxWaitSeconds seconds. The service refresh is not cancelled; inspect $operationUrl before taking further action."
