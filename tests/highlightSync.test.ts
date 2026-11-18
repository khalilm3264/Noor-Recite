import assert from 'node:assert/strict';
import test from 'node:test';
import { DUAS_AND_KALIMAS } from '../src/data/duasAndKalimas.ts';
import { POPULAR_HADITHS } from '../src/data/hadithData.ts';
import {
  PRAYER_GUIDES,
  SALAH_POSTURE_STEPS,
  WUDU_STEPS,
} from '../src/data/salahData.ts';
import { SALAH_WORD_TIMINGS, expandWordTimings } from '../src/data/salahWordTimings.ts';
import {
  getActiveArabicWordIndex,
  getActiveArabicWordProgress,
  getArabicVerseWeightRanges,
  mapTimeToWordTimingProgress,
  tokenizeArabicForSync,
} from '../src/utils/arabicWordSync.ts';
import {
  SpeechBounds,
  getSafeLeadTrimSec,
  mapTimeToSpeechProgress,
} from '../src/utils/speechBounds.ts';

test('step-fatiha covers all 7 verses (1:1-7) without premature cutoff', () => {
  const fatihaStep = SALAH_POSTURE_STEPS.find((s) => s.id === 'step-fatiha');
  assert.ok(fatihaStep, 'Expected step-fatiha posture step');
  assert.deepEqual(fatihaStep.quranRef, { surahId: 1, ayahNumber: 1 });
  assert.deepEqual(fatihaStep.quranRange, { surahId: 1, startAyah: 1, endAyah: 7 });

  const ranges = getArabicVerseWeightRanges(fatihaStep.arabic);
  assert.equal(ranges.length, 7);
  assert.equal(ranges[0].startRatio, 0);
  assert.equal(ranges[6].endRatio, 1);

  for (let i = 0; i < ranges.length; i++) {
    assert.ok(
      ranges[i].endRatio > ranges[i].startRatio,
      `Verse ${i + 1} weight range must be positive`
    );
    if (i > 0) {
      assert.ok(
        Math.abs(ranges[i].startRatio - ranges[i - 1].endRatio) < 1e-9,
        `Verse ${i + 1} must be contiguous with verse ${i}`
      );
    }
  }
});

test('dua-travel covers both Qur’an 43:13 and 43:14 with exact wordTimings alignment', () => {
  const duaTravel = DUAS_AND_KALIMAS.find((d) => d.id === 'dua-travel');
  assert.ok(duaTravel, 'Expected dua-travel entry');
  assert.deepEqual(duaTravel.quranRef, { surahId: 43, ayahNumber: 13 });
  assert.deepEqual(duaTravel.quranRange, { surahId: 43, startAyah: 13, endAyah: 14 });
  assert.equal(duaTravel.audioUrl, '/audio/qari/dua-travel.mp3');

  const ranges = getArabicVerseWeightRanges(duaTravel.arabic);
  assert.equal(ranges.length, 2);

  const tokens = tokenizeArabicForSync(duaTravel.arabic);
  const spoken = tokens.filter((t) => t.isSpokenWord);
  assert.equal(spoken.length, 13);
  assert.equal(duaTravel.wordTimings?.length, spoken.length);

  // Verify word 0 (سُبْحَانَ), word 8 (مُقْرِنِينَ), word 9 (وَإِنَّا), word 12 (لَمُنقَلِبُونَ) hit at exact audio timestamps
  const timings = duaTravel.wordTimings!;
  assert.equal(
    getActiveArabicWordIndex(
      tokens,
      mapTimeToWordTimingProgress(400, timings, duaTravel.arabic)
    ),
    0
  );
  assert.equal(
    getActiveArabicWordIndex(
      tokens,
      mapTimeToWordTimingProgress(8500, timings, duaTravel.arabic)
    ),
    8
  );
  assert.equal(
    getActiveArabicWordIndex(
      tokens,
      mapTimeToWordTimingProgress(11000, timings, duaTravel.arabic)
    ),
    9
  );
  assert.equal(
    getActiveArabicWordIndex(
      tokens,
      mapTimeToWordTimingProgress(17000, timings, duaTravel.arabic)
    ),
    12
  );
});

