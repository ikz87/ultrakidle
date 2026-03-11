/**
 * Post-build pre-rendering script.
 *
 * Serves the built `dist/` folder, visits each static route with Puppeteer,
 * captures the fully-rendered HTML, and writes it back so crawlers see real
 * content instead of an empty <div id="root">.
 *
 * Works with `base: './'` — relative asset paths are left untouched because
 * each page's index.html lives at the route root (e.g. dist/about/index.html).
 */

import { launch } from 'puppeteer';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DIST = resolve(__dirname, '..', 'dist');

console.log(`[prerender] Starting...`);
console.log(`[prerender] __dirname: ${__dirname}`);
console.log(`[prerender] DIST: ${DIST}`);
const PORT = 45678;

// Routes to pre-render (static, no auth required)
const ROUTES = [
    '/',
    '/about',
    '/enemies',
    '/credits',
    '/contact',
    '/tos',
    '/privacy',
    '/messages',
];

/** Bare-bones static file server for the dist folder */
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
            let url = req.url.split('?')[0];

            // Try exact file, then index.html (SPA fallback)
            let filePath = join(DIST, url);
            if (!existsSync(filePath) || !filePath.includes('.')) {
                filePath = join(DIST, 'index.html');
            }

            try {
                const data = readFileSync(filePath);
                const ext = '.' + filePath.split('.').pop();
                reply.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
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

        // Suppress external network requests (Supabase, analytics, etc.)
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

        // Give animations a moment to settle
        await new Promise((r) => setTimeout(r, 500));

        const html = await page.content();
        await page.close();

        // Write to dist/<route>/index.html
        const outDir = route === '/'
            ? DIST
            : join(DIST, route.replace(/^\//, ''));

        if (!existsSync(outDir)) {
            mkdirSync(outDir, { recursive: true });
        }

        const outFile = join(outDir, 'index.html');
        writeFileSync(outFile, html, 'utf-8');
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
