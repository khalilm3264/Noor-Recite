# AI and privacy

## Data flow

| Action | Destination |
| --- | --- |
| Change preferences or record reading progress | Browser local storage |
| Load additional chapters or translations | External Quran data services; some translations also use the app's AI route |
| Play a recorded reciter | Recorded audio providers |
| Play generated speech in study features | Pre-generated audio files bundled with the app, or the browser's own speech voices; nothing goes to Gemini |
| Submit recitation for verification | Audio and expected passage go through Express; Gemini receives the audio and transcription instructions |
| Load web fonts | Google Fonts |

The Gemini key stays on the server. Browser-local progress is not account synchronization or an automatic backup. Audio and data caches may exist in browser storage; do not assume that clearing only local-storage settings clears every cache.

The application code does not implement a permanent server-side recording archive. It does not establish Gemini's retention policy or the hosting provider's logging policy; review those separately before submitting sensitive material. Do not upload private recordings in public bug reports.

## What AI feedback means

Speech matching can help check whether an expected phrase was recognized. Voice duration, volume, and pitch-derived feedback are practice signals, not a comprehensive acoustic validation of Tajweed. A verification outage or malformed response cannot produce a self-test pass. AI-generated speech and translations can be wrong and should be checked.

## Service protection

AI POST routes enforce per-client request limits and reject cross-site browser requests. Every explicit provider attempt, including retries and fallbacks, consumes a shared per-process budget; concurrency is also bounded. Exhaustion returns HTTP 429.

These controls keep the anonymous app's workload bounded. They do not authenticate users, persist across restart, or replace provider-side quotas. Multiple replicas need a shared store or gateway. A private installation should enforce authentication at the hosting gateway.

[Configuration](https://github.com/khalilm3264/Noor-Recite/wiki/Getting-Started) · [Back to the wiki](https://github.com/khalilm3264/Noor-Recite/wiki)
