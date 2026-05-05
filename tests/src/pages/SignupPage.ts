import { expect, type Locator, type Page } from '@playwright/test';

type SignupFormData = {
  firstName: string;
  lastName: string;
  organization: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
};

export default class SignupPage {
  constructor(private page: Page) {}

  async navigate(url: string) {
    await this.navigateWithRetry(url);
  }

  async fillSignupForm(data: SignupFormData) {
    await this.typeInto(this.page.locator('input[name="firstName"]'), data.firstName);
    await this.typeInto(this.page.locator('input[name="lastName"]'), data.lastName);
    await this.typeInto(this.page.locator('input[name="organizationName"]'), data.organization);
    await this.typeInto(this.page.locator('input[name="email"]'), data.email);
    await this.typeInto(this.page.locator('input[name="mobile"]'), data.mobile);
    await this.typeInto(this.page.locator('input[name="password"]'), data.password);
    await this.typeInto(this.page.locator('input[name="confirmPassword"]'), data.confirmPassword);
  }

  async clickRegister() {
    await this.page.getByRole('button', { name: /^register$/i }).click();
  }

  async verifyOtpPage() {
    await expect(this.page.getByText(/enter otp/i)).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByRole('button', { name: /verify otp/i })).toBeVisible({
      timeout: 10000,
    });
    await expect(this.otpInputs().first()).toBeVisible({ timeout: 10000 });
  }

  async enterOtp(otp: string) {
    const otpInputs = this.otpInputs();
    await otpInputs.first().waitFor({ state: 'visible', timeout: 10000 });

    for (let index = 0; index < otp.length; index++) {
      const input = otpInputs.nth(index);
      await input.click();
      await input.fill('');
      await input.pressSequentially(otp[index], { delay: 30 });
    }

    await this.page.getByRole('button', { name: /verify otp/i }).click();
  }

  async verifyDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard\/?$/i, { timeout: 15000 });
  }

  async verifyMessage(message: string) {
    await expect(this.page.locator('body')).toContainText(message, { ignoreCase: true, timeout: 10000 });
  }

  async verifyRequiredValidations() {
    const expectedMessages = [
      'First name is required',
      'Last name is required',
      'Organization name is required',
      'Email address is required',
      'Mobile number is required',
      'Password is required',
      'Confirm password is required',
    ];

    for (const message of expectedMessages) {
      await expect(this.page.locator('body')).toContainText(message, { ignoreCase: true, timeout: 10000 });
    }
  }

  async getVisibleBodyText() {
    return this.page.locator('body').innerText();
  }

  private otpInputs() {
    return this.page.locator('input[type="text"], input[type="number"]').filter({
      hasNot: this.page.locator(
        'input[name="firstName"], input[name="lastName"], input[name="organizationName"], input[name="email"], input[name="mobile"], input[name="password"], input[name="confirmPassword"]'
      ),
    });
  }

  private async typeInto(locator: Locator, value: string) {
    await locator.click();
    await locator.fill('');

    if (value) {
      await locator.pressSequentially(value, { delay: 40 });
    }
  }

  private async navigateWithRetry(url: string, attempts = 3) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        await this.page.goto('about:blank', { waitUntil: 'load', timeout: 10000 }).catch(() => {});
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
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

        await this.page.waitForTimeout(1000 * attempt);
      }
    }

    throw lastError;
  }
}
