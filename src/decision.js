const allowed = {
  provider: ['snowflake', 'databricks', 'mixed'],
  cloud: ['Azure', 'AWS', 'GCP', 'Multiple'],
  freshness: ['batch', 'minutes', 'latest'],
  copies: ['allowed', 'restricted']
};

export function validateDecision(input) {
  for (const [key, values] of Object.entries(allowed)) {
    if (!values.includes(input[key])) {
      throw new TypeError(`Select a supported ${key} value.`);
    }
  }
  for (const key of ['fabric', 'private', 'onprem']) {
    if (typeof input[key] !== 'boolean') {
      throw new TypeError(`${key} must be a boolean.`);
    }
  }
  return input;
}

export function filterPatterns(patterns, filters = {}) {
  const terms = (filters.query ?? '').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return patterns.filter(pattern => {
    if (filters.provider && filters.provider !== 'all' && !pattern.providers.includes(filters.provider)) return false;
    if (filters.cloud && filters.cloud !== 'all' && !pattern.clouds.includes(filters.cloud)) return false;
    if (filters.mode && filters.mode !== 'all' && pattern.mode !== filters.mode) return false;
    if (filters.status && filters.status !== 'all' && pattern.status !== filters.status) return false;
    const haystack = [
      pattern.code, pattern.title, pattern.summary, pattern.mode,
      ...pattern.providers, ...pattern.clouds, ...pattern.constraints
    ].join(' ').toLocaleLowerCase();
    return terms.every(term => haystack.includes(term));
  });
}

export function recommend(input) {
  validateDecision(input);
  const canCopy = input.copies === 'allowed';
  const cautions = [];
  let ids;
  let rationale;

  if (input.provider === 'mixed') {
    ids = canCopy
      ? ['curated-integration', 'cross-source-composite']
      : ['regional-estates', 'cross-source-composite'];
    rationale = canCopy
      ? 'Conform shared keys and grain upstream. Use cross-source compositing only for bounded, benchmarked extensions.'
      : 'No central detail copy is approved. Keep policy-scoped models; review any cross-source result movement before compositing.';
  } else if (!canCopy || input.freshness !== 'batch') {
    const direct = input.provider === 'snowflake' ? 'snowflake-directquery' : 'databricks-directquery';
    ids = canCopy ? [direct, 'hybrid-table'] : [direct, 'regional-estates'];
    rationale = !canCopy
      ? 'Evaluate query-time access without an imported detail replica. Query results, caches, exports, and metadata still need approval.'
      : 'Query-time detail is the initial candidate. A hybrid table can separate historical workload from the hot interval if its prerequisites are met.';
  } else {
    const imported = input.provider === 'snowflake' ? 'snowflake-import' : 'databricks-import';
    const alternative = input.fabric
      ? input.provider === 'snowflake'
        ? 'snowflake-mirroring'
        : input.cloud === 'Azure' ? 'catalog-mirroring' : 'delta-shortcuts'
      : 'aggregate-detail';
    ids = [imported, alternative];
    rationale = 'Scheduled freshness and approved copies make a curated incremental Import model the initial evaluation. Measure the modeled footprint, not the entire source estate.';
  }

  const overlays = ['shared-models'];
  if (input.private) overlays.push('private-connectivity');
  if (input.onprem) overlays.push('onprem-gateway');

  if (!canCopy) {
    cautions.push('DirectQuery is not a residency guarantee. Approve result, cache, export, and metadata destinations; some requirements can make a proposed BI experience infeasible.');
  }
  if (input.provider === 'databricks' && ['GCP', 'Multiple'].includes(input.cloud)) {
    cautions.push('Validate the cloud/authentication combination end-to-end. Microsoft scopes the Databricks connector to AWS OAuth; Databricks publishes separate GCP requirements. Do not assume the AWS OAuth recipe applies to GCP.');
  }
  if (input.fabric) {
    cautions.push('Direct Lake needs supported OneLake-accessible Delta tables and Fabric capacity; it is not a direct connector to an arbitrary Snowflake or Databricks SQL endpoint.');
  }
  if (input.private) {
    cautions.push('Private endpoints do not complete connectivity. Test gateway placement, DNS, routes, TLS, source authorization, and any result-storage path.');
  }
  if (input.freshness !== 'batch') {
    cautions.push('Query-time access does not set a report-refresh SLA. Measure source queues, caches, visual refresh, and actual data age.');
  }
  cautions.push('Confirm author/consumer licensing and capacity features. Candidate order is not a performance guarantee.');
  return { ids, overlays, rationale, cautions };
}

export function makeDecisionRecord({ input, result, patterns, sources, reviewedOn, date = new Date().toISOString().slice(0, 10) }) {
  validateDecision(input);
  const selected = [...result.ids, ...result.overlays].map(id => {
    const pattern = patterns.find(item => item.id === id);
    if (!pattern) throw new Error(`Unknown pattern in decision record: ${id}`);
    return pattern;
  });
  const references = [...new Set(selected.flatMap(item => item.references))].map(id => {
    const source = sources.find(item => item.id === id);
    if (!source) throw new Error(`Unknown reference in decision record: ${id}`);
    return `- [${source.vendor}: ${source.title}](${source.url})`;
  });
  return [
    '# BI architecture decision record',
    '', `Date: ${date}`, `Documentation reviewed: ${reviewedOn}`,
    '', 'Status: candidate evaluation; not an approved production design.',
    '', '## Inputs',
    ...Object.entries(input).map(([key, value]) => `- ${key}: ${value}`),
    '', '## Rationale', '', result.rationale,
    '', '## Candidates and enabling patterns',
    ...selected.map(item => `- ${item.code}: ${item.title} - ${item.movement}`),
    '', '## Required review', ...result.cautions.map(item => `- ${item}`),
    '', '## Acceptance evidence to record',
    '- Business owner and data-product contract:',
    '- Approved data/result/cache/metadata/export destinations:',
    '- Effective source identity; Viewer/RLS/OLS denied-access tests:',
    '- Freshness target and measured source-to-report p95:',
    '- Cold/warm visual p95 and expected peak concurrency:',
    '- Initial/incremental refresh memory, duration, and folding evidence:',
    '- Capacity, source compute, billed transfer, storage, gateway, and operations cost:',
    '- RTO/RPO, outage test, rollback, and named responder:',
    '- Licensing and current connector/region limitations:',
    '', '## Official references', ...references, ''
  ].join('\n');
}
