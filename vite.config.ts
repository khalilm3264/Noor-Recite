import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {createHash} from 'crypto';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

// Hash of every file under public/audio. The app uses it to name its local audio cache, so
// re-recorded files reach users who already cached the old ones.
function hashLocalAudio(dir: string): string {
  const hash = createHash('sha256');
  const walk = (current: string) => {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        hash.update(path.relative(dir, full));
        hash.update(fs.readFileSync(full));
      }
    }
  };
  walk(dir);
  return hash.digest('hex').slice(0, 12);
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
      __LOCAL_AUDIO_VERSION__: JSON.stringify(hashLocalAudio(path.resolve(__dirname, 'public/audio'))),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
