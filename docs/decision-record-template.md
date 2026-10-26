# BI architecture decision record

Status: candidate / approved / rejected / superseded

| Input | Decision |
|---|---|
| Business owner / data product | |
| Source clouds, regions, and objects | |
| Required grain, measures, and history | |
| Freshness / p95 interaction / concurrency targets | |
| RTO / RPO | |
| Detail/result/cache/metadata/export movement approval | |
| Source identity / viewer identity / semantic policy | |
| Author/consumer/capacity licensing | |
| Gateway, DNS, TLS, source/result-storage route | |

## Options

| Candidate | Movement | Performance evidence | Cost | Constraint |
|---|---|---|---|---|
| | | | | |

## Selected architecture and rejected alternatives

Record the pattern IDs, rationale, explicit exceptions, and current official
connector/feature/region limitation references.

## Evidence required for approval

- [ ] Source totals/types and semantic measures reconciled.
- [ ] Allowed and denied source/Viewer/RLS/OLS/Build/export tests.
- [ ] Source-to-report freshness and schema-change tests.
- [ ] Cold/warm p95, expected concurrency, queues, and peak memory.
- [ ] Folding/partition pruning and aggregation/fallback behavior where relevant.
- [ ] Complete capacity/source/transfer/storage/gateway/operations cost model.
- [ ] Source, refresh, and gateway failure/recovery tests.
- [ ] Versioned definitions, environment mapping, owner, alerts, and rollback.

## Approval

Data owner:

Security / network:

BI platform / operations:

Date and evidence location:
