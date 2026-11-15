# Architecture and sources

## Application structure

| Location | Responsibility |
| --- | --- |
| `src/App.tsx` | Screen navigation and reader state |
| `src/components/` | Reader, preferences, memorization, prayer, and Tajweed screens |
| `src/data/quranData.ts` | Quran-data loading, translations, recorded audio URLs, and timing adapters |
| `src/data/qiraatData.ts` | Transmission comparisons and limited text-preview conversion |
| `src/utils/` | Audio caching, localization, practice analysis, and local progress |
| `server.ts` | Express server, Gemini routes, and production frontend serving |
| `server/aiProtection.ts` | Request limits, origin checks, and provider-call budget |
| `tests/` | Verification and service-protection regression tests |

The frontend uses React 19, TypeScript, Vite, Tailwind CSS, Motion, Lucide icons, and Recharts. The backend uses Express and the Google GenAI SDK. Vite supplies development support; production serves the built frontend from Express.

## External content and services

The source adapters reference **Quran.com** for Quran text, translations, and audio timing; **AlQuran Cloud** as a Quran-data fallback; and **EveryAyah** for recorded recitations. Web fonts come from **Google Fonts**. Some text and study material is bundled in the repository. The use of these services does not imply endorsement, ownership, or permission to redistribute every external resource.

This page describes code dependencies; it is not a scholarly certification of religious content or a legal review of source rights. Content corrections should identify the exact passage, transmission or translation, and a reliable source.

## Development boundaries

Keep Gemini credentials server-side. Route provider calls through the budget guard. Do not turn missing verification into a pass. Keep the Warsh preview's two-verse scope explicit. When changing dependencies, update both lockfiles and run tests, TypeScript checking, and the build.

The repository currently has no standalone license file. Do not assume a reuse license for the app or its third-party material.

[Contributing](https://github.com/khalilm3264/Noor-Recite/blob/main/CONTRIBUTING.md) · [Back to the wiki](https://github.com/khalilm3264/Noor-Recite/wiki)
