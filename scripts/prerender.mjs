// scripts/prerender.mjs

import { launch } from 'puppeteer';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const DIST = resolve(import.meta.dirname, '..', 'dist');
const PORT = 45678;

const ROUTES = [
  '/',
  '/about',
  '/enemies',
  '/credits',
  '/contact',
  '/tos',
  '/privacy',
  '/messages',
  '/levels',
];

function serve() {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.gif': 'image/gif',
    '.xml': 'application/xml',
    '.txt': 'text/plain',
  };

  return new Promise((res) => {
    const server = createServer((req, reply) => {
      const url = req.url.split('?')[0];
      const hasExtension = url.includes('.');
      let filePath = join(DIST, url);

      if (!hasExtension || !existsSync(filePath)) {
        filePath = join(DIST, 'index.html');
      }

      try {
        const data = readFileSync(filePath);
        const ext = '.' + filePath.split('.').pop();
        reply.writeHead(200, {
          'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        });
        reply.end(data);
      } catch {
        reply.writeHead(404);
        reply.end('Not Found');
      }
    });

    server.listen(PORT, () => {
      console.log(`[prerender] Serving dist on http://localhost:${PORT}`);
      res(server);
    });
  });
}

function fixRelativePaths(html, route) {
  const depth =
    route === '/' ? 0 : route.replace(/^\//, '').split('/').length;
  if (depth === 0) return html;
  const prefix = '../'.repeat(depth);
  return html.replaceAll(/\.\/(assets\/)/g, `${prefix}$1`);
}

async function prerender() {
  const server = await serve();

  const browser = await launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const route of ROUTES) {
    const url = `http://localhost:${PORT}${route}`;
    console.log(`[prerender] Rendering ${route} ...`);

    const page = await browser.newPage();

    await page.evaluateOnNewDocument(() => {
      window.__PRERENDER_INJECTED = true;
    });

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const reqUrl = req.url();
      if (reqUrl.startsWith(`http://localhost:${PORT}`)) {
        req.continue();
      } else {
        req.abort();
      }
    });

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 500));

    const html = await page.evaluate(() => {
      document.getElementById('splash-loader')?.remove();
      return document.documentElement.outerHTML;
    });
    await page.close();

    const fixedHtml = fixRelativePaths(html, route);

    const outDir =
      route === '/' ? DIST : join(DIST, route.replace(/^\//, ''));

    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }

    const outFile = join(outDir, 'index.html');
    writeFileSync(outFile, fixedHtml, 'utf-8');
    console.log(`[prerender] Wrote ${outFile}`);
  }

  await browser.close();
  server.close();
  console.log('[prerender] Done!');
}

prerender().catch((err) => {
  console.error('[prerender] Fatal error:', err);
  process.exit(1);
});
