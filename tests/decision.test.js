import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { filterPatterns, recommend, makeDecisionRecord, validateDecision } from '../src/decision.js';

const catalog = JSON.parse(await readFile(new URL('../data/catalog.json',import.meta.url)));
const sources = JSON.parse(await readFile(new URL('../data/sources.json',import.meta.url)));
const defaults = {provider:'snowflake',cloud:'AWS',freshness:'batch',copies:'allowed',fabric:false,private:false,onprem:false};

test('scheduled approved slices start with curated Import',() => {
  assert.equal(recommend(defaults).ids[0],'snowflake-import');
  assert.equal(recommend({...defaults,provider:'databricks'}).ids[0],'databricks-import');
});

test('query-time freshness starts with a source-current candidate, not a guaranteed SLA',() => {
  for (const freshness of ['minutes','latest']) {
    const result = recommend({...defaults,freshness});
    assert.equal(result.ids[0],'snowflake-directquery');
    assert.ok(result.ids.includes('hybrid-table'));
    assert.ok(result.cautions.some(value => /not set a report-refresh SLA/.test(value)));
  }
});

test('no-copy inputs do not recommend an imported or replicated primary candidate',() => {
  for (const provider of ['snowflake','databricks','mixed']) {
    const result = recommend({...defaults,provider,copies:'restricted',fabric:true});
    for (const id of result.ids) {
      assert.ok(!['import','replication'].includes(catalog.patterns.find(item => item.id === id).copyClass),id);
    }
    assert.ok(result.cautions.some(value => /residency guarantee/.test(value)));
  }
});

test('Fabric paths are explicit alternatives; catalog mirroring remains Azure-specific',() => {
  assert.equal(recommend({...defaults,fabric:true}).ids[1],'snowflake-mirroring');
  assert.equal(recommend({...defaults,provider:'databricks',cloud:'Azure',fabric:true}).ids[1],'catalog-mirroring');
  for (const cloud of ['AWS','GCP','Multiple']) {
    assert.equal(recommend({...defaults,provider:'databricks',cloud,fabric:true}).ids[1],'delta-shortcuts');
  }
});

test('GCP identity and private/on-premises paths add explicit cautions and overlays',() => {
  const result = recommend({...defaults,provider:'databricks',cloud:'GCP',private:true,onprem:true});
  assert.ok(result.cautions.some(value => /GCP requirements/.test(value)));
  assert.ok(result.cautions.some(value => /result-storage/.test(value)));
  assert.deepEqual(result.overlays,['shared-models','private-connectivity','onprem-gateway']);
});

test('all supported input combinations return existing, compatible patterns',() => {
  for (const provider of ['snowflake','databricks','mixed'])
  for (const cloud of ['Azure','AWS','GCP','Multiple'])
  for (const freshness of ['batch','minutes','latest'])
  for (const copies of ['allowed','restricted'])
  for (const fabric of [false,true])
  for (const privateAccess of [false,true])
  for (const onprem of [false,true]) {
    const result = recommend({provider,cloud,freshness,copies,fabric,private:privateAccess,onprem});
    assert.equal(result.ids.length,2);
    assert.equal(new Set([...result.ids,...result.overlays]).size,result.ids.length + result.overlays.length);
    for (const id of [...result.ids,...result.overlays]) {
      const pattern = catalog.patterns.find(item => item.id === id);
      assert.ok(pattern,id);
      if (!fabric) assert.equal(pattern.fabric,false,id);
      if (copies === 'restricted' && result.ids.includes(id)) {
        assert.ok(!['import','replication'].includes(pattern.copyClass),id);
      }
    }
  }
});

test('invalid inputs fail explicitly instead of generating plausible defaults',() => {
  assert.throws(() => recommend({...defaults,provider:'unknown'}),/provider/);
  assert.throws(() => recommend({...defaults,cloud:'On-premises'}),/cloud/);
  assert.throws(() => recommend({...defaults,fabric:'true'}),/boolean/);
  assert.throws(() => validateDecision({}),/provider/);
});

test('pattern filters combine source, cloud, status, and all search terms',() => {
  const result = filterPatterns(catalog.patterns,{provider:'snowflake',cloud:'AWS',status:'preferred',query:'curated import'});
  assert.ok(result.some(item => item.id === 'snowflake-import'));
  assert.ok(result.every(item => item.providers.includes('snowflake') && item.clouds.includes('AWS') && item.status === 'preferred'));
  assert.equal(filterPatterns(catalog.patterns,{query:'nonexistent-technical-term'}).length,0);
  assert.equal(filterPatterns(catalog.patterns,{}).length,16);
});

test('decision record exports the evaluated inputs, actual candidates, and official citations',() => {
  const result = recommend(defaults);
  const record = makeDecisionRecord({input:defaults,result,patterns:catalog.patterns,sources:sources.sources,reviewedOn:sources.reviewedOn,date:'2026-10-26'});
  assert.match(record,/# BI architecture decision record/);
  assert.match(record,/Date: 2026-10-26/);
  assert.match(record,/provider: snowflake/);
  assert.match(record,/P01: Snowflake curated Import/);
  assert.match(record,/https:\/\/docs\.snowflake\.com/);
  assert.match(record,/not an approved production design/);
  assert.throws(() => makeDecisionRecord({input:defaults,result:{...result,ids:['missing']},patterns:catalog.patterns,sources:sources.sources,reviewedOn:sources.reviewedOn}),/Unknown pattern/);
});
