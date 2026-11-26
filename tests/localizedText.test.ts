import assert from 'node:assert/strict';
import test from 'node:test';
import { getCachedLocalizedText, translateTextsBatch } from '../src/utils/localizedText';

test('identical source text uses a separate cached translation for each Arabic context', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    const { items } = JSON.parse(String(init.body)) as {
      items: Array<{ id: string; arabic: string }>;
    };
    return Response.json({
      translations: Object.fromEntries(items.map(({ id, arabic }) => [id, `Translation: ${arabic}`])),
    });
  });

  const first = { id: 'one', text: 'Peace', arabic: 'سلام' };
  const second = { id: 'two', text: 'Peace', arabic: 'سكينة' };
  const expected = { one: 'Translation: سلام', two: 'Translation: سكينة' };
  assert.deepEqual(await translateTextsBatch('fr', [first, second]), expected);
  assert.deepEqual(await translateTextsBatch('fr', [second, first]), expected);
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.equal(getCachedLocalizedText('fr', ' Peace ', ' سلام '), expected.one);
  assert.equal(getCachedLocalizedText('fr', 'Peace'), null);
});
