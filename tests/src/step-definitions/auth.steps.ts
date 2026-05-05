import { Given, Then, When } from '@cucumber/cucumber';
import SignupPage from '../pages/SignupPage';
import { CustomWorld } from '../hooks/world';
import { generateOTP } from '../utils/otp';
import { loadRuntimeCredentials, saveRuntimeCredentials } from '../utils/runtimeCredentials';

const SIGNUP_URL = 'https://dev-solutions.dr-e.com/sign-up';
const LOGIN_URL = 'https://dev-solutions.dr-e.com/login';
const DASHBOARD_URL = 'https://dev-solutions.dr-e.com/dashboard';
const DEFAULT_LOGIN_EMAIL =
  process.env.DRE_LOGIN_EMAIL ?? process.env.DRE_BRANCH_LOGIN_EMAIL ?? 'bharathiselvaraj.elatre@gmail.com';
const DEFAULT_LOGIN_PASSWORD =
  process.env.DRE_LOGIN_PASSWORD ?? process.env.DRE_BRANCH_LOGIN_PASSWORD ?? 'Bhar@123';

function resolveRuntimeLoginValue(value: string) {
  if (value === 'DEFAULT_LOGIN_EMAIL' || value === 'EXISTING_LOGIN_EMAIL') {
    return DEFAULT_LOGIN_EMAIL;
  }

  if (value === 'DEFAULT_LOGIN_PASSWORD' || value === 'EXISTING_LOGIN_PASSWORD') {
    return DEFAULT_LOGIN_PASSWORD;
  }

  if (value === 'RUNTIME_SIGNUP_EMAIL') {
    return loadRuntimeCredentials().email;
  }

  if (value === 'RUNTIME_SIGNUP_PASSWORD') {
    return loadRuntimeCredentials().password;
  }

  return value;
}

function resolveSpecialValue(value: string, field: 'email' | 'mobile' | 'default') {
  if (value !== 'AUTO') {
    return value;
  }

  const stamp = Date.now().toString();

  if (field === 'email') {
    return `qa.${stamp}@example.com`;
  }

  if (field === 'mobile') {
    return `9${stamp.slice(-9)}`;
  }

  return value;
}

function buildRuntimeSignupData() {
  const stamp = Date.now().toString();
  const alphaSuffix = stamp
    .slice(-6)
    .split('')
    .map((digit) => String.fromCharCode(65 + Number(digit)))
    .join('');
  const firstName = `Auto${alphaSuffix.slice(0, 3)}`;
  const lastName = `User${alphaSuffix.slice(3)}`;
  const organization = 'QA Org';
  const email = `qa.${stamp}@example.com`;
  const mobile = `9${stamp.slice(-9)}`;
  const password = 'Bhar@123';

  return {
    firstName,
    lastName,
    organization,
    email,
    mobile,
    password,
    confirmPassword: password,
  };
}

function getSignupPage(world: CustomWorld) {
  if (!world.page) {
    throw new Error('Playwright page was not initialized by the test hooks.');
  }

  return new SignupPage(world.page);
}

async function ensureLoginPage(world: CustomWorld) {
  if (!world.page || !world.booking) {
    throw new Error('Playwright page was not initialized by the test hooks.');
  }

  if (world.page.url() === 'about:blank') {
    await world.booking.navigate(LOGIN_URL);
  }
}

async function ensureRuntimeSignupSession(world: CustomWorld) {
  if (!world.page || !world.booking || !world.context) {
    throw new Error('Playwright page was not initialized by the test hooks.');
  }

  await world.booking.navigate(DASHBOARD_URL);
  if (!(await world.booking.isLoginPageVisible())) {
    await world.booking.verifyDashboard();
    return;
  }

  try {
    const runtimeCredentials = world.runtimeCredentials ?? loadRuntimeCredentials();
    world.runtimeCredentials = runtimeCredentials;

    await world.booking.navigate(LOGIN_URL);
    await world.booking.enterEmail(runtimeCredentials.email);
    await world.booking.enterPassword(runtimeCredentials.password);
    await world.booking.clickLogin();
    await world.booking.waitForAuthenticationCheckpoint();

    if (await world.booking.isOtpPageVisible()) {
      await world.booking.enterOtp(generateOTP());
    }

    await world.booking.verifyDashboard();
    await world.context.storageState({ path: world.authFile });
    return;
  } catch {
    // Fall back to creating a fresh signup user when no reusable runtime user exists.
  }

  const signupPage = getSignupPage(world);
  const runtimeSignupData = buildRuntimeSignupData();
  world.runtimeCredentials = {
    email: runtimeSignupData.email,
    password: runtimeSignupData.password,
    firstName: runtimeSignupData.firstName,
    lastName: runtimeSignupData.lastName,
    organization: runtimeSignupData.organization,
    mobile: runtimeSignupData.mobile,
  };

  saveRuntimeCredentials(world.runtimeCredentials);

  await signupPage.navigate(SIGNUP_URL);
  await signupPage.fillSignupForm(runtimeSignupData);
  await signupPage.clickRegister();

  try {
    await signupPage.verifyOtpPage();
    await signupPage.enterOtp(generateOTP());
  } catch {
    // Continue when signup already redirects straight to the dashboard.
  }

  await signupPage.verifyDashboard();
  await world.context.storageState({ path: world.authFile });
}

Given('I navigate to the login page', async function (this: CustomWorld) {
  await ensureLoginPage(this);
  await this.booking!.navigate(LOGIN_URL);
});

