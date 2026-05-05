import { expect, Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  private otpInputs() {
    return this.page.locator('input[type="text"], input[type="number"]').filter({
      hasNot: this.page.locator('input[type="email"], input[type="password"]'),
    });
  }

  async navigate(url: string) {
    await this.navigateWithRetry(url);
  }

  async enterEmail(email: string) {
    await this.page.locator('input[type="email"]').fill(email);
  }

  async enterPassword(password: string) {
    await this.page.locator('input[type="password"]').fill(password);
  }

  async clickLogin() {
    await this.page.getByRole('button', { name: /login/i }).click();
  }

  async waitForAuthenticationCheckpoint() {
    await this.page.waitForFunction(() => {
      const currentUrl = window.location.href;
      const visibleText = document.body?.innerText ?? '';
      return !/\/login\/?$/i.test(currentUrl) || /enter otp|verify otp/i.test(visibleText);
    }, { timeout: 15000 });
  }

  async waitForPostLogin() {
    let lastError: unknown;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.page.waitForLoadState('domcontentloaded');
        await expect(this.page).not.toHaveURL(/\/login\/?$/i, { timeout: 15000 });
        return;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        const isRetriable =
          /was not bound in the connection|Target page, context or browser has been closed|frame was detached/i.test(
            message
          );

        if (!isRetriable || attempt === 3) {
          throw error;
        }

        await this.page.waitForTimeout(1000 * attempt);
      }
    }

    throw lastError;
  }

  async verifyDashboard() {
    await this.waitForPostLogin();
  }

  async isLoggedIn() {
    return !/\/login\/?$/i.test(this.page.url());
  }

  async isLoginPageVisible() {
    if (!(await this.page.locator('input[type="email"]').isVisible().catch(() => false))) {
      return false;
    }

    return await this.page.locator('input[type="password"]').isVisible().catch(() => false);
  }

  async isOtpPageVisible() {
    const verifyOtpButton = this.page.getByRole('button', { name: /verify otp/i });
    return await verifyOtpButton.isVisible().catch(() => false);
  }

  async verifyOtpPage() {
    const verifyOtpButton = this.page.getByRole('button', { name: /verify otp/i });
    await expect(verifyOtpButton).toBeVisible({ timeout: 10000 });
    await expect(this.otpInputs().first()).toBeVisible({ timeout: 10000 });
  }

  async enterOtp(otp: string) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const otpInputs = this.otpInputs();
        await otpInputs.first().waitFor({ state: 'visible', timeout: 10000 });

        for (let index = 0; index < otp.length; index++) {
          await otpInputs.nth(index).fill(otp[index]);
        }

        await this.page.getByRole('button', { name: /verify otp/i }).click();
        return;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        const isRetriable =
          /was not bound in the connection|Target page, context or browser has been closed|frame was detached/i.test(
            message
          );

        if (!isRetriable || attempt === 3) {
          throw error;
        }

        await this.page.waitForTimeout(1000 * attempt);
      }
    }

    throw lastError;
  }

  async verifyRequiredFields() {
    await expect(this.page.getByText('Email is required', { exact: true })).toBeVisible();
    await expect(this.page.getByText('Password is required', { exact: true })).toBeVisible();
  }

  async verifyLoginFailure() {
    const failureMessages = [
      this.page.getByText(/invalid email or password/i),
      this.page.getByText(/login failed/i),
      this.page.getByText(/user .* not found/i),
    ];

    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      for (const message of failureMessages) {
        if (await message.first().isVisible().catch(() => false)) {
          await expect(message.first()).toBeVisible({ timeout: 3000 });
          return;
        }
      }

      await this.page.waitForTimeout(250);
    }

    const bodyText = await this.getVisibleBodyText();
    throw new Error(`Expected a login failure message, but none were visible. Visible page text:\n${bodyText}`);
  }

  async getVisibleBodyText() {
    return this.page.locator('body').innerText();
  }

  private async navigateWithRetry(url: string, attempts = 3) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        if (this.page.isClosed()) {
          throw new Error('Target page was already closed before navigation started.');
        }

        await this.page.goto('about:blank', { waitUntil: 'load', timeout: 10000 }).catch(() => {});
        await this.page.goto(url, { waitUntil: 'commit', timeout: 60000 });
        await this.page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
        return;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        const isRetriable =
          /ERR_ABORTED|frame was detached|was not bound in the connection|Target page, context or browser has been closed/i.test(
            message
          );

        if (!isRetriable || attempt === attempts) {
          throw error;
        }

        await this.sleep(1000 * attempt);
      }
    }

    throw lastError;
  }

  private async sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