test('all dua and alternate wordTimings entries match spoken Arabic token counts and stay monotonic', () => {
  for (const dua of DUAS_AND_KALIMAS) {
    const entries = [
      { id: dua.id, arabic: dua.arabic, wordTimings: dua.wordTimings, quranRange: dua.quranRange },
      ...(dua.alternates ?? []).map((alt) => ({
        id: `${dua.id}#${alt.id}`,
        arabic: alt.arabic,
        wordTimings: alt.wordTimings,
        quranRange: alt.quranRange,
      })),
    ];

    for (const entry of entries) {
      if (entry.quranRange) {
        const expectedVerses = entry.quranRange.endAyah - entry.quranRange.startAyah + 1;
        const ranges = getArabicVerseWeightRanges(entry.arabic);
        assert.equal(
          ranges.length,
          expectedVerses,
          `quranRange verse delimiter count mismatch for ${entry.id}`
        );
      }

      if (!entry.wordTimings) continue;
      const spoken = tokenizeArabicForSync(entry.arabic).filter((t) => t.isSpokenWord);
      assert.equal(
        entry.wordTimings.length,
        spoken.length,
        `wordTimings count mismatch for ${entry.id}`
      );
      let prevStart = -1;
      for (let i = 0; i < entry.wordTimings.length; i++) {
        const seg = entry.wordTimings[i];
        assert.ok(seg.startMs >= 0 && seg.endMs > seg.startMs, `Invalid timing segment at ${entry.id}[${i}]`);
        assert.ok(seg.startMs >= prevStart, `Non-monotonic startMs at ${entry.id}[${i}]`);
        prevStart = seg.startMs;
      }
    }
  }
});

test('rare category covers ocean voyage (8/25/7 wordTimings) and moon crescent + night refuge duas', () => {
  const rare = DUAS_AND_KALIMAS.filter((d) => d.category === 'rare');
  assert.ok(rare.length >= 15, 'Expected comprehensive rare & nature duas');

  const ocean = rare.find((d) => d.id === 'dua-ocean-voyage');
  assert.ok(ocean, 'Expected dua-ocean-voyage in rare category');
  assert.equal(ocean.wordTimings?.length, 8);
  assert.equal(ocean.alternates?.length, 3);
  assert.equal(ocean.alternates?.[0].wordTimings?.length, 25);
  assert.equal(ocean.alternates?.[1].wordTimings?.length, 7);

  const crescentMoon = rare.find((d) => d.id === 'dua-moon-sighting');
  assert.ok(crescentMoon, 'Expected dua-moon-sighting in rare category');
  assert.ok((crescentMoon.alternates?.length ?? 0) >= 1);

  const moonNightRefuge = rare.find((d) => d.id === 'dua-moon-night-refuge');
  assert.ok(moonNightRefuge, 'Expected dua-moon-night-refuge in rare category');
  assert.deepEqual(moonNightRefuge.quranRange, { surahId: 113, startAyah: 1, endAyah: 5 });
});

test('mapTimeToSpeechProgress trims leading and trailing silence cleanly', () => {
  const bounds: SpeechBounds = {
    speechStartSec: 0.6,
    speechEndSec: 3.6,
    durationSec: 4.2,
  };

  assert.equal(mapTimeToSpeechProgress(0.2, 4.2, bounds), 0);
  assert.equal(mapTimeToSpeechProgress(0.6, 4.2, bounds), 0);
  assert.ok(Math.abs(mapTimeToSpeechProgress(2.1, 4.2, bounds) - 0.5) < 1e-6);
  assert.equal(mapTimeToSpeechProgress(3.6, 4.2, bounds), 1);
  assert.equal(mapTimeToSpeechProgress(4.1, 4.2, bounds), 1);
});

test('getSafeLeadTrimSec preserves soft opening consonants <= 0.24s', () => {
  assert.equal(
    getSafeLeadTrimSec({ speechStartSec: 0.2, speechEndSec: 3.0, durationSec: 3.2 }),
    0
  );
  assert.equal(
    getSafeLeadTrimSec({ speechStartSec: 0.5, speechEndSec: 3.0, durationSec: 3.2 }),
    0.36
  );
});

test('getActiveArabicWordProgress tracks active Arabic spoken words monotonically', () => {
  const arabic = 'سُبْحَانَ رَبِّيَ ٱلْعَظِيمِ';
  const tokens = tokenizeArabicForSync(arabic);
  const wordCount = tokens.filter((t) => t.isSpokenWord).length;
  assert.equal(wordCount, 3);

  let prev = -1;
  for (let p = 0; p <= 1; p += 0.1) {
    const wordIdx = getActiveArabicWordIndex(tokens, p);
    const locked = getActiveArabicWordProgress(arabic, p);
    assert.ok(wordIdx !== null && wordIdx >= 0 && wordIdx < wordCount);
    assert.ok(locked >= prev - 1e-9, `Expected monotonic locked progress: ${prev} -> ${locked}`);
    prev = locked;
  }
});

