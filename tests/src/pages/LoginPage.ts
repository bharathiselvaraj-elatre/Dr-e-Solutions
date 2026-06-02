import { expect, Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  private emailField() {
    return this.page.locator('input[type="email"]').first();
  }

  private passwordField() {
    return this.page.locator('input[type="password"], input[name="password"]').first();
  }

  private loginButton() {
    return this.page
      .getByRole('button', { name: /login now|login/i })
      .or(this.page.locator('button[type="submit"]'))
      .first();
  }

  private passwordToggleButton() {
    return this.page.getByRole('button', { name: /show password|hide password/i }).first();
  }

  private otpInputs() {
    return this.page.locator('input[type="text"], input[type="number"]').filter({
      hasNot: this.page.locator('input[type="email"], input[type="password"]'),
    });
  }

  async navigate(url: string) {
    await this.navigateWithRetry(url);
  }

  async enterEmail(email: string) {
    await this.emailField().fill(email);
  }

  async enterPassword(password: string) {
    const passwordField = this.page.locator('input[name="password"], input[type="password"], input[type="text"]').first();
    await passwordField.fill(password);
  }

  async clickLogin() {
    const loginButton = this.loginButton();

    await loginButton.waitFor({ state: 'visible', timeout: 15000 });

    try {
      await loginButton.click({ timeout: 15000 });
    } catch {
      await loginButton.scrollIntoViewIfNeeded().catch(() => {});
      await loginButton.click({ force: true, timeout: 15000 });
    }
  }

  async waitForAuthenticationCheckpoint() {
    try {
      await this.page.waitForFunction(
        () => {
          const currentUrl = window.location.href;
          const visibleText = document.body?.innerText ?? '';
          const hasAuthTokens = !!window.localStorage.getItem('access') || !!window.localStorage.getItem('refresh');
          return !/\/login\/?$/i.test(currentUrl) || /enter otp|verify otp|verify code|verification code sent/i.test(visibleText) || hasAuthTokens;
        },
        { timeout: 15000 }
      );
    } catch (error) {
      const debugSnapshot = await this.page
        .evaluate(() => ({
          url: window.location.href,
          bodyText: document.body?.innerText ?? '',
          accessToken: !!window.localStorage.getItem('access'),
          refreshToken: !!window.localStorage.getItem('refresh'),
        }))
        .catch(() => ({
          url: this.page.url(),
          bodyText: '',
          accessToken: false,
          refreshToken: false,
        }));

      const rootMessage = error instanceof Error ? `\nRoot error: ${error.message}` : '';
      throw new Error(
        `Login did not reach an authentication checkpoint. URL=${debugSnapshot.url} access=${debugSnapshot.accessToken} refresh=${debugSnapshot.refreshToken}\nVisible page text:\n${debugSnapshot.bodyText}${rootMessage}`
      );
    }
  }

  async waitForPostLogin() {
    let lastError: unknown;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(500);

        await this.retryLoginSubmissionIfStuck();
        await this.recoverToDashboardIfAuthenticated();
        await expect(this.page).toHaveURL(/\/dashboard\/?$/i, { timeout: 30000 });
        await this.waitForAuthenticatedBackendSession();
        await this.waitForAuthenticatedShell();
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
    if (!(await this.emailField().isVisible().catch(() => false))) {
      return false;
    }

    return await this.page
      .locator('input[name="password"], input[type="password"], input[type="text"]')
      .first()
      .isVisible()
      .catch(() => false);
  }

  async isOtpPageVisible() {
    const verifyOtpButton = this.page.getByRole('button', { name: /verify otp|verify code/i });
    return await verifyOtpButton.isVisible().catch(() => false);
  }

  async verifyOtpPage() {
    const verifyOtpButton = this.page.getByRole('button', { name: /verify otp|verify code/i });
    await expect(verifyOtpButton).toBeVisible({ timeout: 10000 });
    await expect(this.otpInputs().first()).toBeVisible({ timeout: 10000 });
  }

  async verifyOtpPageUx(expectedEmail?: string) {
    await this.verifyOtpPage();
    await expect(this.page.getByText(/enter otp/i)).toBeVisible({ timeout: 10000 });
    await expect(this.page.locator('body')).toContainText('OTP sent to', { ignoreCase: true });

    if (expectedEmail) {
      await expect(this.page.locator('body')).toContainText(expectedEmail, { ignoreCase: true });
    }

    await expect(this.page.getByRole('button', { name: /change email/i })).toBeVisible();
    await expect(this.page.locator('body')).toContainText("Didn't receive the OTP?", { ignoreCase: true });
    await expect(this.page.getByRole('button', { name: /resend/i })).toBeVisible();
    await expect(this.page.getByRole('button', { name: /verify otp/i })).toBeEnabled();
    await expect(this.otpInputs()).toHaveCount(6);
    await this.expectNoHorizontalOverflow();
  }

  async enterOtp(otp: string) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const roleTextboxes = this.page.getByRole('textbox');
        const roleTextboxCount = await roleTextboxes.count().catch(() => 0);

        if (roleTextboxCount >= otp.length + 1) {
          for (let index = 0; index < otp.length; index++) {
            await roleTextboxes.nth(index + 1).fill(otp[index]);
          }
        } else if (roleTextboxCount >= otp.length) {
          for (let index = 0; index < otp.length; index++) {
            await roleTextboxes.nth(index).fill(otp[index]);
          }
        } else {
          const otpInputs = this.otpInputs();
          await otpInputs.first().waitFor({ state: 'visible', timeout: 10000 });

          for (let index = 0; index < otp.length; index++) {
            await otpInputs.nth(index).fill(otp[index]);
          }
        }

        await this.page.getByRole('button', { name: 'Verify Code' }).click().catch(async () => {
          await this.page.getByRole('button', { name: /verify otp|verify code/i }).click();
        });
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

  async verifyLoginPageDesktopUx() {
    await expect(this.page.getByText('Secure access for healthcare teams', { exact: true })).toBeVisible();
    await expect(this.page.getByRole('heading', { name: /welcome to dr\.e solutions/i })).toBeVisible();
    await expect(
      this.page.getByText('Sign in to manage appointments, patient records, and day-to-day operations from one place.', {
        exact: true,
      })
    ).toBeVisible();
    await expect(this.page.locator('body')).toContainText('Protected login', { ignoreCase: true });
    await expect(this.page.locator('body')).toContainText('Encrypted session', { ignoreCase: true });
    await this.verifySharedLoginUx();

    const heroVisible = await this.page
      .getByRole('heading', { name: /welcome to dr\.e solutions/i })
      .evaluate((node) => node.getClientRects().length > 0);
    expect(heroVisible).toBeTruthy();

    await this.expectNoHorizontalOverflow();
  }

  async verifyLoginPageMobileUx() {
    await this.verifySharedLoginUx();

    const heroHeading = this.page.getByRole('heading', { name: /welcome to dr\.e solutions/i });
    await expect(heroHeading).toBeHidden();
    await this.expectNoHorizontalOverflow();
  }

  async verifySharedLoginUx() {
    await expect(this.page).toHaveTitle(/dr\.?\s*e solutions/i);
    await expect(this.page.getByRole('heading', { name: /welcome back!/i })).toBeVisible();

    await expect(this.page.locator('body')).toContainText("Don't have an account?", { ignoreCase: true });
    await expect(this.page.getByRole('link', { name: /create a new account now/i })).toHaveAttribute('href', /\/sign-up$/);
    await expect(this.page.locator('body')).toContainText("it's FREE! Takes less than a minute.", { ignoreCase: true });

    await expect(this.emailField()).toBeVisible();
    await expect(this.emailField()).toHaveAttribute('placeholder', 'Email address');
    await expect(this.emailField()).toHaveAttribute('autocomplete', 'email');

    await expect(this.passwordField()).toBeVisible();
    await expect(this.passwordField()).toHaveAttribute('placeholder', 'Password');
    await expect(this.passwordField()).toHaveAttribute('autocomplete', 'current-password');

    await expect(this.passwordToggleButton()).toBeVisible();
    await expect(this.loginButton()).toBeVisible();
    await expect(this.loginButton()).toBeEnabled();

    await expect(this.page.locator('body')).toContainText('Forgot password?', { ignoreCase: true });
    await expect(this.page.getByRole('link', { name: 'Click here' })).toHaveAttribute('href', /\/forgot-password$/);
  }

  async verifyPasswordToggleBehavior() {
    const passwordField = this.passwordField();
    await expect(passwordField).toHaveAttribute('type', 'password');
    await this.passwordToggleButton().click();
    await expect(passwordField).toHaveAttribute('type', 'text');
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

  private async waitForAuthenticatedShell() {
    const deadline = Date.now() + 30000;

    while (Date.now() < deadline) {
      if (await this.isOtpPageVisible()) {
        throw new Error('OTP page is still visible, so dashboard verification cannot continue yet.');
      }

      const loginVisible = await this.isLoginPageVisible();
      const bodyText = await this.getVisibleBodyText().catch(() => '');
      const looksLikeLoginShell =
        loginVisible ||
        /secure access for healthcare teams|welcome back to dr\.e|forgot password/i.test(bodyText);

      const authenticatedIndicators = [
        this.page.locator('nav').first(),
        this.page.getByRole('link', { name: /branches|dashboard|users|board|leads/i }).first(),
        this.page.getByRole('button', { name: /branches|switch branch|create board|add new branch/i }).first(),
        this.page.getByText(/loading your profile/i).first(),
      ];

      let hasAuthenticatedIndicator = false;
      for (const indicator of authenticatedIndicators) {
        if (await indicator.isVisible().catch(() => false)) {
          hasAuthenticatedIndicator = true;
          break;
        }
      }

      if (!looksLikeLoginShell && hasAuthenticatedIndicator) {
        return;
      }

      await this.page.waitForTimeout(250);
    }

    const bodyText = await this.getVisibleBodyText().catch(() => '');
    throw new Error(`Authenticated dashboard shell did not become visible. Visible page text:\n${bodyText}`);
  }

  private async recoverToDashboardIfAuthenticated() {
    const hasAuthTokens = await this.page
      .evaluate(() => !!window.localStorage.getItem('access') || !!window.localStorage.getItem('refresh'))
      .catch(() => false);

    if (!hasAuthTokens) {
      return;
    }

    if (/\/dashboard\/?$/i.test(this.page.url())) {
      return;
    }

    await this.page.goto('https://dev-solutions.dr-e.com/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
  }

  private async retryLoginSubmissionIfStuck() {
    const onLoginPage = /\/login\/?$/i.test(this.page.url());
    if (!onLoginPage) {
      return;
    }

    if (await this.isOtpPageVisible()) {
      return;
    }

    const hasAuthTokens = await this.page
      .evaluate(() => !!window.localStorage.getItem('access') || !!window.localStorage.getItem('refresh'))
      .catch(() => false);
    if (hasAuthTokens) {
      return;
    }

    const loginVisible = await this.isLoginPageVisible();
    if (!loginVisible) {
      return;
    }

    const emailValue = await this.emailField().inputValue().catch(() => '');
    const passwordValue = await this.passwordField().inputValue().catch(() => '');
    if (!emailValue.trim() || !passwordValue.trim()) {
      return;
    }

    const loginButton = this.loginButton();
    if (!(await loginButton.isVisible().catch(() => false))) {
      return;
    }

    await loginButton.click({ force: true, timeout: 10000 }).catch(() => {});
    await this.page.waitForTimeout(1500);
  }

  private async waitForAuthenticatedBackendSession() {
    await this.page.waitForFunction(
      async () => {
        const accessToken = window.localStorage.getItem('access');
        const refreshToken = window.localStorage.getItem('refresh');
        if (!accessToken && !refreshToken) {
          return false;
        }

        try {
          const response = await fetch('/api/auth/v1/users/me', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            credentials: 'include',
          });

          if (!response.ok) {
            return false;
          }

          const payload = await response.json().catch(() => null);
          return Boolean(payload?.tenant?.id || payload?.id || payload?.email);
        } catch {
          return false;
        }
      },
      { timeout: 30000 }
    );
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

  private async navigateWithRetry(url: string, attempts = 3) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        if (this.page.isClosed()) {
          throw new Error('Target page was already closed before navigation started.');
        }

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

        await this.sleep(1000 * attempt);
      }
    }

    throw lastError;
  }

  private async sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
