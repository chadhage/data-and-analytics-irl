import { filterPatterns, recommend, makeDecisionRecord } from './decision.js';

const siteTitle = 'Data & Analytics real-life scenarios';
const app = document.querySelector('#app');
const main = document.querySelector('#main-content');
const compared = new Set();
const readiness = new Set();
const names = {
  overview: 'Overview', patterns: 'Pattern library', decision: 'Decision guide',
  'landing-zone': 'Landing zone', scenarios: 'Contoso scenarios',
  antipatterns: 'Anti-patterns', kits: 'Deployment starters', sources: 'Sources & method', search: 'Search'
};
let data;
let noticeTimer;
let fileCode = '';
let fileRequest = 0;
let decisionInput = { provider: 'mixed', cloud: 'Multiple', freshness: 'batch', copies: 'allowed', fabric: false, private: false, onprem: false };
let decisionResult = recommend(decisionInput);

const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const icon = (file, className = '') => `<img src="assets/icons/${escape(file)}" alt="" width="32" height="32" loading="lazy"${className ? ` class="${escape(className)}"` : ''}>`;
const patternById = id => data.catalog.patterns.find(pattern => pattern.id === id);
const kitById = id => data.kits.kits.find(kit => kit.id === id);
const sourceById = id => data.sources.sources.find(source => source.id === id);
const badge = pattern => `<span class="badge ${pattern.status}">${pattern.status === 'preferred' ? 'Preferred' : 'Conditional'}</span>`;
const tags = values => `<div class="tags">${values.map(value => `<span class="tag">${escape(value)}</span>`).join('')}</div>`;
const bullets = values => `<ul class="check-list">${values.map(value => `<li>${escape(value)}</li>`).join('')}</ul>`;
const printButton = '<button class="button" data-action="print">Print view</button>';

function heading(eyebrow, title, description, actions = '') {
  return `<div class="page-heading"><div><p class="eyebrow">${escape(eyebrow)}</p><h1>${escape(title)}</h1><p>${escape(description)}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ''}</div>`;
}

function references(ids, title = 'Official references') {
  const unique = [...new Set(ids)];
  return `<details><summary>${escape(title)} <span class="soft">/ ${unique.length}</span></summary><div class="details-body"><ul class="sources-list">${unique.map(id => {
    const source = sourceById(id);
    if (!source) throw new Error(`Missing source: ${id}`);
    return `<li><span class="source-vendor">${escape(source.vendor)}</span><a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a></li>`;
  }).join('')}</ul></div></details>`;
}

function miniFlow(pattern) {
  return `<div class="mini-flow" aria-hidden="true">${icon(pattern.flow[0].icon)}<span class="mini-line"></span><small>${escape(pattern.mode)}</small><span class="mini-line"></span>${icon('power-bi.svg')}</div>`;
}

function flow(pattern) {
  return `<figure class="flow-diagram"><div class="flow-nodes">${pattern.flow.map(node => `<div class="flow-node">${icon(node.icon)}<strong>${escape(node.label)}</strong><small>${escape(node.detail)}</small></div>`).join('')}</div><figcaption>Logical serving path. Validate identity, network, and data-movement boundaries separately.</figcaption></figure>`;
}

function officialDiagram(file, sourceId, title = 'View official Microsoft diagram') {
  const source = sourceById(sourceId);
  return `<details><summary>${escape(title)}</summary><div class="details-body"><figure class="official-figure"><a href="assets/diagrams/${escape(file)}" target="_blank" rel="noopener"><img src="assets/diagrams/${escape(file)}" alt="${escape(title)}; open the original graphic for full detail" loading="lazy"></a></figure><p class="figure-attribution">Microsoft graphic, unmodified. <a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">Source and context</a>. Open the image for full-size detail.</p></div></details>`;
}

function patternCard(pattern, compact = false) {
  return `<article class="card pattern-card">
    <div class="card-top"><span class="card-code">${escape(pattern.code)} / ${escape(pattern.mode)}</span>${badge(pattern)}</div>
    <h3>${escape(pattern.title)}</h3><p>${escape(pattern.summary)}</p>
    ${miniFlow(pattern)}
    ${compact ? '' : tags([...pattern.clouds, ...(pattern.fabric ? ['Fabric required'] : [])])}
    <div class="card-footer"><a class="text-link" href="#/patterns/${escape(pattern.id)}">View architecture</a><label class="compare-check"><input type="checkbox" data-compare="${escape(pattern.id)}"${compared.has(pattern.id) ? ' checked' : ''}>Compare</label></div>
  </article>`;
}

function scenarioInputs(scenario, detail = false) {
  return `<dl class="scenario-inputs${detail ? ' scenario-detail-inputs' : ''}">${scenario.inputs.map(input => `<div><dt>${escape(input.label)}</dt><dd>${escape(input.value)}</dd></div>`).join('')}</dl>`;
}

function scenarioCard(scenario) {
  return `<article class="card scenario-card"><div class="card-top"><span class="card-code">${escape(scenario.code)}</span><span class="badge">${escape(scenario.sector)}</span></div><h3>${escape(scenario.title)}</h3>${tags(scenario.clouds)}${scenarioInputs(scenario)}<p>${escape(scenario.decision)}</p><div class="card-footer"><a class="text-link" href="#/scenarios/${escape(scenario.id)}">Inspect the scenario</a><span class="small-label">ILLUSTRATIVE</span></div></article>`;
}

function pillarStrip() {
  return `<div class="pillar-strip">${data.frameworks.pillars.map(pillar => `<a class="pillar-link" href="#/landing-zone?pillar=${pillar.id}">${icon(pillar.icon)}<span>${escape(pillar.name)}</span></a>`).join('')}</div>`;
}

