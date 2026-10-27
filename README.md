# Data & Analytics real-life scenarios

Static, engineering-focused architecture field guide for data and analytics
across Azure, AWS, Google Cloud, and on-premises.

Initial coverage includes Snowflake, Databricks, data integration, governance,
and BI serving. Power BI with Snowflake on AWS is one worked scenario, not the
scope of the entire site. The decision guide starts with mixed sources across
multiple clouds; the existing BI-specific patterns and deployment starters remain.

## Published site

[Data & Analytics real-life scenarios](https://chadhage.github.io/data-across-clouds/)
is hosted on GitHub Pages. Assets, catalogs, and source downloads use relative
URLs so they work under the repository's `/data-across-clouds/` path. Browser
navigation uses hash routes; a deep link such as
[`#/patterns/snowflake-import`](https://chadhage.github.io/data-across-clouds/#/patterns/snowflake-import)
does not require a server-side rewrite.

The [publishing workflow](.github/workflows/validate.yml) validates and builds all
changes. Successful pushes to `main` and manual runs on `main` publish only the
generated static `dist` artifact. Pull requests and other branches do not deploy.
The deployment job uses the `github-pages` environment and narrowly scoped Pages
and OIDC permissions; no deployment token or cloud credentials are stored.

## Run

Requires Node.js 22 or later. There is no backend, account login, telemetry,
remote font, runtime CDN, or Azure/AWS/GCP resource provisioning.

```powershell
npm ci --ignore-scripts
npm run dev
```

Open **http://127.0.0.1:4173**. Use HTTP; directly opening
[index.html](index.html) as a filesystem file cannot load JSON/ES modules.
Set `$env:PORT = 4180` before the command if the default port is occupied.

## Included

- 16 architecture/estate patterns with movement, freshness, identity, license,
  implementation, validation, WAF, and CAF boundaries.
- Six explicitly hypothetical Contoso scenarios and eight anti-patterns.
- Search, platform/estate filters, three-way comparison, rule-based decision
  guidance, a Markdown decision-record export, and a JSON readiness worksheet.
- Five vendor-native starter kits: Azure Bicep/PowerShell, Snowflake SQL,
  Databricks YAML/SQL, Power Query M, and guarded Power BI REST/PowerShell.
- First-party references and unmodified official icons/diagrams with origins
  and SHA-256 digests in [the asset manifest](assets/manifest.json).
- Responsive light/dark views, keyboard navigation, code inspection/downloads,
  and print styles. Optional Fabric paths are clearly distinguished.

## Verify and build

```powershell
npm run check
npm run check:examples
npm run build
npm run preview
```

`check` validates JavaScript, decision behavior, catalog integrity, YAML,
asset digests, and local HTTP serving. `check:examples` requires PowerShell 7.2+
and Azure CLI/Bicep; it parses reference scripts, proves their `-WhatIf` paths,
and compiles Bicep. Azure CLI may install Bicep if it is missing. No Azure login
or resource provisioning is required for compilation.

`build` creates a deployable static [dist](dist) folder. It only replaces a
previous build bearing this project's marker. Host that output on an approved
static HTTP service; retain all files and case-sensitive paths. Browser routes
use hashes, so no SPA rewrite is needed. The local server supplies a CSP with
hashes for the theme bootstrap/variables; configure equivalent headers on a
production host that supports custom response headers. GitHub Pages does not
reproduce the local preview server's custom CSP/HTTP headers. Its hosting workflow
publishes static site files only; it never runs the example provisioning scripts.

The examples are not complete infrastructure, model, or report deployment
automation. Read [the starter runbook](examples/README.md) before executing
anything. Syntax checks are not tenant, authentication, network, license,
performance, or regulatory certification.

### Delivery verification

Checked on 2026-10-26:

- 25 automated tests, including 576 decision-input combinations, catalog links,
  YAML/deployment gates, project-relative URLs, original asset hashes, and HTTP behavior.
- PowerShell parsing and no-network `-WhatIf` paths; successful Bicep compilation.
- Desktop (1440 x 1000) and mobile (390 x 844) browser checks: all 16 pattern
  detail routes, 11 mobile views without page overflow, filters, comparisons,
  decision/worksheet export contents, source inspection, search, themes, and
  mobile menu focus/dismissal.

Not performed: cloud provisioning, source SQL execution, Databricks bundle
deployment, live Power BI refresh, or production workload benchmarking.

## Content maintenance

| File | Responsibility |
|---|---|
| [catalog.json](data/catalog.json) | Pattern/anti-pattern definitions and citations |
| [scenarios.json](data/scenarios.json) | Illustrative inputs and acceptance tests |
| [frameworks.json](data/frameworks.json) | WAF evidence, CAF ownership, readiness |
| [kits.json](data/kits.json) | Example contracts, files, effects, prerequisites |
| [sources.json](data/sources.json) | Official source index and review boundary |
| [decision.js](src/decision.js) | Deterministic, tested candidate-selection rules |
| [manifest.json](assets/manifest.json) | Official graphics, provenance, digests |

Documentation was reviewed on **2026-10-26**. Check linked limitations before each
implementation, especially Databricks cloud/auth connector scope, mirroring
eligibility/cadence, Direct Lake variants, gateway requirements, and licensing.
New pattern IDs must be wired into decision tests where relevant; run the
integrity tests after every catalog change.

The site contains original synthesis, not reproduced vendor documentation.
Vendor assets retain their original rights and usage terms. Their use is for
technical documentation, not site branding or endorsement.

See [the engineering guide](docs/engineering-guide.md) for the evaluation
sequence and [the decision template](docs/decision-record-template.md).