Given('I open login page in a fresh session', async function (this: CustomWorld) {
  if (!this.page || !this.booking || !this.context) {
    throw new Error('Playwright page was not initialized by the test hooks.');
  }

  await this.context.clearCookies();
  await this.booking.navigate(LOGIN_URL);
  await this.page
    .evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    })
    .catch(() => {});
  await this.page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
});

Given('user is on signup page', async function (this: CustomWorld) {
  const signupPage = getSignupPage(this);
  await signupPage.navigate(SIGNUP_URL);
});

Given('runtime signup user is authenticated for setup flow', async function (this: CustomWorld) {
  await ensureRuntimeSignupSession(this);
});

When('I enter email {string}', async function (this: CustomWorld, email: string) {
  await ensureLoginPage(this);
  await this.booking!.enterEmail(resolveRuntimeLoginValue(email));
});

When('I enter password {string}', async function (this: CustomWorld, password: string) {
  await this.booking!.enterPassword(resolveRuntimeLoginValue(password));
});

When('I click the Login Now button', async function (this: CustomWorld) {
  await this.booking!.clickLogin();
});

When('I enter dynamic OTP if OTP page is displayed', async function (this: CustomWorld) {
  if (!this.page || !this.booking) {
    throw new Error('Playwright page was not initialized by the test hooks.');
  }

  if (await this.booking.isOtpPageVisible()) {
    await this.booking.enterOtp(generateOTP());
  }
});

When(
  'user fills signup form with {string} {string} {string} {string} {string} {string} {string}',
  async function (
    this: CustomWorld,
    firstName: string,
    lastName: string,
    organization: string,
    email: string,
    mobile: string,
    password: string,
    confirmPassword: string
  ) {
    const signupPage = getSignupPage(this);

    await signupPage.fillSignupForm({
      firstName,
      lastName,
      organization,
      email: resolveSpecialValue(email, 'email'),
      mobile: resolveSpecialValue(mobile, 'mobile'),
      password,
      confirmPassword,
    });
  }
);

When('user fills signup form with runtime generated signup data', async function (this: CustomWorld) {
  const signupPage = getSignupPage(this);
  const runtimeSignupData = buildRuntimeSignupData();
  this.runtimeCredentials = {
    email: runtimeSignupData.email,
    password: runtimeSignupData.password,
    firstName: runtimeSignupData.firstName,
    lastName: runtimeSignupData.lastName,
    organization: runtimeSignupData.organization,
    mobile: runtimeSignupData.mobile,
  };

  saveRuntimeCredentials(this.runtimeCredentials);

  console.log(`Runtime signup user created for login: ${runtimeSignupData.email} / ${runtimeSignupData.password}`);

  await signupPage.fillSignupForm(runtimeSignupData);
});

When('user clicks register button', async function (this: CustomWorld) {
  const signupPage = getSignupPage(this);
  await signupPage.clickRegister();
});

When('user submits blank signup form', async function (this: CustomWorld) {
  const signupPage = getSignupPage(this);
  await signupPage.fillSignupForm({
    firstName: '',
    lastName: '',
    organization: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
  });
  await signupPage.clickRegister();
});

When('user enters valid OTP on signup page', async function (this: CustomWorld) {
  const signupPage = getSignupPage(this);
  await signupPage.enterOtp(generateOTP());
});

When('user enters signup OTP {string} and confirms', async function (this: CustomWorld, otp: string) {
  const signupPage = getSignupPage(this);
  await signupPage.enterOtp(otp);
});

Then('I should see {string}', async function (this: CustomWorld, expected: string) {
  const normalized = expected.trim().toLowerCase();

  if (!normalized) {
    return;
  }

  if (normalized === 'dashboard') {
    try {
      await this.booking!.waitForAuthenticationCheckpoint();

      if (await this.booking!.isOtpPageVisible()) {
        try {
          await this.booking!.enterOtp(generateOTP());
        } catch {
          await this.page?.waitForTimeout(2000);
        }
      }

      await this.booking!.verifyDashboard();
    } catch {
      await this.page?.waitForTimeout(2500);
      await this.booking!.verifyDashboard();
    }

    await this.context?.storageState({ path: this.authFile });
    return;
  }

  if (normalized === 'otp page') {
    await this.booking!.verifyOtpPage();
    await this.booking!.enterOtp(generateOTP());
    return;
  }

  if (normalized === 'required') {
    await this.booking!.verifyRequiredFields();
    return;
  }

  if (normalized === 'invalid email or password') {
    await this.booking!.verifyLoginFailure();
    return;
  }

  const bodyText = await this.booking!.getVisibleBodyText();
  throw new Error(`Unhandled expected state "${expected}". Visible page text:\n${bodyText}`);
});

Then('user should see signup state {string}', async function (this: CustomWorld, expected: string) {
  const signupPage = getSignupPage(this);
  const normalized = expected.trim().toLowerCase();

  if (normalized === 'otp page') {
    await signupPage.verifyOtpPage();
    return;
  }

  if (normalized === 'dashboard') {
    try {
      await signupPage.verifyOtpPage();
      await signupPage.enterOtp(generateOTP());
    } catch {
      // Continue when signup already redirects straight to the dashboard.
    }

    await signupPage.verifyDashboard();
    await this.context?.storageState({ path: this.authFile });
    return;
  }

  if (expected) {
    await signupPage.verifyMessage(expected);
    return;
  }

  const bodyText = await signupPage.getVisibleBodyText();
  throw new Error(`Unhandled expected signup state "${expected}". Visible page text:\n${bodyText}`);
});

Then('user should see all signup required validations', async function (this: CustomWorld) {
  const signupPage = getSignupPage(this);
  await signupPage.verifyRequiredValidations();
});
