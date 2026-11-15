# Noor Recite

Quran reading, recitation practice, and study tools built with React and an Express server.

## Run locally

Use Node.js 24 or later and npm:

```sh
npm ci
cp .env.example .env
# Set GEMINI_API_KEY in .env if you want AI features.
npm run dev
```

Open http://localhost:3000. The reader can run without Gemini; AI speech, translation, and verification require a server-side key. Never put the key in a `VITE_` variable or client code.

```sh
npm test
npm run lint
npm run build
NODE_ENV=production npm start
```

Bun users can run `bun install --frozen-lockfile`; both lockfiles are tracked. Update both when changing dependencies.

## Public deployment and AI limits

The app is intended for anonymous reading and does not provide user accounts. AI POST routes enforce same-origin browser requests, per-IP limits (30 requests/minute and 200/day by default), and a shared budget of 300 actual Gemini calls per 24-hour window, with at most 3 calls in flight. Retries, fallbacks, and failed provider calls consume the shared budget. Exhaustion returns HTTP 429 rather than invoking Gemini. The health route remains available.

Set `APP_URL` to the exact public origin, such as `https://recite.example.org`. Only set `TRUSTED_PROXY_CIDRS` to proxy addresses you control, so clients cannot bypass their IP limits by supplying arbitrary forwarding headers. If the hosting proxy's addresses cannot be trusted narrowly, leave this unset; clients then share that proxy's IP allowance.

The counters are in memory and apply **per server process**. They reset after restart and are not a billing limit. Set provider-side quota/billing controls as well. For multiple replicas, use a shared rate-limit/budget store or enforce the budget at a single gateway. Origin checks are not authentication: scripts can still call public endpoints within these limits. For a private installation, restrict access through the hosting platform's authenticated gateway. Do not embed a shared secret in browser code.

Override the positive-integer `AI_*` settings in `.env.example` to tune the limits. These changes do not configure an external provider quota or hosting access policy.

## Recitation and text-preview scope

Tajweed self-tests require a valid speech-verification response before marking a recording as passed. An outage or malformed response produces an unavailable result. Voice duration and volume are practice aids, not a substitute for a qualified teacher's assessment of Tajweed.

The Warsh text option is a **limited preview**: only verses 1:4 and 2:9 are adjusted. Other verses retain the base Ḥafṣ text. Reader audio follows the separately selected reciter; changing the text preview does not switch it. The comparison module provides its own labeled sample audio. This app does not provide a complete Warsh Muṣḥaf.
