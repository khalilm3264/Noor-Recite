# Getting started and deployment

## Local development

Use Node.js 24+ and npm. Clone the repository, enter its directory, run `npm ci`, and copy `.env.example` to `.env`. Start with `npm run dev`, then open http://localhost:3000.

On PowerShell, `Copy-Item .env.example .env` copies the environment template. A Gemini key is optional for the basic reader; set `GEMINI_API_KEY` in `.env` to enable AI features. Never commit this file or expose the key through a `VITE_` variable.

Run `npm test`, `npm run lint`, and `npm run build` before submitting changes. The lint command checks TypeScript. Bun users can install with `bun install --frozen-lockfile`.

## Production

Run `npm ci` and `npm run build`. Set `NODE_ENV=production`, then run `npm start`. The server uses port 3000 by default; override it with `PORT`. On PowerShell, set `$env:NODE_ENV='production'` before starting.

The host must run Express as well as serve the frontend. A static-only deployment does not implement the AI routes. Use HTTPS for a public installation; microphone access requires HTTPS or localhost.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `GEMINI_API_KEY` | Server-side Gemini key | AI unavailable if unset |
| `APP_URL` | Exact public origin, for example `https://recite.example.org` | Current request origin |
| `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID` | Firebase web app config for Google Drive sign-in, served to the browser by `/api/firebase-config`. Restrict the key to your site's referrers and the Identity Toolkit API. | Drive sign-in unavailable |
| `PORT` | Listening port | `3000` |
| `AI_DAILY_CALL_LIMIT` | Provider attempts per process per 24 hours | `300` |
| `AI_CONCURRENT_CALL_LIMIT` | Simultaneous provider calls | `3` |
| `AI_REQUESTS_PER_MINUTE` | AI POST requests per client per minute | `30` |
| `AI_REQUESTS_PER_DAY` | AI POST requests per client per day | `200` |
| `TRUSTED_PROXY_CIDRS` | Comma-separated trusted proxy IPs/CIDRs | Unset |

Limits must be positive integers. Only trust proxy addresses you control. Do not trust arbitrary forwarding headers. Without a trusted-proxy setting, visitors behind one proxy may share its request allowance.

Counters are in memory, per process, and reset on restart. Multiple replicas need shared enforcement. Provider quotas and billing controls must be configured separately. Origin checks and rate limits do not authenticate users; use an authenticated hosting gateway for a private installation.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| AI service unavailable / HTTP 503 | Check the server-side key and server logs; the reader can still work. |
| HTTP 429 | Wait for the request window or provider-call allowance to reset. Check the configured limits. |
| HTTP 403 on AI requests | Verify that `APP_URL` matches the public origin exactly, including scheme and port. |
| Microphone missing or denied | Use HTTPS or localhost and review browser microphone permissions. |
| Audio does not start | Start playback with a user gesture; check connectivity to recorded audio services. |
| A chapter or translation does not load | Check the network and the external data services. Cached content is not a complete offline library. |
| Missing production frontend | Build `dist/` before starting with `NODE_ENV=production`. |

[Back to the wiki](https://github.com/khalilm3264/Noor-Recite/wiki)
