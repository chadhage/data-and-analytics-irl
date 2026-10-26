import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createSiteServer } from '../scripts/serve.mjs';

let server;
let base;
before(async () => {
  server = createSiteServer();
  await new Promise((resolve,reject) => {
    server.once('error',reject);
    server.listen(0,'127.0.0.1',resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });

test('serves HTML with a CSP matching every inline theme block',async () => {
  const response = await fetch(base);
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/text\/html/);
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  const csp = response.headers.get('content-security-policy');
  assert.match(csp,/frame-ancestors 'none'/);
  assert.doesNotMatch(csp,/unsafe-inline/);
  const html = await response.text();
  for (const expression of [/<script>([\s\S]*?)<\/script>/g,/<style>([\s\S]*?)<\/style>/g]) {
    for (const match of html.matchAll(expression)) {
      const hash = createHash('sha256').update(match[1].replace(/\r\n?/g,'\n')).digest('base64');
      assert.ok(csp.includes(`'sha256-${hash}'`));
    }
  }
});

test('serves modules, catalogs, official icons, and example source with expected types',async () => {
  for (const [path,type] of [
    ['/src/app.js','text/javascript'],['/data/catalog.json','application/json'],
    ['/assets/icons/power-bi.svg','image/svg+xml'],
    ['/examples/azure/main.bicep','text/plain'],['/examples/databricks/databricks.yml','text/plain']
  ]) {
    const response = await fetch(base + path);
    assert.equal(response.status,200,path);
    assert.ok(response.headers.get('content-type').startsWith(type),path);
    assert.ok((await response.arrayBuffer()).byteLength > 0,path);
  }
});

test('does not serve repository metadata, dependencies, build scripts, or unknown routes',async () => {
  for (const path of ['/.git/config','/node_modules/yaml/package.json','/package.json','/scripts/serve.mjs','/.github/workflows/validate.yml','/missing']) {
    assert.equal((await fetch(base + path)).status,404,path);
  }
});

test('rejects malformed paths and encoded Windows path separators',async () => {
  assert.equal((await fetch(base + '/%E0%A4%A')).status,400);
  assert.equal((await fetch(base + '/assets/%5c..%5c..%5c.git%5cconfig')).status,403);
});

test('HEAD returns no body and unsupported methods cannot mutate resources',async () => {
  const head = await fetch(base + '/data/catalog.json',{method:'HEAD'});
  assert.equal(head.status,200);
  assert.equal(await head.text(),'');
  const post = await fetch(base + '/index.html',{method:'POST',body:'no'});
  assert.equal(post.status,405);
  assert.equal(post.headers.get('allow'),'GET, HEAD');
});
