import type { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

// Vite puts content-hashed files under /assets, so their URL changes whenever their content does.
export function cacheControlFor(urlPath: string): string | undefined {
  return urlPath.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : undefined;
}

export function pickEncoding(acceptEncoding: string | undefined): { encoding: 'br' | 'gzip'; suffix: '.br' | '.gz' } | null {
  const header = (acceptEncoding ?? '').toLowerCase();
  const accepts = (name: string) =>
    header.split(',').some((part) => {
      const [token, ...params] = part.trim().split(';');
      if (token.trim() !== name) return false;
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      return !q || Number(q.slice(2)) > 0;
    });
  if (accepts('br')) return { encoding: 'br', suffix: '.br' };
  if (accepts('gzip')) return { encoding: 'gzip', suffix: '.gz' };
  return null;
}

// Serves the .br/.gz files written by scripts/compress-dist.mjs when the browser accepts them.
// Anything without a compressed copy falls through to express.static.
export function precompressedStatic(distDir: string) {
  const root = path.resolve(distDir);
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    let urlPath: string;
    try {
      urlPath = decodeURIComponent(req.path);
    } catch {
      return next();
    }
    if (urlPath.endsWith('/')) return next();
    const file = path.resolve(root, `.${urlPath}`);
    if (!file.startsWith(root + path.sep)) return next();

    const choice = pickEncoding(req.headers['accept-encoding']);
    const variant = choice ? `${file}${choice.suffix}` : null;
    const hasAnyVariant = fs.existsSync(`${file}.br`) || fs.existsSync(`${file}.gz`);
    if (hasAnyVariant) res.append('Vary', 'Accept-Encoding');
    if (!choice || !variant || !fs.existsSync(variant)) return next();

    res.setHeader('Content-Encoding', choice.encoding);
    res.type(path.extname(file));
    const cacheControl = cacheControlFor(urlPath);
    if (cacheControl) res.setHeader('Cache-Control', cacheControl);
    res.sendFile(variant, { cacheControl: !cacheControl }, (err) => {
      if (err) next(err);
    });
  };
}

export function staticCacheHeaders(res: Response, filePath: string, distDir: string) {
  const urlPath = `/${path.relative(path.resolve(distDir), filePath).split(path.sep).join('/')}`;
  const cacheControl = cacheControlFor(urlPath);
  if (cacheControl) res.setHeader('Cache-Control', cacheControl);
}
