import test from 'node:test';
import assert from 'node:assert/strict';
import { readFirebaseConfig } from '../server/firebaseConfig.ts';
import { firebaseConfigFromEnv, parseFirebaseConfig } from '../src/utils/firebaseWebConfig.ts';

test('readFirebaseConfig needs the four core values and trims them', () => {
  assert.equal(readFirebaseConfig({}), null);
  assert.equal(
    readFirebaseConfig({ FIREBASE_API_KEY: 'k', FIREBASE_AUTH_DOMAIN: 'd', FIREBASE_PROJECT_ID: ' ' , FIREBASE_APP_ID: 'a' }),
    null
  );
  assert.deepEqual(
    readFirebaseConfig({
      FIREBASE_API_KEY: ' key ',
      FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com',
      FIREBASE_PROJECT_ID: 'demo',
      FIREBASE_APP_ID: '1:2:web:3',
      FIREBASE_STORAGE_BUCKET: '',
      FIREBASE_MESSAGING_SENDER_ID: '42',
    }),
    {
      apiKey: 'key',
      authDomain: 'demo.firebaseapp.com',
      projectId: 'demo',
      appId: '1:2:web:3',
      messagingSenderId: '42',
    }
  );
});

test('readFirebaseConfig falls back to the VITE_FIREBASE_* names per field', () => {
  assert.deepEqual(
    readFirebaseConfig({
      VITE_FIREBASE_API_KEY: 'vite-key',
      FIREBASE_API_KEY: 'server-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'demo',
      VITE_FIREBASE_APP_ID: '1:2:web:3',
    }),
    { apiKey: 'server-key', authDomain: 'demo.firebaseapp.com', projectId: 'demo', appId: '1:2:web:3' }
  );
});

test('build-time config reads only VITE_FIREBASE_* and ignores non-string values', () => {
  const env = {
    VITE_FIREBASE_API_KEY: 'k',
    VITE_FIREBASE_AUTH_DOMAIN: 'd',
    VITE_FIREBASE_PROJECT_ID: 'p',
    VITE_FIREBASE_APP_ID: 'a',
    PROD: true,
  };
  assert.deepEqual(firebaseConfigFromEnv(env, ['VITE_FIREBASE_']), {
    apiKey: 'k',
    authDomain: 'd',
    projectId: 'p',
    appId: 'a',
  });
  assert.equal(firebaseConfigFromEnv({ FIREBASE_API_KEY: 'k' }, ['VITE_FIREBASE_']), null);
});

test('parseFirebaseConfig rejects HTML fallbacks and incomplete objects', () => {
  assert.equal(parseFirebaseConfig(null), null);
  assert.equal(parseFirebaseConfig('<!doctype html>'), null);
  assert.equal(parseFirebaseConfig({ apiKey: 'k', authDomain: 'd', projectId: 'p' }), null);
  assert.deepEqual(parseFirebaseConfig({ apiKey: 'k', authDomain: 'd', projectId: 'p', appId: 'a', extra: 1 }), {
    apiKey: 'k',
    authDomain: 'd',
    projectId: 'p',
    appId: 'a',
  });
});

test('no committed file contains a Google API key', async () => {
  const { execSync } = await import('node:child_process');
  let output = '';
  try {
    output = execSync("git grep -nE 'AIza[0-9A-Za-z_-]{35}' -- . ':!node_modules'", { encoding: 'utf8' });
  } catch {
    output = ''; // git grep exits 1 when nothing matches
  }
  assert.equal(output.trim(), '', `Google API key found in tracked files:\n${output}`);
});
