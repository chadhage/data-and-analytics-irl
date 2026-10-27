import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)),'..');
const local = path => join(root,...path.split('/'));
const json = async path => JSON.parse(await readFile(local(path),'utf8'));
const [catalog,frameworks,sources,scenarios,kits,assets] = await Promise.all([
  'data/catalog.json','data/frameworks.json','data/sources.json',
  'data/scenarios.json','data/kits.json','assets/manifest.json'
].map(json));
const sourceIds = new Set(sources.sources.map(item => item.id));
const patternIds = new Set(catalog.patterns.map(item => item.id));
const kitIds = new Set(kits.kits.map(item => item.id));
const controls = new Set(frameworks.pillars.flatMap(pillar => pillar.controls.map(control => control.id)));
const areas = new Set(frameworks.caf.map(area => area.id));
const assetFiles = new Set(assets.files.map(file => file.path));

test('catalog contains the declared patterns, scenarios, pillars, CAF areas, and starters',() => {
  assert.equal(catalog.patterns.length,16);
  assert.equal(catalog.antipatterns.length,8);
  assert.equal(scenarios.scenarios.length,6);
  assert.equal(frameworks.pillars.length,5);
  assert.equal(frameworks.caf.length,8);
  assert.equal(frameworks.readiness.length,10);
  assert.equal(kits.kits.length,5);
  assert.equal(patternIds.size,catalog.patterns.length);
  assert.equal(sourceIds.size,sources.sources.length);
  assert.equal(kitIds.size,kits.kits.length);
  assert.equal(new Set(catalog.patterns.map(item => item.code)).size,16);
});

test('every cited reference is a reviewed first-party HTTPS page',() => {
  const hosts = new Set(['learn.microsoft.com','docs.snowflake.com','docs.databricks.com','docs.aws.amazon.com','docs.cloud.google.com']);
  assert.match(sources.reviewedOn,/^\d{4}-\d{2}-\d{2}$/);
  assert.ok(sources.sources.length >= 30);
  for (const source of sources.sources) {
    const url = new URL(source.url);
    assert.equal(url.protocol,'https:');
    assert.ok(hosts.has(url.hostname),source.url);
    assert.ok(source.title && source.topic && source.vendor,source.id);
  }
  const items = [...catalog.patterns,...catalog.antipatterns,...scenarios.scenarios,...kits.kits,...frameworks.caf,...frameworks.pillars];
  for (const item of items) {
    assert.ok(item.references.length > 0,item.id);
    for (const id of item.references) assert.ok(sourceIds.has(id),`${item.id}: ${id}`);
  }
});

test('patterns wire every control, CAF area, asset, and starter reference',() => {
  for (const id of catalog.baselineControls) assert.ok(controls.has(id),id);
  for (const pattern of catalog.patterns) {
    assert.ok(['preferred','conditional'].includes(pattern.status),pattern.id);
    assert.ok(['import','results','replication','reference','depends'].includes(pattern.copyClass),pattern.id);
    assert.equal(typeof pattern.fabric,'boolean');
    assert.equal(pattern.flow.length,3);
    assert.ok(pattern.chooseWhen.length >= 2);
    assert.ok(pattern.constraints.length >= 3);
    assert.ok(pattern.steps.length >= 3);
    assert.ok(pattern.validate.length >= 3);
    assert.ok(pattern.movement && pattern.freshness && pattern.licensing);
    for (const area of pattern.caf) assert.ok(areas.has(area),`${pattern.id}: ${area}`);
    for (const kit of pattern.kits) assert.ok(kitIds.has(kit),`${pattern.id}: ${kit}`);
    for (const node of pattern.flow) assert.ok(assetFiles.has(`icons/${node.icon}`),node.icon);
    for (const pillar of Object.keys(pattern.focus)) assert.ok(frameworks.pillars.some(item => item.id === pillar),pillar);
    if (pattern.officialDiagram) assert.ok(assetFiles.has(`diagrams/${pattern.officialDiagram}`));
  }
  for (const item of [...catalog.antipatterns,...scenarios.scenarios]) {
    for (const id of item.patterns) assert.ok(patternIds.has(id),`${item.id}: ${id}`);
  }
  for (const item of frameworks.readiness) assert.ok(frameworks.pillars.some(pillar => pillar.id === item.pillar));
});

