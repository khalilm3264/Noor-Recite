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

test('all 267 authentic Hisn al-Muslim Qari recordings (1.mp3 through 267.mp3) are present in DUAS_AND_KALIMAS', () => {
  const foundIds = new Set<number>();
  const pattern = /hisnmuslim\.com\/audio\/ar\/(\d+)\.mp3$/;
  for (const dua of DUAS_AND_KALIMAS) {
    const urls = [
      dua.audioUrl,
      dua.fallbackAudioUrl,
      ...(dua.alternates ?? []).flatMap((alt) => [alt.audioUrl, alt.fallbackAudioUrl]),
    ];
    for (const url of urls) {
      const m = url?.match(pattern);
      if (m) foundIds.add(Number(m[1]));
    }
  }

  const missing: number[] = [];
  for (let id = 1; id <= 267; id++) {
    if (!foundIds.has(id)) missing.push(id);
  }
  assert.deepEqual(missing, [], `Missing Hisn al-Muslim Qari recordings: ${missing.join(', ')}`);
  assert.equal(foundIds.size, 267);
});

test('complete Qur’anic Rabbana & Prophetic Duas (including Rabbi Shrah Li Sadri 20:25-28) are present with valid quranRef/quranRange', () => {
  const quranicRefs = new Set<string>();
  for (const dua of DUAS_AND_KALIMAS) {
    if (dua.category !== 'quranic') continue;
    const items = [dua, ...(dua.alternates ?? [])];
    for (const item of items) {
      if (item.quranRef) {
        quranicRefs.add(`${item.quranRef.surahId}:${item.quranRef.ayahNumber}`);
      }
      if (item.quranRange) {
        for (let a = item.quranRange.startAyah; a <= item.quranRange.endAyah; a++) {
          quranicRefs.add(`${item.quranRange.surahId}:${a}`);
        }
      }
    }
  }

  const musa = DUAS_AND_KALIMAS.find((d) => d.id === 'dua-musa-shrah-sadri');
  assert.ok(musa, 'Expected dua-musa-shrah-sadri (Rabbi Shrah Li Sadri) in DUAS_AND_KALIMAS');
  assert.deepEqual(musa.quranRange, { surahId: 20, startAyah: 25, endAyah: 28 });

  const requiredRefs = [
    '20:25', '20:26', '20:27', '20:28', // Rabbi Shrah Li Sadri (Musa)
    '7:23',   // Adam's Repentance
    '21:83',  // Ayyub's Healing
    '21:87',  // Yunus in Distress
    '2:127', '2:128', '2:201', '2:250', '2:286', // Baqarah Rabbana Duas
    '3:8', '3:9', '3:16', '3:38', '3:53', '3:147', '3:191', '3:194', // Ali 'Imran Duas
    '5:114',  // Prophet Isa's Dua
    '7:89', '7:126', '10:85', '11:47', '12:101', '14:40', '14:41',
    '17:24', '17:80', '18:10', '20:114', '21:89', '23:97', '23:118',
    '25:65', '25:74', '26:83', '27:19', '28:16', '28:21', '28:24',
    '37:100', '38:35', '40:7', '46:15', '54:10', '59:10', '60:4', '66:8', '66:11', '71:28',
  ];
  const missingRefs = requiredRefs.filter((r) => !quranicRefs.has(r));
  assert.deepEqual(missingRefs, [], `Missing canonical Qur'anic Duas: ${missingRefs.join(', ')}`);
});


