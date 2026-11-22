import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { cacheControlFor, pickEncoding, precompressedStatic, staticCacheHeaders } from '../server/staticAssets.ts';

test('pickEncoding prefers brotli, honours q=0, and falls back to gzip', () => {
  assert.equal(pickEncoding('gzip, deflate, br')?.encoding, 'br');
  assert.equal(pickEncoding('gzip, br;q=0')?.encoding, 'gzip');
  assert.equal(pickEncoding('identity'), null);
  assert.equal(pickEncoding(undefined), null);
});

test('cacheControlFor marks only hashed /assets files immutable', () => {
  assert.equal(cacheControlFor('/assets/index-abc123.js'), 'public, max-age=31536000, immutable');
  assert.equal(cacheControlFor('/audio/qari/x.mp3'), undefined);
  assert.equal(cacheControlFor('/index.html'), undefined);
});

test('precompressedStatic serves compressed copies with the right headers', async () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'noor-dist-'));
  fs.mkdirSync(path.join(dist, 'assets'));
  const js = 'console.log("noor");'.repeat(200);
  fs.writeFileSync(path.join(dist, 'assets', 'app-1.js'), js);
  fs.writeFileSync(path.join(dist, 'assets', 'app-1.js.br'), brotliCompressSync(js));
  fs.writeFileSync(path.join(dist, 'assets', 'app-1.js.gz'), gzipSync(js));
  fs.writeFileSync(path.join(dist, 'plain.txt'), 'hello');

  const app = express();
  app.use(precompressedStatic(dist));
  app.use(express.static(dist, { setHeaders: (res, file) => staticCacheHeaders(res, file, dist) }));
  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;
  try {
    const br = await fetch(`${base}/assets/app-1.js`, { headers: { 'Accept-Encoding': 'br' } });
    assert.equal(br.status, 200);
    assert.equal(br.headers.get('content-encoding'), 'br');
    assert.match(br.headers.get('content-type') ?? '', /javascript/);
    assert.equal(br.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    assert.match(br.headers.get('vary') ?? '', /Accept-Encoding/);
    assert.equal(await br.text(), js);

    const gz = await fetch(`${base}/assets/app-1.js`, { headers: { 'Accept-Encoding': 'gzip' } });
    assert.equal(gz.headers.get('content-encoding'), 'gzip');
    assert.equal(await gz.text(), js);

    const raw = await fetch(`${base}/assets/app-1.js`, { headers: { 'Accept-Encoding': 'identity' } });
    assert.equal(raw.headers.get('content-encoding'), null);
    assert.equal(raw.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    assert.equal(await raw.text(), js);

    const plain = await fetch(`${base}/plain.txt`, { headers: { 'Accept-Encoding': 'br' } });
    assert.equal(plain.headers.get('content-encoding'), null);
    assert.equal(await plain.text(), 'hello');

    const traversal = await fetch(`${base}/..%2f..%2fetc%2fpasswd`, { headers: { 'Accept-Encoding': 'br' } });
    assert.notEqual(traversal.status, 200);
  } finally {
    server.close();
    fs.rmSync(dist, { recursive: true, force: true });
  }
});
