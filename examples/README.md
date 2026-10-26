# BI reference starter kits

These are reviewable starting points, not a complete production landing zone.
No Azure, Snowflake, Databricks, or Power BI environment was provisioned for this site.
Syntax/contract checks do not prove permissions, networking, licensing, or workload performance.

## 1. Azure gateway subnet foundation

Prerequisites: an approved existing resource group/landing zone, current Azure CLI
and Bicep, registered `Microsoft.Network` / `Microsoft.PowerPlatform` providers, and
non-overlapping address space. The account needs permissions for the reviewed
resource-group deployment and network resources.

```powershell
.\examples\azure\Deploy-Network.ps1 `
  -SubscriptionId '<subscription-guid>' `
  -ResourceGroupName '<existing-rg>' `
  -Location '<approved-region>' `
  -Owner '<team-alias>'
```

The default operation is Azure **what-if**, not deployment. PowerShell `-WhatIf`
returns before authentication/network calls. To apply a reviewed plan, explicitly
add `-Deploy` and approve the confirmation. The script passes the subscription on
every Azure command; it does not change the user's selected account.

The template creates a VNet, an IPv4-only dedicated delegated data-gateway subnet,
and a separate private-endpoint subnet. The Storage service endpoint supports
approved storage connectivity but does not itself grant storage authorization.

**Not included:** Fabric capacity, the VNet data gateway object, private endpoints,
private DNS, routes, peering, VPN/Interconnect/Direct Connect, NSG/firewall policy,
or source credentials. Integrate those under platform ownership before use.
An unconnected subnet is not a validated private BI architecture.

Review existing resources with the same name before deployment. Roll back only
the reviewed resources after removing gateway/private-endpoint dependencies; do
not delete a shared resource group.

References: [VNet data gateways](https://learn.microsoft.com/en-us/data-integration/vnet/create-data-gateways),
[CAF design areas](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/landing-zone/design-areas).

## 2. Snowflake BI serving role

Edit the database and approved view in [bi-serving.sql](snowflake/bi-serving.sql).
Use an approved profile and an administrator with only the required role,
warehouse, and grant capabilities.

```powershell
snow sql --connection '<approved-profile>' --filename .\examples\snowflake\bi-serving.sql
```

The script creates an initially suspended BI warehouse and a reader role. It grants
USAGE and SELECT on one explicit view, not all/future tables. It deliberately
reapplies auto-suspend/timeouts on an existing named warehouse; review before
rerunning. `XSMALL`, 60-second suspension, and the timeouts are example settings,
not validated production sizes.

Separately review existing role privileges, map the role to the approved identity,
configure Entra SSO if selected, and add a reviewed resource monitor. Resource
monitors do not cover serverless/AI services and are not a universal account-cost cap.
No role is granted to a user automatically. Rollback is a reviewed revoke/drop
of these specific objects only after checking other consumers.

Snowflake currently documents **no Snowflake egress charge for client/driver query
result retrieval**, including cross-cloud results. Unloads, replication, storage
reads, network providers, and other transfer paths have different billing rules.
Do not apply a blanket cross-cloud egress rate to every query result.

References: [warehouse syntax](https://docs.snowflake.com/en/sql-reference/sql/create-warehouse),
[resource monitors](https://docs.snowflake.com/en/user-guide/resource-monitors),
[Power BI SSO](https://docs.snowflake.com/en/user-guide/oauth-powerbi),
[transfer billing](https://docs.snowflake.com/en/user-guide/cost-understanding-data-transfer).

## 3. Databricks SQL-file job

Use a current authenticated Databricks CLI profile. Edit the reviewed three-part
identifiers in [daily-sales.sql](databricks/sql/daily-sales.sql) before deployment.

Source contract:

| Column | Contract |
|---|---|
| `order_timestamp` | Timestamp with agreed business timezone |
| `customer_key`, `product_key` | Governed dimension keys |
| `currency_code` | Currency, retained in the aggregate grain |
| `net_amount` | Decimal with tested sum precision |

The existing catalog/schema and source table must exist. The run-as principal
needs SELECT/source access, target view-creation privileges, and warehouse access.
The deployer needs permission to deploy the job and use that run-as principal.

```powershell
Set-Location .\examples\databricks
databricks bundle validate -t sandbox --var 'warehouse_id=<warehouse-id>,run_as_principal=<application-id>'
databricks bundle deploy -t sandbox --var 'warehouse_id=<warehouse-id>,run_as_principal=<application-id>'
# Only after reviewing the deployed SQL, identity, target, and replacement behavior:
databricks bundle run -t sandbox --var 'warehouse_id=<warehouse-id>,run_as_principal=<application-id>' publish_daily_sales
```

Deployment creates an **unscheduled** job and SQL workspace file. Only a run
executes `CREATE OR REPLACE VIEW`; review existing target grants/ownership and
dependent reports before replacement. Apply the approved consumer grants
separately and verify them after replacement. No compute or source data is created.
The aggregate is not a complete star-schema semantic model.

Retain the prior SQL definition/grants for rollback. Review the specific deployed
job/file before bundle cleanup; the curated view is a separately governed data object.

Reference: [bundle SQL tasks](https://docs.databricks.com/aws/en/dev-tools/bundles/job-task-types#sql-task).

## 4. Power Query incremental window

Create a connector-backed `FactSalesSource` query, separate Date/Time parameters
`RangeStart` and `RangeEnd` (case-sensitive), and a `FactSales` query using
[incremental-refresh.pq](powerbi/incremental-refresh.pq). The source must expose
`OrderDateTime` as a compatible Date/Time column.

The filter is `>= RangeStart` and `< RangeEnd`. This half-open interval prevents
duplicate boundary rows. Do not transform the source date per row without proving
folding. Inspect actual generated source queries; a correct-looking M expression
is not proof of pruning.

Configure the history/refresh policy in Desktop, publish, and complete initial
refresh. The expression alone deploys no policy. A hot DirectQuery partition has
additional licensing/source requirements. Reconcile late corrections, timezones,
retention, and initial-refresh memory.

References: [configuration](https://learn.microsoft.com/en-us/power-bi/connect-data/incremental-refresh-configure),
[incremental/hybrid requirements](https://learn.microsoft.com/en-us/power-bi/connect-data/incremental-refresh-overview).

## 5. Guarded enhanced refresh

Prerequisites: PowerShell 7.2+, the `MicrosoftPowerBIMgmt.Profile` module, an
existing model with configured connections, supported enhanced-refresh capacity,
and appropriate workspace/API permissions. Shared capacity is not supported by
this enhanced-refresh example.

```powershell
.\examples\powerbi\Invoke-EnhancedRefresh.ps1 `
  -TenantId '<tenant-guid>' `
  -WorkspaceId '<workspace-guid>' `
  -SemanticModelId '<model-guid>' -WhatIf
```

Remove `-WhatIf` only after review. The script requests interactive Entra login by
default. For an approved service principal, provide `-ApplicationId` and
`-CertificateThumbprint`; provision the certificate and tenant API/workspace
permissions separately. No secrets/tokens are written to disk or console.

Use `-Wait` to poll the **returned operation URL**, not whichever refresh happens
to be latest. A POST is not automatically retried because an interrupted response
can still represent an accepted operation. The script distinguishes Accepted,
Completed, failure, and client timeout. Client timeout **does not cancel** the
service operation. Inspect operation details before resubmission.

References: [refresh API](https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/refresh-dataset-in-group),
[operation details](https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/get-refresh-execution-details-in-group).
