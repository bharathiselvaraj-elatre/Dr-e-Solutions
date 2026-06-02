# Dental CRM Automation

This repository contains the active automation project for Dental CRM.

## Valid Structure

```text
dr.e/
|-- constants/
|-- docs/
|-- fixtures/
|-- pages/
|-- test-data/
|-- tests/
|   |-- features/
|   |-- functional/
|   `-- src/
|-- ci-cd/
|-- cucumber.js
|-- package.json
|-- playwright.config.ts
|-- runOrderedSuite.js
|-- runSingleSuite.js
`-- sendReport.js
```

## Active Test Layers

- `tests/features` and `tests/src`: main Cucumber + Playwright regression suite
- `tests/functional/login.spec.ts`: standalone Playwright login validation

## Useful Commands

```powershell
npm run test
npm run test:sanity
npm run test:smoke
npm run test:regression
npm run test:login:uiux
npm run test:auth:flow:uiux:desktop
npm run test:pw:functional
```

## Notes

- Placeholder API, E2E, and UI/UX Playwright scaffolds were removed so the structure matches the files that actually run.
- The root-level `pages/`, `fixtures/`, and `constants/` folders now keep only the files used by the remaining Playwright functional test.
