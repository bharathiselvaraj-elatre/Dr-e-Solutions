import { Browser } from '@playwright/test';

export let sharedBrowser: Browser | undefined;

export function setSharedBrowser(browser: Browser | undefined) {
  sharedBrowser = browser;
}
