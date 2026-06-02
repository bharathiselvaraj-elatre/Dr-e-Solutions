# Test Strategy

- `tests/features` + `tests/src`: primary regression and feature coverage
- `tests/functional/login.spec.ts`: focused Playwright login validation

Use the existing Cucumber suite for broad coverage and the standalone Playwright functional spec for direct login validation.