function overview() {
  return `
    <section class="hero">
      <div class="hero-copy"><p class="eyebrow">MULTICLOUD ARCHITECTURE / ENGINEERING FIELD GUIDE</p><h1>Data &amp; Analytics<br><span class="accent">real-life scenarios</span></h1>
        <p>Data platforms and analytics across Azure, AWS, Google Cloud, and on-premises. Snowflake and Databricks are the initial platforms; Power BI is one analytics consumption path.</p>
        <div class="hero-actions"><a class="button primary" href="#/decision">Evaluate a serving path</a><a class="button" href="#/patterns">Browse patterns</a></div>
        <div class="scope-note"><span class="status-dot"></span>First-party sources / WAF + CAF alignment</div>
      </div>
      <div class="architecture-canvas" aria-label="Current BI serving paths within the data and analytics estate">
        <div class="canvas-header"><strong>CURRENT BI SERVING PATHS</strong><span class="canvas-tag">source / serving / consumption</span></div>
        <div class="estate-map">
          <div class="map-column"><span class="map-label">SOURCE ESTATES</span>
            <div class="map-node">${icon('snowflake.png')}<div><strong>Snowflake</strong><small>Curated views / tables</small></div></div>
            <div class="map-node">${icon('databricks.png')}<div><strong>Databricks</strong><small>SQL / eligible Delta</small></div></div>
            <div class="map-node">${icon('sql-server.svg')}<div><strong>On-premises</strong><small>Supported gateway path</small></div></div>
          </div>
          <div class="map-column"><span class="map-label">SERVING CHOICES</span>
            <div class="mode-node"><strong>Import</strong><small>Copy a curated slice</small></div>
            <div class="mode-node"><strong>DirectQuery</strong><small>Query source detail</small></div>
            <div class="mode-node"><strong>Direct Lake</strong><small>Supported OneLake tables</small></div>
          </div>
          <div class="map-column"><span class="map-label">CONSUMPTION</span>
            <div class="map-node emphasis">${icon('semantic-model.svg')}<div><strong>Power BI model</strong><small>Measures + RLS / OLS</small></div></div>
            <div class="map-node">${icon('report.svg')}<div><strong>Thin reports</strong><small>Apps + governed self-service</small></div></div>
          </div>
        </div>
        <div class="cloud-strip"><span class="cloud-label">Azure</span><span class="cloud-label">AWS</span><span class="cloud-label">Google Cloud</span><span class="cloud-label">On-premises</span></div>
        <div class="canvas-controls"><span>IDENTITY</span><span>/</span><span>PRIVATE PATHS</span><span>/</span><span>DATA CONTRACTS</span><span>/</span><span>OBSERVABILITY</span></div>
      </div>
    </section>
    <div class="stats">
      <div class="stat"><span class="stat-value">${data.catalog.patterns.length}</span><div><span class="stat-label">Architecture patterns</span><span class="stat-note">Serving + estate design</span></div></div>
      <div class="stat"><span class="stat-value">${data.scenarios.scenarios.length}</span><div><span class="stat-label">Contoso scenarios</span><span class="stat-note">Illustrative design inputs</span></div></div>
      <div class="stat"><span class="stat-value">5</span><div><span class="stat-label">WAF pillars</span><span class="stat-note">Testable controls</span></div></div>
      <div class="stat"><span class="stat-value">${data.sources.sources.length}</span><div><span class="stat-label">Official references</span><span class="stat-note">Reviewed 26 Oct 2026</span></div></div>
    </div>
    <section><div class="section-header"><div><h2>Initial architecture patterns</h2><p>Data integration, governed data access, and BI consumption.</p></div><a class="text-link" href="#/patterns">All patterns</a></div>
      <div class="grid">${['curated-integration','catalog-mirroring','shared-models'].map(id => patternCard(patternById(id), true)).join('')}</div>
    </section>
    <section class="section decision-banner"><div><p class="eyebrow">EVALUATION ORDER</p><h2>Start with constraints.</h2><p>Then prove the selected path with the intended workload.</p></div><div class="decision-steps">
      <div class="decision-step"><span>01 / DEFINE</span><strong>Grain + freshness</strong><small>What must users see, and when?</small></div>
      <div class="decision-step"><span>02 / CONSTRAIN</span><strong>Identity + movement</strong><small>Which data may cross each boundary?</small></div>
      <div class="decision-step"><span>03 / MEASURE</span><strong>Latency + cost</strong><small>Cold/warm p95 at real concurrency.</small></div>
    </div></section>
    <section class="section"><div class="section-header"><div><h2>Landing-zone controls</h2><p>Map each architecture to evidence, an owner, and a recovery procedure.</p></div><a class="text-link" href="#/landing-zone">Control matrix</a></div>${pillarStrip()}</section>
    <section class="section"><div class="section-header"><div><h2>Work through a scenario</h2><p>Cross-cloud, hybrid, and source-specific examples.</p></div><a class="text-link" href="#/scenarios">All scenarios</a></div><div class="grid">${['merger-estate','hybrid-manufacturing','aws-finance'].map(id => scenarioCard(data.scenarios.scenarios.find(scenario => scenario.id === id))).join('')}</div></section>
    <div class="info-bar">For enterprise architects, data architects, BI developers, and citizen developers. <a href="#/sources">Independent synthesis; review the validation limits.</a></div>`;
}

function patternFilters(params) {
  const options = (values, selected, labels = {}) => values.map(value => `<option value="${escape(value)}"${value === selected ? ' selected' : ''}>${escape(labels[value] ?? value)}</option>`).join('');
  return `<form id="pattern-filters" class="filters" role="search" aria-label="Filter architecture patterns">
    <div class="field search-field"><label for="pattern-query">Search patterns</label><input id="pattern-query" name="query" type="search" value="${escape(params.get('query') ?? '')}" placeholder="RLS, incremental, gateway..." autocomplete="off"></div>
    <div class="field"><label for="provider-filter">Source platform</label><select id="provider-filter" name="provider">${options(['all','snowflake','databricks','onprem'], params.get('provider') ?? 'all', { all:'All platforms', snowflake:'Snowflake', databricks:'Databricks', onprem:'On-premises' })}</select></div>
    <div class="field"><label for="cloud-filter">Source estate</label><select id="cloud-filter" name="cloud">${options(['all','Azure','AWS','GCP','On-premises'], params.get('cloud') ?? 'all', { all:'All estates' })}</select></div>
    <div class="field"><label for="status-filter">Recommendation</label><select id="status-filter" name="status">${options(['all','preferred','conditional'], params.get('status') ?? 'all', { all:'All recommendations', preferred:'Preferred', conditional:'Conditional' })}</select></div>
    <button class="button" type="button" data-action="clear-filters">Reset</button>
  </form>`;
}

