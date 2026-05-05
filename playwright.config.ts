import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    browserName: 'chromium',
    headless: false,
    actionTimeout: 30000,
    navigationTimeout: 60000
  },
  retries: 1
});