import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Local dev plugin: loads `api/*.js` Edge-style handlers and mounts them
 * as middleware so we don't need `vercel dev`. Each handler exports a
 * default async function (Request) => Response, the same shape as Vercel
 * Edge functions / Web standards.
 */
function edgeApiPlugin() {
  return {
    name: 'edge-api-dev',
    configureServer(server) {
      const apiDir = join(__dirname, 'api');
      let files = [];
      try {
        files = readdirSync(apiDir).filter((f) => f.endsWith('.js'));
      } catch {
        return;
      }

      // No caching — always re-import with a fresh timestamp so edits to api/*.js
      // are picked up immediately without restarting the dev server.
      async function loadHandler(file) {
        const url = pathToFileURL(join(apiDir, file)).href + `?t=${Date.now()}`;
        const mod = await import(/* @vite-ignore */ url);
        return mod.default;
      }

      // Build a route map: { "/api/buyer-chat": "buyer-chat.js" }
      const routes = new Map();
      for (const f of files) {
        const name = f.replace(/\.js$/, '');
        routes.set(`/api/${name}`, f);
      }

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];
        if (!url || !url.startsWith('/api/')) return next();
        const file = routes.get(url);
        if (!file) return next();

        try {
          const handler = await loadHandler(file);
          if (typeof handler !== 'function') {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: `No default export in api/${file}` }));
            return;
          }

          // Read body bytes
          const chunks = [];
          for await (const c of req) chunks.push(c);
          const body = chunks.length ? Buffer.concat(chunks) : undefined;

          // Convert headers
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) {
            if (!v) continue;
            headers.set(k, Array.isArray(v) ? v.join(',') : v);
          }

          const fullUrl = `http://${req.headers.host}${req.url}`;
          const webReq = new Request(fullUrl, {
            method: req.method,
            headers,
            body: body && req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
            duplex: 'half',
          });

          const webRes = await handler(webReq);
          res.statusCode = webRes.status;
          webRes.headers.forEach((v, k) => res.setHeader(k, v));

          if (webRes.body) {
            // Stream the Web ReadableStream to Node response
            const nodeStream = Readable.fromWeb(webRes.body);
            nodeStream.pipe(res);
          } else {
            res.end();
          }
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Dev middleware error', detail: String(err) }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load .env / .env.local into process.env for the dev edge handlers
  const env = loadEnv(mode, __dirname, '');
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] == null) process.env[k] = v;
  }

  return {
    plugins: [react(), edgeApiPlugin()],
  };
});
