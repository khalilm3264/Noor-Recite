// Writes .br and .gz copies of the built text assets in dist/ so the Express server can send
// compressed files without compressing on every request. Runs after `vite build`.
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const COMPRESSIBLE = /\.(js|mjs|css|html|svg|json|txt|map|ico)$/i;
const MIN_BYTES = 1024;

let written = 0;
let before = 0;
let after = 0;

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!COMPRESSIBLE.test(entry.name) || statSync(full).size < MIN_BYTES) continue;
    const source = readFileSync(full);
    const br = brotliCompressSync(source, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 11,
        [constants.BROTLI_PARAM_SIZE_HINT]: source.length,
      },
    });
    const gz = gzipSync(source, { level: 9 });
    writeFileSync(`${full}.br`, br);
    writeFileSync(`${full}.gz`, gz);
    written += 1;
    before += source.length;
    after += br.length;
  }
}

walk(distDir);
console.log(
  `compress-dist: ${written} files, ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB (brotli)`
);
