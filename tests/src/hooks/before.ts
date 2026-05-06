import { Before, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium } from '@playwright/test';
import fs from 'fs';
import { LoginPage } from '../pages/LoginPage';
import { CustomWorld } from './world';

setDefaultTimeout(120000);

function isHeadless() {
  return process.env.HEADLESS !== 'false';
}

function getSlowMo() {
  const configured = Number(process.env.SLOWMO);
  if (!Number.isNaN(configured) && configured >= 0) {
    return configured;
  }

  return 0;
}

Before(async function (this: CustomWorld) {
  this.browser = await chromium.launch({
    headless: isHeadless(),
    slowMo: getSlowMo(),
  });
  this.context = await this.browser.newContext({
    storageState: fs.existsSync(this.authFile) ? this.authFile : undefined,
  });

  this.page = await this.context.newPage();
  this.page.setDefaultTimeout(45000);
  this.booking = new LoginPage(this.page);
});
