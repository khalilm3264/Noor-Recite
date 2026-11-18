import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { AiCallBudget, createAiRequestLimits, positiveInteger, sameOriginOnly } from '../server/aiProtection.ts';

const throttled = (error: unknown) => (error as { status: number }).status === 429;

test('provider calls, including failed attempts, consume a shared budget that resets after 24 hours', async () => {
  let now = 0;
  const budget = new AiCallBudget(2, 1, () => now);
  assert.equal(await budget.run(async () => 'ok'), 'ok');
  await assert.rejects(budget.run(async () => { throw new Error('provider failure'); }), /provider failure/);
  let invoked = false;
  await assert.rejects(budget.run(async () => { invoked = true; }), throttled);
  assert.equal(invoked, false);
  now = 24 * 60 * 60 * 1000;
  assert.equal(await budget.run(async () => 'reset'), 'reset');
});
test('concurrent calls are bounded and slots are released after failure', async () => {
  const budget = new AiCallBudget(10, 1);
  let release!: () => void;
  const active = budget.run(() => new Promise<void>((resolve) => { release = resolve; }));
  await assert.rejects(budget.run(async () => {}), throttled);
  release(); await active;
  await assert.rejects(budget.run(async () => { throw new Error('failure'); }), /failure/);
  assert.equal(await budget.run(async () => 'ok'), 'ok');
});
test('invalid limit settings fail at startup rather than disabling protection', () => {
  for (const input of ['0', '-1', 'NaN', '1.5', 'Infinity']) assert.throws(() => positiveInteger(input, 300));
  assert.equal(positiveInteger(undefined, 300), 300);
});
test('HTTP limits reject cross-site and excessive requests without trusting spoofed proxy headers', async () => {
  const app = express();
  app.post('/api/test', sameOriginOnly('https://noor.example'), ...createAiRequestLimits(2, 10), (_req, res) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as { port: number }).port;
  const url = `http://127.0.0.1:${port}/api/test`;
  const post = (headers: Record<string, string> = {}) => fetch(url, { method: 'POST', headers });
  try {
    assert.equal((await post({ Origin: 'https://attacker.example' })).status, 403);
    assert.equal((await post({ 'Sec-Fetch-Site': 'cross-site' })).status, 403);
    assert.equal((await post({ Origin: 'https://noor.example' })).status, 200);
    assert.equal((await post({ Origin: 'https://noor.example' })).status, 200);
    const rejected = await post({
      Origin: 'https://noor.example',
      'X-Forwarded-For': '203.0.113.99',
      Forwarded: 'for=203.0.113.99;proto=https',
    });
    assert.equal(rejected.status, 429);
    assert.ok(rejected.headers.get('retry-after'));
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('HTTP limits isolate per-client IPs from Forwarded and X-Forwarded-For when trust proxy is configured', async () => {
  const app = express();
  app.set('trust proxy', 1);
  app.post('/api/test', sameOriginOnly('https://noor.example'), ...createAiRequestLimits(1, 10), (_req, res) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as { port: number }).port;
  const url = `http://127.0.0.1:${port}/api/test`;
  const post = (headers: Record<string, string> = {}) => fetch(url, { method: 'POST', headers });
  try {
    assert.equal((await post({ Origin: 'https://noor.example', 'X-Forwarded-For': '198.51.100.10' })).status, 200);
    assert.equal((await post({ Origin: 'https://noor.example', 'X-Forwarded-For': '198.51.100.10' })).status, 429);
    assert.equal((await post({ Origin: 'https://noor.example', Forwarded: 'for="198.51.100.20";proto=https' })).status, 200);
    assert.equal((await post({ Origin: 'https://noor.example', Forwarded: 'for="198.51.100.20";proto=https' })).status, 429);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
