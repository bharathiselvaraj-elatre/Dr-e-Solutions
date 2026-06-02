import { Before, BeforeAll, ITestCaseHookParameter, setDefaultTimeout } from '@cucumber/cucumber';
import { Browser, BrowserContextOptions, chromium, firefox } from '@playwright/test';
import fs from 'fs';
import { LoginPage } from '../pages/LoginPage';
import { setSharedBrowser, sharedBrowser } from './browserSession';
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

async function launchConfiguredBrowser(): Promise<Browser> {
  const browserName = (process.env.BROWSER ?? 'chrome').toLowerCase();
  const launchOptions = {
    headless: isHeadless(),
    slowMo: getSlowMo(),
  };

  if (browserName === 'firefox') {
    return firefox.launch(launchOptions);
  }

  if (browserName === 'edge') {
    return chromium.launch({
      ...launchOptions,
      channel: 'msedge',
    });
  }

  return chromium.launch({
    ...launchOptions,
    channel: 'chrome',
  });
}

BeforeAll(async function () {
  setSharedBrowser(await launchConfiguredBrowser());
});

function shouldUseStoredAuth({ pickle }: ITestCaseHookParameter) {
  const hasExplicitAuthStep = pickle.steps.some((step) =>
    /logs into dr\.e solutions|opens login page|signs up|registers|enters otp|logs out/i.test(step.text)
  );

  return !hasExplicitAuthStep && !pickle.tags.some((tag) => tag.name === '@auth' || tag.name === '@flow');
}

function resolveViewport({ pickle }: ITestCaseHookParameter): BrowserContextOptions['viewport'] {
  const tagNames = pickle.tags.map((tag) => tag.name);

  if (tagNames.includes('@mobile')) {
    return { width: 390, height: 844 };
  }

  if (tagNames.includes('@tablet')) {
    return { width: 768, height: 1024 };
  }

  if (tagNames.includes('@desktop')) {
    return { width: 1280, height: 720 };
  }

  return undefined;
}

Before(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  if (!sharedBrowser) {
    throw new Error('Browser was not initialized before scenario startup.');
  }

  this.browser = sharedBrowser;

  const contextOptions: BrowserContextOptions = {
    storageState: shouldUseStoredAuth(scenario) && fs.existsSync(this.authFile) ? this.authFile : undefined,
    viewport: resolveViewport(scenario),
  };

  this.context = await this.browser.newContext({
    ...contextOptions,
  });

  this.page = await this.context.newPage();
  this.page.setDefaultTimeout(45000);
  this.booking = new LoginPage(this.page);
});
