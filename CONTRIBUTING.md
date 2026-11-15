# Contributing to Noor Recite

## Before changing code

Search existing issues and pull requests to avoid duplicate work. Keep a change focused: reader behavior, study content, AI integration, or documentation.

Set up the project using the README, then run:

```sh
npm test
npm run lint
npm run build
```

For UI changes, check phone and desktop widths, light and night modes, keyboard access, and Arabic right-to-left text. Include screenshots when they help explain a visible change.

## Content corrections

Include the surah and ayah number, the displayed text, the proposed correction, and a reliable source. Identify the transmission or translation involved. Do not silently expand the limited Warsh preview into a claim of complete coverage. Religious and linguistic claims should be reviewed by a qualified person.

## AI changes

Keep keys on the server. Route every provider attempt through the shared budget, including retries and fallbacks. Verification outages must not become passes. Label generated speech and translations accurately, and describe what a score actually measures.

## Dependencies and tests

Use Node.js 24+. Keep `package-lock.json` and `bun.lock` aligned when changing dependencies. Add regression tests for behavior changes, especially verification and request protection; avoid adding tests that merely restate static copy.

## Reporting bugs

Provide reproduction steps, expected and actual behavior, browser/device details, and a screenshot if useful. Do not publish API keys, raw environment files, private recordings, or sensitive browser logs. Suspected vulnerabilities should be disclosed privately to the repository owner; use GitHub's private vulnerability reporting option if it is available.

## Licensing

This repository does not currently include a standalone license file. Do not assume a particular reuse license or change third-party attribution. Licensing decisions belong to the repository owner.
