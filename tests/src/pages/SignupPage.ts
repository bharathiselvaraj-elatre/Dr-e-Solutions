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

  private firstNameField() {
    return this.page.locator('input[name="firstName"]').first();
  }

  private lastNameField() {
    return this.page.locator('input[name="lastName"]').first();
  }

  private organizationField() {
    return this.page.locator('input[name="organizationName"]').first();
  }

  private emailField() {
    return this.page.locator('input[name="email"]').first();
  }

  private mobileField() {
    return this.page.locator('input[name="mobile"]').first();
  }

  private passwordField() {
    return this.page.locator('input[name="password"]').first();
  }

  private confirmPasswordField() {
    return this.page.locator('input[name="confirmPassword"]').first();
  }

  async navigate(url: string) {
    await this.navigateWithRetry(url);
  }

  async fillSignupForm(data: SignupFormData) {
    await this.typeInto(this.firstNameField(), data.firstName);
    await this.typeInto(this.lastNameField(), data.lastName);
    await this.typeInto(this.organizationField(), data.organization);
    await this.typeInto(this.emailField(), data.email);
    await this.typeInto(this.mobileField(), data.mobile);
    await this.typeInto(this.passwordField(), data.password);
    await this.typeInto(this.confirmPasswordField(), data.confirmPassword);
  }

  async clickRegister() {
    await this.page.getByRole('button', { name: /^register$/i }).click();
  }

  async verifyOtpPage() {
    await expect(this.page.getByText(/enter otp|verify your email|verification code sent/i)).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByRole('button', { name: /verify otp|verify code/i })).toBeVisible({
      timeout: 10000,
    });
    await expect(this.otpInputs().first()).toBeVisible({ timeout: 10000 });
  }

  async verifySignupPageDesktopUx() {
    await expect(this.page.getByText('Secure access for healthcare teams', { exact: true })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: /welcome to dr\.e solutions/i })).toBeVisible();
    await expect(
      this.page.getByText('Sign in to manage appointments, patient records, and day-to-day operations from one place.', {
        exact: true,
      })
    ).toBeVisible();
    await expect(this.page.locator('body')).toContainText('Protected login', { ignoreCase: true });
    await expect(this.page.locator('body')).toContainText('Encrypted session', { ignoreCase: true });
    await this.verifySharedSignupUx();
    await expect(this.page.getByRole('heading', { name: /welcome to dr\.e solutions/i })).toBeVisible();
    await this.expectNoHorizontalOverflow();
  }

  async verifySignupPageMobileUx() {
    await this.verifySharedSignupUx();
    await expect(this.page.getByRole('heading', { name: /welcome to dr\.e solutions/i })).toBeHidden();
    await expect(this.page.getByText('Secure access for healthcare teams', { exact: true })).toBeHidden();
    await this.expectNoHorizontalOverflow();
  }

  async verifyOtpPageUx(expectedEmail?: string) {
    await this.verifyOtpPage();
    await expect(this.page.locator('body')).toContainText(/otp sent to|verification code sent/i, { timeout: 10000 });

    if (expectedEmail) {
      await expect(this.page.locator('body')).toContainText(expectedEmail, { ignoreCase: true });
    }

    await expect(this.page.getByRole('button', { name: /verify otp|verify code/i })).toBeEnabled();
    await expect(this.page.getByRole('button', { name: /resend/i })).toBeVisible();
    await expect(this.otpInputs()).toHaveCount(6);
    await this.expectNoHorizontalOverflow();
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

    await this.page.getByRole('button', { name: /verify otp|verify code/i }).click();
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

  private async verifySharedSignupUx() {
    await expect(this.page).toHaveTitle(/dr\.?\s*e solutions/i);
    await expect(this.page.getByRole('heading', { name: /join us today!/i })).toBeVisible();
    await expect(this.page.locator('body')).toContainText('Already have an account?', { ignoreCase: true });
    await expect(this.page.getByRole('button', { name: /login now/i })).toBeVisible();

    await expect(this.firstNameField()).toHaveAttribute('placeholder', 'Enter your first name');
    await expect(this.lastNameField()).toHaveAttribute('placeholder', 'Enter your last name');
    await expect(this.organizationField()).toHaveAttribute('placeholder', 'Enter your organization name');
    await expect(this.emailField()).toHaveAttribute('placeholder', 'Enter your email');
    await expect(this.mobileField()).toHaveAttribute('placeholder', 'Enter your mobile number');
    await expect(this.passwordField()).toHaveAttribute('placeholder', 'Enter your password');
    await expect(this.confirmPasswordField()).toHaveAttribute('placeholder', 'Confirm your password');

    await expect(this.page.getByRole('button', { name: /country code/i })).toBeVisible();
    await expect(this.page.getByRole('button', { name: /time zone/i })).toBeVisible();
    await expect(this.page.getByRole('button', { name: /show password/i })).toBeVisible();
    await expect(this.page.getByRole('button', { name: /show confirm password/i })).toBeVisible();
    await expect(this.page.getByRole('button', { name: /^register$/i })).toBeVisible();
  }

  private async expectNoHorizontalOverflow() {
    const measurements = await this.page.evaluate(() => ({
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));

    expect(measurements.documentScrollWidth).toBeLessThanOrEqual(measurements.documentClientWidth + 1);
    expect(measurements.bodyScrollWidth).toBeLessThanOrEqual(measurements.bodyClientWidth + 1);
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
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        return;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        const isRetriable =
          /ERR_ABORTED|ERR_NETWORK_CHANGED|ERR_CONNECTION_RESET|NS_ERROR_ABORT|frame was detached|was not bound in the connection|Target page, context or browser has been closed/i.test(
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
