import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRuleFeedback } from '../src/utils/ruleFeedback.ts';
import type { SpokenVerificationResult } from '../src/utils/pitchAnalysis.ts';

const verified = {
  isArabicSpeech: true,
  wordMatchRatio: 1,
  matchedWordCount: 2,
  expectedWordCount: 2,
  transcript: 'بسم الله',
} as SpokenVerificationResult;

for (const rule of ['madd', 'ghunnah', 'ikhfa', 'idgham', 'qalqalah', 'tafkhim'] as const) {
  test(`${rule}: unavailable verification cannot pass a loud sustained recording`, () => {
    for (const result of [null, undefined, {} as SpokenVerificationResult]) {
      const feedback = buildRuleFeedback(rule, 2, 3, 0.1, result);
      assert.equal(feedback.passed, false);
      assert.match(feedback.summary, /verification is unavailable/i);
    }
  });
}
test('rejects non-Arabic and mismatched phrases even with sufficient voice activity', () => {
  assert.equal(buildRuleFeedback('qalqalah', 2, 3, .1, { ...verified, isArabicSpeech: false }).passed, false);
  assert.equal(buildRuleFeedback('qalqalah', 2, 3, .1, { ...verified, wordMatchRatio: .2 }).passed, false);
});
test('verified matched speech still respects the sustain and audibility checks', () => {
  assert.equal(buildRuleFeedback('madd', 2, 3, .1, verified).passed, true);
  assert.equal(buildRuleFeedback('madd', 1, 3, .1, verified).passed, false);
  assert.equal(buildRuleFeedback('madd', 2, 3, .001, verified).passed, false);
});
