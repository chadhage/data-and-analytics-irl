import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDirectories = new Set(['assets', 'src', 'data', 'examples', 'docs']);
const publicFiles = new Set(['index.html', 'README.md']);
const types = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml', '.png':'image/png', '.md':'text/plain; charset=utf-8',
  '.yml':'text/plain; charset=utf-8', '.yaml':'text/plain; charset=utf-8',
  '.sql':'text/plain; charset=utf-8', '.ps1':'text/plain; charset=utf-8',
  '.bicep':'text/plain; charset=utf-8', '.pq':'text/plain; charset=utf-8'
};

function within(root, path) {
  const rel = relative(root,path);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function contentPolicy(root) {
  const html = readFileSync(join(root,'index.html'),'utf8');
  const hashes = expression => [...html.matchAll(expression)].map(match =>
    `'sha256-${createHash('sha256').update(match[1].replace(/\r\n?/g,'\n')).digest('base64')}'`
  ).join(' ');
  return `default-src 'self'; script-src 'self' ${hashes(/<script>([\s\S]*?)<\/script>/g)}; style-src 'self' ${hashes(/<style>([\s\S]*?)<\/style>/g)}; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`;
}

export function createSiteServer({ root = projectRoot } = {}) {
  const absoluteRoot = resolve(root);
  const policy = contentPolicy(absoluteRoot);
  return createServer(async (request,response) => {
    response.setHeader('X-Content-Type-Options','nosniff');
    response.setHeader('Referrer-Policy','no-referrer');
    response.setHeader('Content-Security-Policy',policy);
    response.setHeader('Cross-Origin-Opener-Policy','same-origin');
    response.setHeader('Cache-Control','no-cache');
    if (!['GET','HEAD'].includes(request.method)) {
      response.writeHead(405,{'Allow':'GET, HEAD'});
      response.end('Method not allowed.');
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    } catch {
      response.writeHead(400);
      response.end('Invalid request path.');
      return;
    }
    if (pathname.includes('\\') || pathname.includes('\0')) {
      response.writeHead(403);
      response.end('Path is not permitted.');
      return;
    }
    const segments = pathname.split('/').filter(Boolean);
    if (!segments.length) segments.push('index.html');
    const path = resolve(absoluteRoot,...segments);
    const extension = extname(path);
    if (segments.includes('..') || !within(absoluteRoot,path) || !types[extension] ||
        !(publicDirectories.has(segments[0]) || (segments.length === 1 && publicFiles.has(segments[0])))) {
      response.writeHead(404);
      response.end('Not found.');
      return;
    }
    try {
      const actual = await realpath(path);
      if (!within(await realpath(absoluteRoot),actual)) {
        response.writeHead(403);
        response.end('Path is not permitted.');
        return;
      }
      const info = await stat(actual);
      if (!info.isFile()) {
        response.writeHead(404);
        response.end('Not found.');
        return;
      }
      const content = await readFile(actual);
      response.writeHead(200,{'Content-Type':types[extension],'Content-Length':content.length});
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch (error) {
      if (['ENOENT','ENOTDIR','EISDIR'].includes(error.code)) {
        response.writeHead(404);
        response.end('Not found.');
      } else {
        console.error(`Static file request failed: ${error.message}`);
        response.writeHead(500);
        response.end('The static file could not be read.');
      }
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT ?? 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 through 65535.');
  const root = process.argv.includes('--dist') ? join(projectRoot,'dist') : projectRoot;
  const server = createSiteServer({root});
  server.on('error',error => {
    console.error(`Could not start the preview server: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port,'127.0.0.1',() => {
    console.log(`Data & Analytics real-life scenarios: http://127.0.0.1:${port}`);
    console.log(`Serving ${process.argv.includes('--dist') ? 'the production dist build' : 'the static source site'}; no cloud calls or telemetry.`);
  });
  for (const signal of ['SIGINT','SIGTERM']) process.once(signal,() => server.close());
}
