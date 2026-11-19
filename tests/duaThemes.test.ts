import assert from 'node:assert/strict';
import test from 'node:test';
import { DUAS_AND_KALIMAS } from '../src/data/duasAndKalimas.ts';
import {
  DUA_THEMES,
  DUA_THEME_MAP,
  getDuaThemeId,
  groupDuasByTheme,
} from '../src/data/duaThemes.ts';

test('every Dua and Kalima maps cleanly to a valid thematic category with zero unmapped items', () => {
  assert.ok(DUA_THEMES.length >= 9);
  const groups = groupDuasByTheme(DUAS_AND_KALIMAS);
  const totalGrouped = groups.reduce((sum, g) => sum + g.items.length, 0);
  assert.equal(totalGrouped, DUAS_AND_KALIMAS.length);

  for (const item of DUAS_AND_KALIMAS) {
    const themeId = getDuaThemeId(item);
    assert.ok(DUA_THEME_MAP[themeId], `Invalid theme ${themeId} for ${item.id}`);
  }
});

test('requested flagship themes (Morning / Evening, During Salah, For Forgiveness) contain their canonical duas', () => {
  const groups = groupDuasByTheme(DUAS_AND_KALIMAS);
  const byTheme = new Map(groups.map((g) => [g.theme.id, new Set(g.items.map((i) => i.id))]));

  const morningEvening = byTheme.get('morning-evening');
  assert.ok(morningEvening?.has('dua-morning-protection'));
  assert.ok(morningEvening?.has('hisn-morning-adhkar-complete'));
  assert.ok(morningEvening?.has('dua-before-sleep'));
  assert.ok(morningEvening?.has('ayatul-kursi'));

  const duringSalah = byTheme.get('during-salah');
  assert.ok(duringSalah?.has('dua-salah-istiftah'));
  assert.ok(duringSalah?.has('dua-salah-ruku'));
  assert.ok(duringSalah?.has('dua-salah-sujood'));
  assert.ok(duringSalah?.has('dua-before-salam'));
  assert.ok(duringSalah?.has('dhikr-tasbih-fatimah'));
  assert.ok(duringSalah?.has('dua-qunoot-witr'));

  const forForgiveness = byTheme.get('for-forgiveness');
  assert.ok(forForgiveness?.has('dhikr-sayyidul-istighfar'));
  assert.ok(forForgiveness?.has('dua-adam-repentance'));
  assert.ok(forForgiveness?.has('hisn-repentance-and-istighfar'));
  assert.ok(forForgiveness?.has('dua-kaffarat-majlis'));

  const guidanceFamily = byTheme.get('guidance-family');
  assert.ok(guidanceFamily?.has('dua-musa-shrah-sadri'));
  assert.ok(guidanceFamily?.has('dua-knowledge'));
  assert.ok(guidanceFamily?.has('dua-parents'));
});
