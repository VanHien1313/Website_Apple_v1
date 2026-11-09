import express, { Router } from 'express';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

/** Deployment-owned bundle only. Media uploads stay in SQL and never reach this directory. */
export function frontendRouter(directory: string) {
  const root = resolve(directory), index = join(root, 'index.html');
  try {
    const marker = JSON.parse(readFileSync(join(root, 'aura-runtime.json'), 'utf8')) as { runtime?: string; version?: number };
    if (marker.runtime !== 'api' || marker.version !== 1 || !statSync(index).isFile()) throw new Error();
  } catch { throw new Error('Missing API frontend build. Run npm run build:api before enabling SERVE_FRONTEND.'); }
  const router = Router();
  // API/health misses must remain JSON 404, never the SPA shell (even with Accept: text/html).
  router.use((req, res, next) => {
    if (/^\/(api|health)(\/|$)/i.test(req.path)) { next('router'); return; }
    next();
  });
  router.use(express.static(root, { index: false, dotfiles: 'ignore', redirect: false, cacheControl: false }));
  router.use((req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method) || !req.accepts('html') || extname(req.path) || req.path.split('/').some((part) => part.startsWith('.'))) { next(); return; }
    res.sendFile(index, { cacheControl: false });
  });
  return router;
}