function patternLibrary(params) {
  const filters = Object.fromEntries(params.entries());
  const patterns = filterPatterns(data.catalog.patterns, filters);
  return `${heading('ARCHITECTURE CATALOG', 'Pattern library', 'Compare supported serving choices and estate patterns. Select two or three architectures to compare.', '<a class="button" href="data/catalog.json" download>Download catalog JSON</a>')}
    <div class="info-bar"><span><strong>Preferred</strong> = a useful starting point when its conditions hold. <strong>Conditional</strong> = an explicit trade-off and proof are required. Connectivity patterns complement, rather than replace, a storage mode.</span></div>
    ${patternFilters(params)}<div class="results-meta"><span id="pattern-results-count" role="status" aria-live="polite">${patterns.length} of ${data.catalog.patterns.length} patterns</span><a href="#/antipatterns">Inspect ${data.catalog.antipatterns.length} anti-patterns</a></div>
    <div class="grid" id="pattern-results">${patternResults(patterns)}</div>
    <section class="section"><div class="section-header"><div><h2>Storage-mode boundaries</h2><p>A live connection to a semantic model is a different layer from querying a warehouse.</p></div></div>${modeMatrix()}</section>`;
}

function patternResults(patterns) {
  return patterns.length ? patterns.map(pattern => patternCard(pattern)).join('') : '<div class="empty-state"><h2>No matching architecture</h2><p>Broaden the estate, platform, or search terms.</p><button class="button" data-action="clear-filters">Reset filters</button></div>';
}