test('all 34 hadiths have calibrated monotonic wordTimings matching spoken tokens', () => {
  assert.equal(POPULAR_HADITHS.length, 34);
  for (const h of POPULAR_HADITHS) {
    assert.ok(h.wordTimings && h.wordTimings.length > 0, `Missing wordTimings for ${h.id}`);
    const spoken = tokenizeArabicForSync(h.arabic).filter((t) => t.isSpokenWord);
    assert.equal(
      h.wordTimings.length,
      spoken.length,
      `Hadith ${h.id} wordTimings count mismatch`
    );
    let prevEnd = 0;
    for (let i = 0; i < h.wordTimings.length; i++) {
      const seg = h.wordTimings[i];
      assert.ok(seg.startMs >= prevEnd && seg.endMs > seg.startMs, `Invalid timing at ${h.id}[${i}]`);
      prevEnd = seg.endMs;
    }
  }
});

test('all audio-backed duas, alternates, and all 6 kalimas have calibrated wordTimings', () => {
  const kalimas = DUAS_AND_KALIMAS.filter((d) => d.category === 'kalimas');
  assert.equal(kalimas.length, 6);
  for (const k of kalimas) {
    assert.ok(k.wordTimings && k.wordTimings.length > 0, `Missing Kalima wordTimings for ${k.id}`);
  }

  for (const dua of DUAS_AND_KALIMAS) {
    const variants = [
      { id: dua.id, audioUrl: dua.audioUrl, quranRange: dua.quranRange, quranRef: dua.quranRef, wordTimings: dua.wordTimings },
      ...(dua.alternates ?? []).map((alt) => ({
        id: `${dua.id}#${alt.id}`,
        audioUrl: alt.audioUrl,
        quranRange: alt.quranRange,
        quranRef: alt.quranRef,
        wordTimings: alt.wordTimings,
      })),
    ];
    for (const v of variants) {
      if (v.audioUrl || (!v.quranRange && !v.quranRef)) {
        assert.ok(v.wordTimings && v.wordTimings.length > 0, `Missing wordTimings for audio dua ${v.id}`);
      }
    }
  }
});

test('all Salah niyyahs, posture steps, specials, wudu, and tasbih items have calibrated wordTimings', () => {
  for (const g of PRAYER_GUIDES) {
    const niyyahSpoken = tokenizeArabicForSync(g.niyyahArabic).filter((t) => t.isSpokenWord);
    assert.equal(g.niyyahWordTimings?.length, niyyahSpoken.length, `Missing niyyah timings for ${g.id}`);
    if (g.specialAudio) {
      const specialSpoken = tokenizeArabicForSync(g.specialAudio.arabic).filter((t) => t.isSpokenWord);
      assert.equal(g.specialAudio.wordTimings?.length, specialSpoken.length, `Missing special timings for ${g.id}`);
    }
  }

  for (const step of SALAH_POSTURE_STEPS) {
    if (step.id === 'step-fatiha') continue;
    const spoken = tokenizeArabicForSync(step.arabic).filter((t) => t.isSpokenWord);
    assert.equal(step.wordTimings?.length, spoken.length, `Missing step timings for ${step.id}`);
  }

  for (const w of WUDU_STEPS) {
    if (!w.arabic) continue;
    const spoken = tokenizeArabicForSync(w.arabic).filter((t) => t.isSpokenWord);
    assert.equal(w.wordTimings?.length, spoken.length, `Missing wudu timings for step ${w.stepNumber}`);
  }

  const tasbihFatimah = expandWordTimings(SALAH_WORD_TIMINGS['tasbih-fatimah-audio']);
  assert.equal(
    tasbihFatimah.length,
    tokenizeArabicForSync('سُبْحَانَ ٱللَّهِ، ٱلْحَمْدُ لِلَّهِ، ٱللَّهُ أَكْبَرُ، لَا إِلَٰهَ إِلَّا ٱللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ').filter((t) => t.isSpokenWord).length
  );
  assert.equal(SALAH_WORD_TIMINGS['tasbih-stage-subhanallah']?.length, 2);
  assert.equal(SALAH_WORD_TIMINGS['tasbih-stage-alhamdulillah']?.length, 2);
  assert.equal(SALAH_WORD_TIMINGS['tasbih-stage-allahuakbar']?.length, 2);
});
