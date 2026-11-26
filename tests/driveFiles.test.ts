import assert from 'node:assert/strict';
import test from 'node:test';
import { listDriveFiles, listNoorBackupFiles } from '../src/utils/googleDriveApi';

test('Drive listings stay inside the study folder, including backups and Trash', async (t) => {
  const requests: URL[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    requests.push(new URL(url));
    return Response.json({ files: [] });
  });

  assert.deepEqual(await listDriveFiles('test-token', { scope: 'media' }), []);
  assert.deepEqual(await listNoorBackupFiles('test-token'), []);
  assert.equal(requests.length, 0);

  for (const scope of ['noor-folder', 'docs', 'media', 'trashed'] as const) {
    await listDriveFiles('test-token', { scope, noorFolderId: 'study-folder' });
    const query = requests.at(-1)?.searchParams.get('q') ?? '';
    assert.match(query, /^'study-folder' in parents and trashed = /);
    assert.ok(query.includes(`trashed = ${scope === 'trashed'}`));
  }

  await listNoorBackupFiles('test-token', 'study-folder');
  assert.equal(
    requests.at(-1)?.searchParams.get('q'),
    "'study-folder' in parents and mimeType = 'application/json' and trashed = false"
  );
});