function modeMatrix() {
  const rows = [
    ['Import','Selected rows copied into VertiPaq','Refresh completion','Curated batch reporting'],
    ['DirectQuery','Source results; caches can apply','Source query + report/cache behavior','Justified source-current detail'],
    ['Composite / Hybrid','Imported subsets plus queried detail','Multiple refresh/query boundaries','Aggregate acceleration or hot tail'],
    ['Direct Lake','Supported OneLake Delta tables; memory paging','Source propagation + framing','Approved Fabric lake serving'],
    ['Live connection','Existing model reused by report','Underlying model behavior','Shared measures and thin reports']
  ];
  return `<div class="table-wrap"><table><thead><tr><th scope="col">Choice</th><th scope="col">Data boundary</th><th scope="col">Freshness boundary</th><th scope="col">Typical evaluation</th></tr></thead><tbody>${rows.map(row => `<tr>${row.map((cell, index) => index === 0 ? `<th scope="row">${escape(cell)}</th>` : `<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${references(['ms-incremental','ms-dq','ms-composite','ms-directlake','ms-selfservice'])}`;
}

function patternDetail(id) {
  const pattern = patternById(id);
  if (!pattern) return notFound();
  const controls = data.catalog.baselineControls.map(controlId => {
    const pillar = data.frameworks.pillars.find(item => item.controls.some(control => control.id === controlId));
    const control = pillar.controls.find(item => item.id === controlId);
    return `<tr><th scope="row">${escape(pillar.name)}</th><td><a href="#/landing-zone?pillar=${pillar.id}">${escape(control.id)} / ${escape(control.title)}</a></td><td>${escape(pattern.focus[pillar.id] ?? control.evidence)}</td></tr>`;
  }).join('');
  return `<a class="back-link" href="#/patterns">Pattern library</a>
    <div class="detail-title"><span class="card-code">${pattern.code}</span><h1>${escape(pattern.title)}</h1>${badge(pattern)}</div>
    <p class="detail-intro">${escape(pattern.summary)}</p>${tags([...pattern.clouds, pattern.mode, ...(pattern.fabric ? ['Fabric capacity required'] : [])])}
    <div class="heading-actions">${printButton}<label class="button compare-check"><input type="checkbox" data-compare="${pattern.id}"${compared.has(pattern.id) ? ' checked' : ''}>Add to comparison</label></div>
    ${flow(pattern)}
    <dl class="property-grid"><div class="property"><dt>Data movement</dt><dd>${escape(pattern.movement)}</dd></div><div class="property"><dt>Freshness</dt><dd>${escape(pattern.freshness)}</dd></div><div class="property"><dt>Licensing / prerequisites</dt><dd>${escape(pattern.licensing)}</dd></div></dl>
    <div class="grid two"><section class="card"><h2>Use when</h2>${bullets(pattern.chooseWhen)}</section><section class="card"><h2>Constraints to resolve</h2>${bullets(pattern.constraints)}</section></div>
    <section class="section"><div class="section-header"><div><h2>Implementation sequence</h2><p>Each step needs an accountable owner.</p></div></div><div class="layer-stack">${pattern.steps.map((step, index) => `<div class="layer"><span class="layer-number">${String(index + 1).padStart(2, '0')}</span><h3>${['Contract','Configure','Model','Release'][index] ?? 'Verify'}</h3><p class="muted">${escape(step)}</p></div>`).join('')}</div></section>
    <section class="card"><h2>Acceptance evidence</h2>${bullets(pattern.validate)}</section>
    <section class="section"><div class="section-header"><div><h2>Well-Architected alignment</h2><p>Controls are evidence requirements, not a certification.</p></div></div><div class="table-wrap"><table><thead><tr><th scope="col">Pillar</th><th scope="col">Baseline control</th><th scope="col">Architecture-specific evidence</th></tr></thead><tbody>${controls}</tbody></table></div>
      <p class="figure-attribution">CAF design areas: ${pattern.caf.map(id => `<a href="#/landing-zone?section=caf">${escape(data.frameworks.caf.find(area => area.id === id).name)}</a>`).join(' / ')}</p>
    </section>
    ${pattern.kits.length ? `<section class="section"><h2>Related starter kits</h2><div class="grid">${pattern.kits.map(kitId => kitCard(kitById(kitId))).join('')}</div></section>` : '<div class="info-bar">This architecture is a decision pattern, not a one-command deployment. Use the official setup and limitation references below.</div>'}
    ${pattern.officialDiagram ? officialDiagram(pattern.officialDiagram, pattern.id === 'snowflake-mirroring' ? 'ms-sf-mirror' : 'ms-selfservice') : ''}
    ${references(pattern.references)}`;
}

function decisionPage() {
  const option = (value, label, selected) => `<option value="${value}"${value === selected ? ' selected' : ''}>${label}</option>`;
  return `${heading('CONSTRAINT-DRIVEN SELECTION', 'Decision guide', 'Produce candidates and an engineering decision record. This is a rule-based guide, not an automated architecture approval.')}
    <div class="decision-layout">
      <form class="card decision-form" id="decision-form"><h2>Workload inputs</h2>
        <div class="field"><label for="decision-provider">Primary data platform</label><select id="decision-provider" name="provider">${[['snowflake','Snowflake'],['databricks','Databricks'],['mixed','Mixed sources']].map(([value,label]) => option(value,label,decisionInput.provider)).join('')}</select></div>
        <div class="field"><label for="decision-cloud">Source cloud estate</label><select id="decision-cloud" name="cloud">${['Azure','AWS','GCP','Multiple'].map(value => option(value,value,decisionInput.cloud)).join('')}</select></div>
        <div class="field"><label for="decision-freshness">Freshness requirement</label><select id="decision-freshness" name="freshness">${[['batch','Scheduled / batch'],['minutes','Minutes / hot interval'],['latest','Query latest on interaction']].map(([value,label]) => option(value,label,decisionInput.freshness)).join('')}</select></div>
        <div class="field"><label for="decision-copies">New detail copies</label><select id="decision-copies" name="copies">${[['allowed','Approved curated copies'],['restricted','No new detail copy approved']].map(([value,label]) => option(value,label,decisionInput.copies)).join('')}</select></div>
        ${[['fabric','Include Fabric alternatives','Requires an approved capacity and eligible OneLake table path.'],['private','Private source access required','Gateway, DNS, routing, TLS, and result storage must work together.'],['onprem','On-premises sources are included','Add a supported, managed standard gateway path.']].map(([key,label,note]) => `<label class="toggle-field"><input type="checkbox" name="${key}"${decisionInput[key] ? ' checked' : ''}><span>${label}<small>${note}</small></span></label>`).join('')}
        <button class="button primary" type="submit">Evaluate candidates</button>
        <p class="muted form-notice"><small>No tenant access. No telemetry. No deployment.</small></p>
      </form>
      <div class="decision-result" id="decision-result">${decisionResults()}</div>
    </div>`;
}

function decisionResults() {
  return `<div class="result-heading"><h2>Candidate evaluation</h2><button class="button small" data-action="export-adr">Export decision .md</button></div><p class="rationale">${escape(decisionResult.rationale)}</p>
    ${decisionResult.ids.map((id, index) => {
      const pattern = patternById(id);
      return `<article class="card result-card"><div class="result-rank">${index === 0 ? '01 / INITIAL CANDIDATE' : '02 / ALTERNATIVE TO TEST'}</div><div class="card-top"><h3>${escape(pattern.title)}</h3>${badge(pattern)}</div>${miniFlow(pattern)}<p>${escape(pattern.summary)}</p><dl class="property-grid"><div class="property"><dt>Movement</dt><dd>${escape(pattern.movement)}</dd></div></dl><a class="text-link" href="#/patterns/${id}">Inspect prerequisites and tests</a></article>`;
    }).join('')}
    <section class="card"><h3>Enabling estate patterns</h3>${decisionResult.overlays.map(id => `<a class="overlay-link" href="#/patterns/${id}">${escape(patternById(id).code)} / ${escape(patternById(id).title)}</a>`).join('')}</section>
    <section class="card"><h3>Gates before approval</h3>${bullets(decisionResult.cautions)}</section>
    <p class="figure-attribution">Export reflects the last evaluated inputs. Record actual SLOs, licensing, cost, and access-test evidence before approval.</p>`;
}

function landingZone() {
  return `${heading('PLATFORM + DATA + BI', 'Well-Architected BI landing zone', 'Apply CAF to the cloud foundation, then define the SaaS, data-product, and report ownership boundaries.', `${printButton}<a class="button" href="#/landing-zone?section=assessment">Readiness worksheet</a>`)}
    <div class="info-bar"><span><strong>Power BI / Fabric is Microsoft SaaS.</strong> It is not deployed into a customer VNet or an AWS/GCP account. A gateway provides a supported data-access path; it does not move the SaaS control plane into that network.</span></div>
    <section><h2>Four ownership boundaries</h2><div class="layer-stack">${data.frameworks.boundaries.map((boundary, index) => `<article class="layer"><span class="layer-number">${String(index + 1).padStart(2,'0')}</span><div><h3>${escape(boundary.name)}</h3><small>${escape(boundary.owner)}</small></div><ul>${boundary.items.map(item => `<li>${escape(item)}</li>`).join('')}</ul></article>`).join('')}</div></section>
    <section class="section" id="caf"><div class="section-header"><div><h2>CAF design-area mapping</h2><p>Common controls, with separate cloud and BI service ownership.</p></div></div>
      <div class="table-wrap"><table><thead><tr><th scope="col">Design area</th><th scope="col">Accountable team</th><th scope="col">Required design artifact</th></tr></thead><tbody>${data.frameworks.caf.map(area => `<tr><th scope="row">${escape(area.name)}</th><td>${escape(area.owner)}</td><td>${escape(area.artifact)}</td></tr>`).join('')}</tbody></table></div>
      ${officialDiagram('azure-landing-zone.svg','ms-caf','View official Azure platform landing-zone reference')}
      <p class="figure-attribution">The official Azure diagram describes the Azure platform foundation, not a Power BI deployment inside that VNet.</p>
    </section>
    <section class="section"><div class="section-header"><div><h2>Five pillars, testable evidence</h2><p>Each control has an owner and an observable result.</p></div></div>${pillarStrip()}
      ${data.frameworks.pillars.map(pillar => `<article class="pillar-card" id="${pillar.id}"><div class="pillar-card-title">${icon(pillar.icon)}<div><h3>${escape(pillar.name)}</h3><p>${escape(pillar.question)}</p></div></div><div class="grid two">${pillar.controls.map(control => `<div class="property"><span class="card-code">${control.id}</span><h4>${escape(control.title)}</h4><p class="muted">${escape(control.evidence)}</p><small class="soft">Owner: ${escape(control.owner)}</small></div>`).join('')}</div><div class="metric-line">MEASURE / ${escape(pillar.metric)}</div>${references(pillar.references)}</article>`).join('')}
    </section>
    <section class="section card assessment" id="assessment"><div class="assessment-summary"><p class="eyebrow">ENGINEERING WORKSHEET</p><h2>Readiness evidence</h2><div class="assessment-score"><span id="readiness-score">${readiness.size}</span><span class="soft"> / ${data.frameworks.readiness.length}</span></div><progress id="readiness-progress" value="${readiness.size}" max="${data.frameworks.readiness.length}" aria-label="Readiness controls marked complete"></progress><p class="figure-attribution">A local checklist, not a compliance score. State stays in this tab; download evidence to retain it.</p><button class="button" data-action="export-readiness">Export worksheet JSON</button></div>
      <div class="readiness-list">${data.frameworks.readiness.map(item => `<label class="readiness-item"><input type="checkbox" data-readiness="${item.id}"${readiness.has(item.id) ? ' checked' : ''}><span>${escape(item.label)}</span></label>`).join('')}</div>
    </section>${references([...new Set(data.frameworks.caf.flatMap(area => area.references))], 'CAF and estate references')}`;
}

function scenariosPage() {
  return `${heading('ILLUSTRATIVE DESIGN EXERCISES', 'Contoso scenarios', 'Six cloud-estate situations, explicit constraints, and the evidence needed to select a serving path.')}
    <div class="info-bar warning">${escape(data.scenarios.disclaimer)}</div>
    <div class="grid">${data.scenarios.scenarios.map(scenarioCard).join('')}</div>`;
}

function scenarioDetail(id) {
  const scenario = data.scenarios.scenarios.find(item => item.id === id);
  if (!scenario) return notFound();
  return `<a class="back-link" href="#/scenarios">Contoso scenarios</a>${heading(`${scenario.code} / ${scenario.sector}`, scenario.title, scenario.decision, printButton)}
    <div class="info-bar warning">Hypothetical Contoso design exercise. These are workload inputs, not measured results or vendor SLAs.</div>${scenarioInputs(scenario, true)}
    ${flow(patternById(scenario.patterns[0]))}
    <section class="section"><h2>Patterns to evaluate together</h2><div class="grid">${scenario.patterns.map(id => patternCard(patternById(id), true)).join('')}</div></section>
    <section class="section grid two"><div class="card"><h2>Explicit trade-off</h2><p>${escape(scenario.tradeoff)}</p><div class="anti-pair"><small>AVOID</small><p>${escape(scenario.avoid)}</p></div></div><div class="card"><h2>Evidence before approval</h2>${bullets(scenario.tests)}</div></section>${references(scenario.references)}`;
}

function antipatternsPage() {
  return `${heading('FAILURE MODES TO DESIGN OUT', 'Anti-patterns', 'Recognize the symptom, identify the risk, and replace the behavior with a testable design.')}
    <div class="grid two anti-grid">${data.catalog.antipatterns.map((item, index) => `<article class="card" id="${item.id}"><div class="card-top"><span class="card-code">A${String(index + 1).padStart(2,'0')}</span><span class="badge avoid">Avoid</span></div><h3>${escape(item.title)}</h3><div class="anti-pair"><small>SYMPTOM</small><p>${escape(item.symptom)}</p></div><div class="anti-pair"><small>RISK</small><p>${escape(item.risk)}</p></div><div class="anti-pair"><small>INSTEAD</small><p>${escape(item.instead)}</p></div><div class="tags">${item.patterns.map(id => `<a class="badge" href="#/patterns/${id}">${escape(patternById(id).code)} / ${escape(patternById(id).mode)}</a>`).join('')}</div>${references(item.references)}</article>`).join('')}</div>`;
}

function kitCard(kit) {
  return `<article class="card kit-card"><div class="card-top">${icon(kit.icon,'kit-icon')}<span class="badge">${escape(kit.format)}</span></div><h3>${escape(kit.title)}</h3><p>${escape(kit.purpose)}</p><div class="card-footer"><a class="text-link" href="#/kits/${kit.id}">Inspect starter</a><span class="small-label">${kit.files.length} FILE${kit.files.length === 1 ? '' : 'S'}</span></div></article>`;
}

function kitsPage() {
  return `${heading('REVIEWABLE IMPLEMENTATION EXAMPLES', 'Deployment starters', 'Inspect source, prerequisites, side effects, and acceptance checks before using a vendor-native starter.', '<a class="button" href="examples/README.md" download>Download runbook .md</a>')}
    <div class="info-bar warning">${escape(data.kits.disclaimer)}</div><div class="grid">${data.kits.kits.map(kitCard).join('')}</div>
    <section class="section"><h2>What these examples do not deploy</h2><div class="grid two"><div class="card"><h3>Not a complete BI estate</h3>${bullets(['No Power BI tenant, capacity, semantic model, report, or source credentials.','No complete Azure landing zone, AWS/GCP estate, cross-cloud network, or production security policy.'])}</div><div class="card"><h3>Promotion remains an engineering gate</h3>${bullets(['Confirm permissions, current licensing/regions, and data movement approval.','Reconcile answers and test load, source outages, rollback, and actual consumer identities.'])}</div></div></section>`;
}

function kitDetail(id) {
  const kit = kitById(id);
  if (!kit) return notFound();
  return `<a class="back-link" href="#/kits">Deployment starters</a>${heading(`${kit.vendor} / ${kit.format}`, kit.title, kit.purpose, printButton)}
    <div class="info-bar warning">${escape(data.kits.disclaimer)}</div>
    <div class="grid two"><section class="card"><h2>Side effects</h2><p>${escape(kit.effect)}</p><h3>Not included</h3><p>${escape(kit.notIncluded)}</p></section><section class="card"><h2>Prerequisites</h2>${bullets(kit.prerequisites)}</section></div>
    <section class="section"><h2>Inspect and download</h2><div class="file-list">${kit.files.map(file => `<div class="file-row"><code>${escape(file)}</code><div><button class="button small" data-action="file" data-file="${escape(file)}">Inspect</button> <a class="button small" href="${escape(file)}" download>Download</a></div></div>`).join('')}</div>
      <p class="figure-attribution">Previewing and downloading execute nothing. Commands use placeholders and require review.</p>
      <pre class="code-block"><code>${escape(kit.command)}</code></pre>
    </section><section class="card"><h2>Acceptance and next actions</h2>${bullets(kit.checks)}<p class="figure-attribution"><a href="examples/README.md" target="_blank" rel="noopener">Full runbook, rollback notes, and source contracts</a></p></section>${references(kit.references)}`;
}

function sourceCard(source) {
  return `<article class="card source-card"><span class="small-label">${escape(source.vendor)}</span><h3><a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a></h3><p>${escape(source.topic)}</p><span class="source-domain">${escape(new URL(source.url).hostname)}</span></article>`;
}

function sourceMatches(query = '', vendor = 'all') {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return data.sources.sources.filter(source => (vendor === 'all' || source.vendor === vendor) && terms.every(term => `${source.title} ${source.topic} ${source.vendor}`.toLocaleLowerCase().includes(term)));
}

function sourcesPage(params) {
  const selectedVendor = params.get('vendor') ?? 'all';
  const query = params.get('query') ?? '';
  const sources = sourceMatches(query, selectedVendor);
  return `${heading('FIRST-PARTY EVIDENCE', 'Sources & methodology', 'Original summaries linked to Microsoft, Snowflake, Databricks, AWS, and Google Cloud documentation.', '<a class="button" href="data/sources.json" download>Download references JSON</a>')}
    <div class="grid two"><section class="card"><h2>Review boundary</h2>${bullets(data.sources.methodology.slice(0,3))}</section><section class="card"><h2>Use and maintenance</h2>${bullets(data.sources.methodology.slice(3))}<p class="figure-attribution">Documentation review: ${escape(data.sources.reviewedOn)}. No source-tenant deployment or performance certification is implied.</p></section></div>
    <section class="section"><div class="section-header"><div><h2>Reference index</h2><p>Open the vendor page for current requirements and limitations.</p></div></div>
      <form id="source-filters" class="filters" role="search" aria-label="Filter official references"><div class="field search-field"><label for="source-query">Search references</label><input id="source-query" name="query" type="search" placeholder="Connector, security, licensing..." value="${escape(query)}"></div><div class="field"><label for="source-vendor">Publisher</label><select id="source-vendor" name="vendor">${['all','Microsoft','Snowflake','Databricks','AWS','Google Cloud'].map(vendor => `<option value="${vendor}"${selectedVendor === vendor ? ' selected' : ''}>${vendor === 'all' ? 'All publishers' : vendor}</option>`).join('')}</select></div></form>
      <div class="results-meta"><span id="source-results-count" role="status" aria-live="polite">${sources.length} official references</span><span>Reviewed ${data.sources.reviewedOn}</span></div><div class="grid" id="source-results">${sources.length ? sources.map(sourceCard).join('') : '<p class="empty-state">No matching reference. Broaden the search or publisher.</p>'}</div>
    </section>
    <section class="section" id="assets"><div class="section-header"><div><h2>Official asset provenance</h2><p>Vendor-published icons and diagrams. No stock art, generated graphics, or third-party icon pack.</p></div></div>
      <div class="info-bar">Product icons retain original colors, shapes, and proportions. Engineering flows are composed from labeled boxes and official product icons; they are not vendor-certified reference architectures.</div>
      <div class="table-wrap"><table><thead><tr><th scope="col">Publisher</th><th scope="col">Official collection</th><th scope="col">Use</th></tr></thead><tbody>${data.assets.collections.map(collection => `<tr><th scope="row">${escape(collection.publisher)}</th><td><a href="${escape(collection.page)}" target="_blank" rel="noopener noreferrer">${escape(collection.name)}</a></td><td>${escape(collection.use)}</td></tr>`).join('')}</tbody></table></div>
      <p class="figure-attribution">Local copies are unmodified. <a href="assets/manifest.json" download>Download the asset manifest</a>. Product names and marks belong to their respective owners; use does not imply endorsement.</p>
    </section>`;
}

function searchPage(params) {
  const query = (params.get('q') ?? '').trim();
  if (!query) return `${heading('FIELD GUIDE SEARCH', 'Search', 'Enter a term in the search bar. Try incremental, Unity Catalog, RLS, or gateway.')}`;
  const terms = query.toLocaleLowerCase().split(/\s+/);
  const matches = text => terms.every(term => text.toLocaleLowerCase().includes(term));
  const groups = [
    { title:'Patterns', items:filterPatterns(data.catalog.patterns,{query}), label:item => `${item.code} / ${item.title}`, detail:item => item.summary, link:item => `#/patterns/${item.id}` },
    { title:'Scenarios', items:data.scenarios.scenarios.filter(item => matches(JSON.stringify(item))), label:item => `${item.code} / ${item.title}`, detail:item => item.decision, link:item => `#/scenarios/${item.id}` },
    { title:'Deployment starters', items:data.kits.kits.filter(item => matches(`${item.title} ${item.purpose} ${item.format}`)), label:item => item.title, detail:item => item.purpose, link:item => `#/kits/${item.id}` },
    { title:'Controls', items:data.frameworks.pillars.flatMap(pillar => pillar.controls.map(control => ({...control,pillar:pillar.id}))).filter(item => matches(`${item.id} ${item.title} ${item.evidence}`)), label:item => `${item.id} / ${item.title}`, detail:item => item.evidence, link:item => `#/landing-zone?pillar=${item.pillar}` },
    { title:'Official references', items:sourceMatches(query), label:item => `${item.vendor} / ${item.title}`, detail:item => item.topic, link:item => item.url }
  ];
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  return `${heading('FIELD GUIDE SEARCH', `Results for "${query}"`, `${total} matching items. Each group shows up to six results.`)}
    ${total ? groups.filter(group => group.items.length).map(group => `<section class="search-group"><h2>${group.title} <span class="soft">/ ${group.items.length}</span></h2>${group.items.slice(0,6).map(item => {
      const url = group.link(item);
      return `<a class="search-result" href="${escape(url)}"${url.startsWith('https:') ? ' target="_blank" rel="noopener noreferrer"' : ''}><strong>${escape(group.label(item))}</strong><span>${escape(group.detail(item))}</span></a>`;
    }).join('')}</section>`).join('') : '<div class="empty-state"><h2>No results</h2><p>Try a shorter technical term or browse the pattern library.</p><a class="button" href="#/patterns">Browse patterns</a></div>'}`;
}

function notFound() {
  return `${heading('UNRECOGNIZED ROUTE', 'Page not found', 'This architecture, scenario, or starter is not in the current catalog.', '<a class="button primary" href="#/overview">Return to overview</a>')}`;
}

function route() {
  const hash = location.hash.startsWith('#/') ? location.hash.slice(2) : 'overview';
  const [path, query = ''] = hash.split('?');
  const [page = 'overview', id] = path.split('/');
  return { page: page || 'overview', id, params: new URLSearchParams(query) };
}

function setMenu(open) {
  document.body.classList.toggle('menu-open',open);
  document.querySelector('.workspace').inert = open && matchMedia('(max-width: 760px)').matches;
  document.querySelectorAll('[data-action="menu"]').forEach(button => button.setAttribute('aria-expanded',String(open)));
}

function render() {
  const { page, id, params } = route();
  const views = {
    overview, patterns: () => id ? patternDetail(id) : patternLibrary(params),
    decision: decisionPage, 'landing-zone': landingZone,
    scenarios: () => id ? scenarioDetail(id) : scenariosPage(),
    antipatterns: antipatternsPage, kits: () => id ? kitDetail(id) : kitsPage(),
    sources: () => sourcesPage(params), search: () => searchPage(params)
  };
  app.innerHTML = (Object.hasOwn(views,page) ? views[page] : notFound)();
  app.setAttribute('aria-busy','false');
  document.querySelector('#breadcrumb-current').textContent = names[page] ?? 'Not found';
  document.title = `${names[page] ?? 'Not found'} | ${siteTitle}`;
  document.querySelectorAll('[data-nav]').forEach(link => {
    if (link.dataset.nav === page) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  setMenu(false);
  updateCompareTray();
  main.focus({ preventScroll:true });
  window.scrollTo({top:0,behavior:'auto'});
  const target = params.get('pillar') ?? params.get('section');
  if (target) requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({behavior:'auto',block:'start'}));
}

function notice(message, tone = 'info') {
  const element = document.querySelector('#notice');
  element.textContent = message;
  element.dataset.tone = tone;
  element.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { element.hidden = true; }, 6500);
}

function updateCompareTray() {
  document.querySelector('#compare-tray').hidden = compared.size === 0;
  document.querySelector('#compare-summary').textContent = `${compared.size} of 3 patterns selected`;
  document.querySelector('[data-action="compare"]').disabled = compared.size < 2;
  document.querySelectorAll('[data-compare]').forEach(input => { input.checked = compared.has(input.dataset.compare); });
}

function showComparison() {
  if (compared.size < 2) throw new Error('Select at least two patterns to compare.');
  const patterns = [...compared].map(patternById);
  const rows = [
    ['Mode', item => item.mode], ['Recommendation', item => item.status],
    ['Source estates', item => item.clouds.join(' / ')], ['Data movement', item => item.movement],
    ['Freshness', item => item.freshness], ['Licensing', item => item.licensing],
    ['Constraint to resolve', item => item.constraints[0]]
  ];
  document.querySelector('#compare-content').innerHTML = `<div class="table-wrap"><table><thead><tr><th scope="col">Design dimension</th>${patterns.map(item => `<th scope="col"><a href="#/patterns/${item.id}" data-action="compare-link">${escape(item.code)} / ${escape(item.title)}</a></th>`).join('')}</tr></thead><tbody>${rows.map(([label,value]) => `<tr><th scope="row" class="row-label">${escape(label)}</th>${patterns.map(item => `<td>${escape(value(item))}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="figure-attribution">Compare prerequisites and workload evidence, not product promises.</p>`;
  document.querySelector('#compare-dialog').showModal();
}

function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text],{type}));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function showFile(path) {
  const allowedFiles = data.kits.kits.flatMap(kit => kit.files);
  if (!allowedFiles.includes(path)) throw new Error('This file is not an approved starter-kit entry.');
  const request = ++fileRequest;
  const dialog = document.querySelector('#file-dialog');
  document.querySelector('#file-title').textContent = path;
  document.querySelector('#file-code').textContent = 'Loading source...';
  document.querySelector('#file-download').href = path;
  document.querySelector('#file-description').textContent = 'Review before running. This preview executes nothing.';
  document.querySelector('[data-action="copy-file"]').disabled = true;
  fileCode = '';
  if (!dialog.open) dialog.showModal();
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Source file request failed (${response.status}).`);
    const text = await response.text();
    if (request !== fileRequest || !dialog.open) return;
    fileCode = text;
    document.querySelector('#file-code').textContent = text;
    document.querySelector('[data-action="copy-file"]').disabled = false;
  } catch (error) {
    if (request !== fileRequest || !dialog.open) return;
    document.querySelector('#file-code').textContent = `Unable to load source: ${error.message}`;
    notice('File preview failed. Check the local server and use the direct download if available.','error');
  }
}

function applyFilters(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  const params = new URLSearchParams();
  for (const [key,value] of Object.entries(values)) if (value && value !== 'all') params.set(key,value);
  if (form.id === 'pattern-filters') {
    const patterns = filterPatterns(data.catalog.patterns, values);
    document.querySelector('#pattern-results').innerHTML = patternResults(patterns);
    document.querySelector('#pattern-results-count').textContent = `${patterns.length} of ${data.catalog.patterns.length} patterns`;
    history.replaceState(null,'',`#/patterns${params.size ? `?${params}` : ''}`);
    updateCompareTray();
  } else {
    const sources = sourceMatches(values.query, values.vendor);
    document.querySelector('#source-results').innerHTML = sources.length ? sources.map(sourceCard).join('') : '<p class="empty-state">No matching reference. Broaden the search or publisher.</p>';
    document.querySelector('#source-results-count').textContent = `${sources.length} official references`;
    history.replaceState(null,'',`#/sources${params.size ? `?${params}` : ''}`);
  }
}

function syncThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  const button = document.querySelector('#theme-button');
  button.textContent = dark ? 'Light' : 'Dark';
  button.setAttribute('aria-label',`Switch to ${dark ? 'light' : 'dark'} theme`);
}

async function action(button) {
  switch (button.dataset.action) {
    case 'menu': {
      const open = !document.body.classList.contains('menu-open');
      setMenu(open);
      document.querySelector(open ? '.menu-close' : '.menu-button').focus();
      break;
    }
    case 'theme': {
      const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = theme;
      const url = new URL(location.href);
      url.searchParams.set('clawpilotTheme',theme);
      history.replaceState(null,'',url);
      syncThemeButton();
      break;
    }
    case 'print': window.print(); break;
    case 'compare': showComparison(); break;
    case 'clear-compare': compared.clear(); updateCompareTray(); break;
    case 'close-dialog': button.closest('dialog').close(); break;
    case 'compare-link': button.closest('dialog').close(); break;
    case 'clear-filters': {
      const form = document.querySelector('#pattern-filters');
      form.querySelector('input').value = '';
      form.querySelectorAll('select').forEach(select => { select.value = 'all'; });
      applyFilters(form);
      break;
    }
    case 'file': await showFile(button.dataset.file); break;
    case 'copy-file':
      if (!fileCode) throw new Error('No source has been loaded to copy.');
      if (!navigator.clipboard) throw new Error('Clipboard access is unavailable. Select the source text and copy it manually.');
      await navigator.clipboard.writeText(fileCode);
      notice('Source copied. Review placeholders and side effects before running.');
      break;
    case 'export-adr':
      download('bi-architecture-decision.md',makeDecisionRecord({input:decisionInput,result:decisionResult,patterns:data.catalog.patterns,sources:data.sources.sources,reviewedOn:data.sources.reviewedOn}),'text/markdown;charset=utf-8');
      notice('Decision-record download requested for the last evaluated inputs.');
      break;
    case 'export-readiness':
      download('bi-readiness-worksheet.json',JSON.stringify({
        generatedAt:new Date().toISOString(), documentationReviewedOn:data.sources.reviewedOn,
        disclaimer:'Self-recorded evidence checklist; not certification or automatic approval.',
        controls:data.frameworks.readiness.map(item => ({...item,markedComplete:readiness.has(item.id),evidence:''}))
      },null,2),'application/json');
      notice('Worksheet download requested. Add actual evidence before approval.');
      break;
    case 'retry': location.reload(); break;
    default: throw new Error('Unsupported field-guide action.');
  }
}

