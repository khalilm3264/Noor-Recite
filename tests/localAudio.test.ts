import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { DUAS_AND_KALIMAS } from '../src/data/duasAndKalimas.ts';
import { POPULAR_HADITHS } from '../src/data/hadithData.ts';
import { PRAYER_GUIDES, SALAH_POSTURE_STEPS, WUDU_STEPS } from '../src/data/salahData.ts';
import { getLocalQariAudioPath } from '../src/utils/aiTts.ts';

function assertLocalMp3Exists(publicUrl: string, label: string) {
  const filePath = path.resolve('public', publicUrl.replace(/^\//, ''));
  assert.ok(fs.existsSync(filePath), `Missing local audio file for ${label}: ${filePath}`);
  assert.ok(fs.statSync(filePath).size > 500, `Empty local audio file for ${label}: ${filePath}`);
}

test('all 6 Kalimas and existing Duas retain original human audioUrl recordings', () => {
  const kalimas = DUAS_AND_KALIMAS.filter((d) => d.category === 'kalimas');
  assert.equal(kalimas.length, 6);
  for (const k of kalimas) {
    assert.ok(k.audioUrl?.startsWith('https://'), `Kalima ${k.id} must have human audioUrl`);
  }
});

test('every Hadith, Dua, Kalima, and Salah step resolves to EveryAyah, human audioUrl, or local preloaded Qari MP3', () => {
  for (const h of POPULAR_HADITHS) {
    const localUrl = getLocalQariAudioPath(h.arabic);
    assert.ok(localUrl, `Hadith ${h.id} must resolve to a local Qari MP3`);
    assertLocalMp3Exists(localUrl, h.id);
  }

  for (const d of DUAS_AND_KALIMAS) {
    const variants = [
      { id: d.id, arabic: d.arabic, audioUrl: d.audioUrl, fallbackAudioUrl: d.fallbackAudioUrl, quranRef: d.quranRef, quranRange: d.quranRange },
      ...(d.alternates ?? []).map((alt) => ({
        id: `${d.id}#${alt.id}`,
        arabic: alt.arabic,
        audioUrl: alt.audioUrl,
        fallbackAudioUrl: alt.fallbackAudioUrl,
        quranRef: alt.quranRef,
        quranRange: alt.quranRange,
      })),
    ];

    for (const v of variants) {
      if (v.audioUrl?.startsWith('/audio/')) {
        assertLocalMp3Exists(v.audioUrl, v.id);
      }
      if (v.fallbackAudioUrl?.startsWith('/audio/')) {
        assertLocalMp3Exists(v.fallbackAudioUrl, `${v.id}-fallback`);
      }
      const hasHumanOrQuran = Boolean(v.quranRef || v.quranRange || v.audioUrl);
      if (!hasHumanOrQuran) {
        const localUrl = getLocalQariAudioPath(v.arabic);
        assert.ok(localUrl, `Dua ${v.id} without audioUrl/quranRef must resolve to a local Qari MP3`);
        assertLocalMp3Exists(localUrl, v.id);
      }
    }
  }

  assertLocalMp3Exists('/audio/qari/dua-ocean-voyage.mp3', 'dua-ocean-voyage');
  assertLocalMp3Exists('/audio/qari/dua-ocean-voyage-full.mp3', 'dua-ocean-voyage-full');
  assertLocalMp3Exists('/audio/qari/dua-safe-harbor.mp3', 'dua-safe-harbor');

  for (const g of PRAYER_GUIDES) {
    const niyyahUrl = getLocalQariAudioPath(g.niyyahArabic);
    assert.ok(niyyahUrl, `Prayer guide ${g.id} Niyyah must resolve to a local Qari MP3`);
    assertLocalMp3Exists(niyyahUrl, `${g.id}-niyyah`);
    if (g.specialAudio && !g.specialAudio.audioUrl) {
      const spUrl = getLocalQariAudioPath(g.specialAudio.arabic);
      assert.ok(spUrl, `Special audio for ${g.id} must resolve to a local Qari MP3`);
      assertLocalMp3Exists(spUrl, `${g.id}-special`);
    }
  }

  for (const s of SALAH_POSTURE_STEPS) {
    if (!s.audioUrl && !s.quranRef && !s.quranRange) {
      const localUrl = getLocalQariAudioPath(s.arabic);
      assert.ok(localUrl, `Salah step ${s.id} must resolve to a local Qari MP3`);
      assertLocalMp3Exists(localUrl, s.id);
    }
  }

  for (const w of WUDU_STEPS) {
    if (w.arabic && !w.audioUrl) {
      const localUrl = getLocalQariAudioPath(w.arabic);
      assert.ok(localUrl, `Wudu step ${w.stepNumber} must resolve to a local Qari MP3`);
      assertLocalMp3Exists(localUrl, `wudu-${w.stepNumber}`);
    }
  }
});

test('client source code never calls /api/tts at runtime', () => {
  const srcRoot = path.resolve('src');
  const stack = [srcRoot];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        const content = fs.readFileSync(full, 'utf8');
        assert.equal(
          content.includes('/api/tts'),
          false,
          `Unexpected /api/tts reference found in client file: ${full}`
        );
      }
    }
  }
});