test('declared starter files exist, use safe relative URLs, and are nonempty',async () => {
  for (const kit of kits.kits) {
    assert.ok(kit.effect && kit.notIncluded && kit.command);
    assert.ok(kit.prerequisites.length >= 3);
    assert.ok(kit.checks.length >= 3);
    assert.ok(assetFiles.has(`icons/${kit.icon}`));
    for (const file of kit.files) {
      assert.match(file,/^examples\/[a-z0-9/_.-]+$/i);
      assert.ok(!file.split('/').includes('..'));
      const info = await stat(local(file));
      assert.ok(info.isFile() && info.size > 0,file);
    }
  }
});

test('official asset bytes match original-download SHA-256 digests',async () => {
  const collectionIds = new Set(assets.collections.map(collection => collection.id));
  const onDisk = (await Promise.all(['icons','diagrams'].map(async dir =>
    (await readdir(local(`assets/${dir}`))).map(file => `${dir}/${file}`)
  ))).flat().sort();
  assert.deepEqual([...assetFiles].sort(),onDisk);
  for (const item of assets.files) {
    assert.ok(collectionIds.has(item.collection),item.path);
    assert.match(item.sha256,/^[a-f0-9]{64}$/);
    const bytes = await readFile(local(`assets/${item.path}`));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256,item.path);
    if (item.path.endsWith('.svg')) {
      const svg = bytes.toString('utf8');
      assert.match(svg,/<svg[\s>]/i,item.path);
      assert.doesNotMatch(svg,/<html[\s>]|<script[\s>]/i,item.path);
    }
  }
});

