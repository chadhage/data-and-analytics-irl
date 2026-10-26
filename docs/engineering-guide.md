# Multicloud Power BI engineering guide

The initial BI engineering module of [Data & Analytics across clouds](../README.md).

Scope: Snowflake and Databricks on Azure, AWS, and Google Cloud, with supported
on-premises integration. Fabric/OneLake is an optional serving path, not a
prerequisite for Power BI. This is original engineering guidance, not an
official reference architecture, product SLA, or regulatory assurance.

## 1. Establish the contract

| Input | Record before choosing a connector |
|---|---|
| Business grain | Required facts/dimensions, measures, currency, timezone |
| Scale | Modeled columns/cardinality, history, peak concurrent interactions |
| Freshness | Source commit to visible answer, not only refresh frequency |
| Identity | Source credential, effective viewer, RLS/OLS, Build/export |
| Movement | Detail, aggregates, results, caches, metadata, downloads |
| Operations | Owner, SLO, RTO/RPO, recovery, cost attribution |

Do not select a storage mode from total source terabytes alone.

## 2. Evaluate serving paths

| Choice | Use condition | Required proof |
|---|---|---|
| Curated Import | Approved slice and scheduled freshness | Folding, refresh memory, semantic policy |
| DirectQuery | Source-current detail or unsuitable Import | Cold/warm p95, fan-out, queues, effective identity |
| Import aggregates + DQ | Common summaries dominate | Hit/miss equivalence and RLS |
| Hybrid table | Historical Import plus hot interval | Boundaries, late changes, license/source support |
| Snowflake mirroring | Approved eligible Fabric mirror | Object-specific movement, lag, copied-data policy |
| External Delta shortcut | Approved storage/table contract | Format compatibility, storage policy, transfer |
| Azure Databricks catalog mirror | Eligible Azure catalog/storage | Exclusions, source storage access, downstream policy |
| Curated upstream integration | Cross-system conformance | Reconciliation, restartability, movement approval |
| Delta Sharing Import | Bounded provider/recipient contract | Row-limit completeness, retention, revocation |
| Shared semantic models | Reusable measures and policy | Viewer/Build tests and independent report ownership |

A live report connection is a semantic-model reuse choice, not a Snowflake or
Databricks storage mode. Gateways are connectivity enablers, not storage modes.

## 3. Important current boundaries

- Direct Lake requires supported OneLake-accessible Delta tables and Fabric
  capacity. It is not an arbitrary SQL warehouse connector.
- Direct Lake on OneLake does not fall back to DirectQuery. Direct Lake on SQL
  can fall back under documented conditions; monitor/configure the chosen variant.
- Snowflake managed-table mirroring copies data. Supported Iceberg mirroring
  uses underlying storage connections/shortcuts. Check each object type.
- Current Snowflake mirroring documentation lists 12-hour view/materialized-view
  syncs. Do not promise minute-level freshness from those objects.
- Azure Databricks catalog mirroring copies metadata, then accesses data through
  shortcuts. It is not an AWS/GCP catalog-mirroring guarantee.
- Current catalog-mirror exclusions include RLS/column-mask protected tables,
  views, streaming tables, and other listed types. Do not bypass policies by
  granting broad file access.
- Microsoft's Databricks connector page scopes that connector to AWS OAuth.
  Azure/GCP connector and authentication combinations must follow their
  current first-party requirements and pass Desktop/service/gateway tests.
- Cloud Fetch can require protected object-storage access in addition to the
  warehouse endpoint. Test large results as well as small queries.
- Power BI RLS applies to Viewers, not workspace Admins, Members, or Contributors.
  A report filter is not authorization.
- Snowflake documents no egress charge for client/driver query-result retrieval.
  Replication, unloads, storage access, cloud networks, and other transfer paths
  need their own billing review.

## 4. Design the estate

Power BI/Fabric is Microsoft SaaS, outside the customer's VNet/VPC. CAF applies
to the Azure platform foundation; extend the ownership model across AWS
accounts, GCP projects, data products, and BI service workspaces.

| Boundary | Accountable team | Evidence |
|---|---|---|
| Cloud platform | Cloud/network/identity | Region map, DNS, routes, TLS, policy |
| Data product | Data platform | Grain, source grants, watermarks, recovery |
| BI service | BI platform | Capacity/workspace map, identity, RLS, release |
| Consumption | Domain report owners | Thin reports, Viewer/Build access, data age |

Private source access requires a supported gateway design, not simply a private
endpoint. An Azure VNet data gateway needs eligible capacity, a supported region,
a dedicated delegated subnet, and actual source/storage connectivity.
Standard gateways need managed hosts, consistent versions, recovery-key
ownership, and a tested cluster design.

Direct Connect is not encrypted by default. Dedicated/private network
connectivity must be combined with the appropriate TLS/IPsec/MACsec design for
the actual route; assess GCP Interconnect and Azure network boundaries separately.

## 5. Prove the five pillars

| WAF pillar | Acceptance evidence |
|---|---|
| Reliability | Data-age alerts; failed refresh behavior; tested source/gateway recovery |
| Security | Source + semantic allowed/denied tests; identity lifecycle; approved movement |
| Cost optimization | Capacity + compute + billed transfer + storage + gateways + operations |
| Operational excellence | Versioned definitions; owners; environment mapping; rollback/runbooks |
| Performance efficiency | Actual grain, query plans, folding, p95, concurrency, peak refresh memory |

Use agreed targets, not generic promises. Capture cold and warm behavior, real
consumer identities, realistic report pages, and source/capacity telemetry.
Record the exact connector/driver, cloud, region, capacity, and model definition.

## First-party reference entry points

- [WAF](https://learn.microsoft.com/en-us/azure/well-architected/)
- [CAF landing-zone design areas](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/landing-zone/design-areas)
- [Managed self-service BI](https://learn.microsoft.com/en-us/power-bi/guidance/powerbi-implementation-planning-usage-scenario-managed-self-service-bi)
- [Snowflake connector](https://learn.microsoft.com/en-us/power-query/connectors/snowflake)
- [Snowflake Power BI SSO](https://docs.snowflake.com/en/user-guide/oauth-powerbi)
- [Databricks on AWS](https://docs.databricks.com/aws/en/partners/bi/power-bi/desktop)
- [Databricks on GCP](https://docs.databricks.com/gcp/en/partners/bi/power-bi/desktop)
- [Direct Lake](https://learn.microsoft.com/en-us/fabric/fundamentals/direct-lake-overview)
- [Full reference catalog](../data/sources.json)

Review date: 2026-10-26. No live tenant deployment, benchmark, or certification
was performed to author this guide.
