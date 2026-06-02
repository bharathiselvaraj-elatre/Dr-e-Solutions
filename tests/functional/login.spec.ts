import { test, expect } from '../../fixtures/authFixture';
import { urls } from '../../constants/urls';

test.describe('Login module', () => {
  test('should authenticate successfully with configured credentials', async ({ loginPage, credentials }) => {
    test.skip(!process.env.DRE_LOGIN_EMAIL || !process.env.DRE_LOGIN_PASSWORD, 'Login credentials are not configured.');

    await loginPage.navigate(urls.login);
    await loginPage.enterEmail(credentials.email);
    await loginPage.enterPassword(credentials.password);
    await loginPage.clickLogin();
    await loginPage.waitForAuthenticationCheckpoint();
    expect(await loginPage.isOtpPageVisible()).toBeTruthy();
  });
});