function bindEvents() {
  document.addEventListener('click', event => {
    if (event.target.closest('.skip-link')) {
      event.preventDefault();
      setMenu(false);
      main.focus();
      main.scrollIntoView();
      return;
    }
    const button = event.target.closest('[data-action]');
    if (button) action(button).catch(error => { console.error(error); notice(error.message,'error'); });
  });
  document.addEventListener('change', event => {
    if (event.target.matches('[data-compare]')) {
      const input = event.target;
      if (input.checked && compared.size >= 3) {
        input.checked = false;
        notice('Compare up to three patterns. Clear one selection first.','error');
        return;
      }
      if (input.checked) compared.add(input.dataset.compare);
      else compared.delete(input.dataset.compare);
      updateCompareTray();
    }
    if (event.target.matches('[data-readiness]')) {
      if (event.target.checked) readiness.add(event.target.dataset.readiness);
      else readiness.delete(event.target.dataset.readiness);
      document.querySelector('#readiness-score').textContent = String(readiness.size);
      document.querySelector('#readiness-progress').value = readiness.size;
    }
    const form = event.target.closest('#pattern-filters, #source-filters');
    if (form && event.target.tagName === 'SELECT') applyFilters(form);
  });
  document.addEventListener('input', event => {
    const form = event.target.closest('#pattern-filters, #source-filters');
    if (form && event.target.matches('input')) applyFilters(form);
  });
  document.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.target;
    if (form.id === 'global-search') {
      location.hash = `#/search?q=${encodeURIComponent(new FormData(form).get('q') ?? '')}`;
    } else if (form.id === 'decision-form') {
      const values = new FormData(form);
      const input = {
        provider:values.get('provider'), cloud:values.get('cloud'),
        freshness:values.get('freshness'), copies:values.get('copies'),
        fabric:values.has('fabric'), private:values.has('private'), onprem:values.has('onprem')
      };
      try {
        const result = recommend(input);
        decisionInput = input;
        decisionResult = result;
        document.querySelector('#decision-result').innerHTML = decisionResults();
        notice('Candidates updated. Review the approval gates.');
      } catch (error) {
        notice(`Evaluation failed: ${error.message}`,'error');
      }
    } else if (form.id === 'pattern-filters' || form.id === 'source-filters') applyFilters(form);
  });
  document.addEventListener('keydown', event => {
    if (document.body.classList.contains('menu-open')) {
      if (event.key === 'Escape') {
        setMenu(false);
        document.querySelector('.menu-button').focus();
      } else if (event.key === 'Tab') {
        const items = [...document.querySelectorAll('.sidebar a, .sidebar button')].filter(item => item.getClientRects().length && getComputedStyle(item).visibility !== 'hidden');
        const first = items[0];
        const last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      return;
    }
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.closest('input, textarea, select, [contenteditable="true"]') && !document.querySelector('dialog[open]')) {
      event.preventDefault();
      document.querySelector('#global-query').focus();
    }
  });
  matchMedia('(max-width: 760px)').addEventListener('change',() => setMenu(false));
  window.addEventListener('hashchange', () => {
    try { render(); } catch (error) { showFailure(error); }
  });
}

