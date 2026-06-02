import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['functional/login.spec.ts'],
  snapshotPathTemplate: '{testDir}/../snapshots/{projectName}/{testFilePath}/{arg}{ext}',
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list']
  ],
  use: {
    browserName: 'chromium',
    headless: false,
    actionTimeout: 30000,
    navigationTimeout: 60000
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } }
  ],
  retries: 1
});