test('component styles use theme variables; no custom icon artwork is embedded',async () => {
  const [css,html,app] = await Promise.all(['assets/styles.css','index.html','src/app.js'].map(file => readFile(local(file),'utf8')));
  assert.doesNotMatch(css,/#[a-f0-9]{3,8}\b|\brgba?\(|\bhsla?\(/i);
  assert.doesNotMatch(html,/<svg[\s>]/i);
  assert.doesNotMatch(app,/<svg[\s>]/i);
  assert.match(html,/clawpilotTheme/);
  assert.match(html,/<title>Data &amp; Analytics real-life scenarios \| Architecture field guide<\/title>/);
  assert.match(html,/aria-label="Data &amp; Analytics real-life scenarios home"/);
  assert.match(html,/DATA &amp; ANALYTICS<br>REAL-LIFE SCENARIOS/);
  assert.match(app,/const siteTitle = 'Data & Analytics real-life scenarios'/);
  assert.match(app,/<span class="accent">real-life scenarios<\/span>/);
  assert.match(app,/Power BI is one analytics consumption path/);
  assert.doesNotMatch(html + app,/Data (&|&amp;) Analytics across clouds|BI across clouds|Power BI across cloud estates/);
  assert.match(html,/class="button quiet menu-close"/);
  assert.match(css,/\.sidebar \.menu-close, \.menu-backdrop \{ display: none;/);
  assert.match(css,/\.sidebar \{ visibility: hidden;/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(css,/@media print/);
});

test('Databricks YAML parses and points at the actual unscheduled SQL file',async () => {
  const text = await readFile(local('examples/databricks/databricks.yml'),'utf8');
  const document = parseDocument(text,{uniqueKeys:true});
  assert.deepEqual(document.errors,[]);
  const bundle = document.toJS();
  const job = bundle.resources.jobs.publish_daily_sales;
  assert.equal(job.max_concurrent_runs,1);
  assert.equal(job.run_as.service_principal_name,'${var.run_as_principal}');
  assert.equal(job.schedule,undefined);
  const task = job.tasks[0].sql_task;
  assert.equal(task.warehouse_id,'${var.warehouse_id}');
  assert.equal(task.file.source,'WORKSPACE');
  const file = resolve(local('examples/databricks'),task.file.path);
  assert.ok((await stat(file)).isFile());
  const sql = await readFile(file,'utf8');
  assert.match(sql,/currency_code/);
  assert.match(sql,/CREATE OR REPLACE VIEW/);
  assert.match(sql,/source_row_count/);
});

test('workflow validates before publishing only main with scoped Pages permissions',async () => {
  const document = parseDocument(await readFile(local('.github/workflows/validate.yml'),'utf8'),{uniqueKeys:true});
  assert.deepEqual(document.errors,[]);
  const workflow = document.toJS();
  assert.equal(workflow.permissions.contents,'read');
  assert.equal(workflow.permissions.pages,undefined);
  assert.ok(Object.hasOwn(workflow.on,'push'));
  assert.ok(Object.hasOwn(workflow.on,'pull_request'));
  assert.ok(Object.hasOwn(workflow.on,'workflow_dispatch'));
  const commands = workflow.jobs.validate.steps.map(step => step.run ?? '').join('\n');
  assert.match(commands,/npm run check/);
  assert.match(commands,/npm run build/);
  assert.doesNotMatch(commands,/az deployment|terraform apply|bundle deploy|azd up/i);
  const gate = "github.ref == 'refs/heads/main' && github.event_name != 'pull_request'";
  const setup = workflow.jobs.validate.steps.find(step => step.uses === 'actions/configure-pages@v5');
  const upload = workflow.jobs.validate.steps.find(step => step.uses === 'actions/upload-pages-artifact@v4');
  assert.equal(setup?.if,gate);
  assert.equal(upload?.if,gate);
  assert.equal(upload.with.path,'dist');
  const deploy = workflow.jobs.deploy;
  assert.equal(deploy.if,gate);
  assert.equal(deploy.needs,'validate');
  assert.deepEqual(deploy.permissions,{'pages':'write','id-token':'write'});
  assert.equal(deploy.environment.name,'github-pages');
  assert.equal(deploy.environment.url,'${{ steps.deployment.outputs.page_url }}');
  assert.equal(deploy.concurrency.group,'github-pages');
  assert.equal(deploy.concurrency['cancel-in-progress'],false);
  assert.equal(deploy.steps.length,1);
  assert.equal(deploy.steps[0].uses,'actions/deploy-pages@v4');
  assert.equal(deploy.steps[0].id,'deployment');
});

test('site resource URLs remain relative for repository-scoped GitHub Pages hosting',async () => {
  const [html,app] = await Promise.all(['index.html','src/app.js'].map(file => readFile(local(file),'utf8')));
  const base = new URL('https://chadhage.github.io/data-across-clouds/');
  for (const [,reference] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const url = new URL(reference,base);
    if (url.origin === base.origin) assert.ok(url.pathname.startsWith(base.pathname),reference);
  }
  assert.doesNotMatch(app,/fetch\(\s*['"`]\//);
  assert.doesNotMatch(app,/\b(?:href|src)=["']\//);
});

test('incremental sample uses a half-open date/time range without transforming each source date',async () => {
  const m = await readFile(local('examples/powerbi/incremental-refresh.pq'),'utf8');
  assert.match(m,/\[OrderDateTime\] >= RangeStart and \[OrderDateTime\] < RangeEnd/);
  assert.doesNotMatch(m,/Date\.From|DateTime\.Date/);
});

test('documentation preserves source-policy, data-movement, and cost caveats',() => {
  const mirror = catalog.patterns.find(item => item.id === 'catalog-mirroring');
  assert.ok(mirror.constraints.some(value => /RLS\/column-mask/.test(value)));
  assert.deepEqual(mirror.clouds,['Azure']);
  const sf = catalog.patterns.find(item => item.id === 'snowflake-mirroring');
  assert.match(sf.freshness,/12-hour/);
  assert.match(sf.movement,/Iceberg/);
  assert.ok(catalog.antipatterns.some(item => item.id === 'zero-copy-claim'));
  assert.match(scenarios.disclaimer,/not benchmark results/);
  assert.match(kits.disclaimer,/No tenant or cloud resource was provisioned/);
  assert.equal(scenarios.scenarios.find(item => item.id === 'aws-finance').title,'Power BI with Snowflake on AWS');
});
