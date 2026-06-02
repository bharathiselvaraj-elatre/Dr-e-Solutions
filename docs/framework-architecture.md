# Framework Architecture

This repo currently supports two active layers:

- A working Playwright + Cucumber suite under `tests/features` and `tests/src`
- A focused Playwright functional spec under `tests/functional/login.spec.ts`

Root-level shared files are kept only when they are used by the active Playwright spec.