function showFailure(error) {
  console.error(error);
  app.setAttribute('aria-busy','false');
  app.innerHTML = `<section class="card error-panel"><p class="eyebrow">LOAD ERROR</p><h1>The guide could not be loaded.</h1><p>${escape(error.message)}</p><p>Run the local HTTP server; opening the HTML directly from the filesystem does not support JSON/module requests.</p><button class="button primary" data-action="retry">Retry</button><p class="figure-attribution"><a href="docs/engineering-guide.md">Engineering guide</a> / <a href="examples/README.md">Starter runbook</a></p></section>`;
}

async function readJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}.`);
  return response.json();
}

async function boot() {
  bindEvents();
  syncThemeButton();
  const [catalog,frameworks,sources,scenarios,kits,assets] = await Promise.all([
    'data/catalog.json','data/frameworks.json','data/sources.json','data/scenarios.json','data/kits.json','assets/manifest.json'
  ].map(readJson));
  if (!Array.isArray(catalog.patterns) || !Array.isArray(frameworks.pillars) || !Array.isArray(sources.sources) || !Array.isArray(scenarios.scenarios) || !Array.isArray(kits.kits) || !Array.isArray(assets.collections)) {
    throw new Error('A field-guide data file has an unsupported shape.');
  }
  data = {catalog,frameworks,sources,scenarios,kits,assets};
  document.querySelector('#pattern-count').textContent = String(catalog.patterns.length);
  if (!location.hash || location.hash === '#/') history.replaceState(null,'',`${location.pathname}${location.search}#/overview`);
  render();
}

boot().catch(showFailure);
