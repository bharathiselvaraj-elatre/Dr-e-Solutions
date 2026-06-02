import { Given, Then, When } from '@cucumber/cucumber';
import { BranchPage } from '../pages/BranchPage';
import { CustomWorld } from '../hooks/world';
import { logRegressionStep } from '../utils/testLogger';
import { generateOTP } from '../utils/otp';
import { generateBranchTestData } from '../utils/testData';

const LOGIN_URL = 'https://dev-solutions.dr-e.com/login';
const DASHBOARD_URL = 'https://dev-solutions.dr-e.com/dashboard';
const FALLBACK_LOGIN_EMAIL =
  process.env.DRE_BRANCH_LOGIN_EMAIL ?? 'bharathiselvaraj.elatre@gmail.com';
const FALLBACK_LOGIN_PASSWORD = process.env.DRE_BRANCH_LOGIN_PASSWORD ?? 'Bhar@123';

function resolveBranchFlowCredentials() {
  return {
    email: FALLBACK_LOGIN_EMAIL,
    password: FALLBACK_LOGIN_PASSWORD,
  };
}

function getBranchPage(world: CustomWorld) {
  if (!world.page) {
    throw new Error('Playwright page was not initialized by the test hooks.');
  }

  return new BranchPage(world.page);
}

async function loginForBranchFlow(world: CustomWorld) {
  if (!world.page || !world.booking) {
    throw new Error('Playwright page was not initialized by the test hooks.');
  }

  await logRegressionStep(world, 'branch', 'opening login page for branch flow');
  await world.booking.navigate(LOGIN_URL);

  const credentials = resolveBranchFlowCredentials();
  await logRegressionStep(world, 'branch', 'logging in for branch regression', {
    email: credentials.email,
  });

  await world.booking.enterEmail(credentials.email);
  await world.booking.enterPassword(credentials.password);
  await world.booking.clickLogin();
  await world.booking.waitForAuthenticationCheckpoint();

  if (await world.booking.isOtpPageVisible()) {
    await world.booking.enterOtp(generateOTP());
  }

  await world.booking.verifyDashboard();
  await world.context?.storageState({ path: world.authFile });
  await logRegressionStep(world, 'branch', 'dashboard login verified and auth state saved', {
    authFile: world.authFile,
  });
}

Given('user logs into dr.e solutions for branch flow', async function (this: CustomWorld) {
  await loginForBranchFlow(this);
});

Given('user opens create branch form', async function (this: CustomWorld) {
  if (!this.page || !this.booking) {
    throw new Error('Playwright page was not initialized by the test hooks.');
  }

  if (await this.booking.isLoginPageVisible()) {
    await logRegressionStep(this, 'branch', 'branch session not active while opening create branch form, re-authenticating');
    await loginForBranchFlow(this);
  }

  const branchPage = getBranchPage(this);
  try {
    await branchPage.navigateToBranches();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/dashboard did not finish loading|could not navigate to branches/i.test(message)) {
      throw error;
    }

    await logRegressionStep(this, 'branch', 'branch navigation lost auth state, re-authenticating and retrying', {
      reason: message,
    });
    await loginForBranchFlow(this);
    await branchPage.navigateToBranches();
  }

  await branchPage.openCreateBranchForm();
  await logRegressionStep(this, 'branch', 'opened create branch form');
});

When(
  'user fills branch form with {string} {string} {string} {string} {string} {string}',
  async function (
    this: CustomWorld,
    branchName: string,
    branchEmail: string,
    phone: string,
    addressLine1: string,
    addressLine2: string,
    postalCode: string
  ) {
    const branchPage = getBranchPage(this);
    const generatedBranch = generateBranchTestData();
    this.branchData = {
      ...generatedBranch,
      branchName: branchName === 'AUTO' ? generatedBranch.branchName : branchName,
      branchEmail: branchEmail === 'AUTO' ? generatedBranch.branchEmail : branchEmail,
      phone: phone === 'AUTO' ? generatedBranch.phone : phone,
      addressLine1,
      addressLine2,
      postalCode,
    };

    await logRegressionStep(this, 'branch', 'prepared branch create data', this.branchData);
    await branchPage.fillBranchForm(this.branchData);
  }
);

When('user submits branch form', async function (this: CustomWorld) {
  const branchPage = getBranchPage(this);
  await logRegressionStep(this, 'branch', 'submitting branch form', this.branchData);
  await branchPage.submitBranchForm();
});

When(
  'user fills branch form with valid data except {string}',
  async function (this: CustomWorld, missingField: string) {
    const branchPage = getBranchPage(this);
    const generatedBranch = generateBranchTestData();
    this.branchData = generatedBranch;
    await logRegressionStep(this, 'branch', 'prepared negative branch data', {
      missingField,
      ...generatedBranch,
    });
    await branchPage.fillBranchFormWithMissingField(generatedBranch, missingField);
  }
);

Then('user should see branch result {string}', async function (this: CustomWorld, expected: string) {
  const branchPage = getBranchPage(this);
  const normalized = expected.trim().toLowerCase();

  if (normalized === 'branch created') {
    if (!this.branchData) {
      throw new Error('Branch data was not saved before creation verification.');
    }

    await branchPage.verifyBranchCreated(this.branchData);
    await logRegressionStep(this, 'branch', 'branch creation verified with saved data', this.branchData);
    return;
  }

  if (normalized === 'required validations displayed') {
    await branchPage.verifyRequiredValidations();
    await logRegressionStep(this, 'branch', 'required validations verified');
    return;
  }

  await branchPage.verifyMessage(expected);
});

Then('user should see branch validation message {string}', async function (this: CustomWorld, expected: string) {
  const branchPage = getBranchPage(this);
  await branchPage.verifyRequiredValidation(expected);
  await logRegressionStep(this, 'branch', 'specific validation verified', {
    message: expected,
  });
});

Then('user opens edit popup and validates saved data', async function (this: CustomWorld) {
  if (!this.branchData) {
    throw new Error('Branch data was not saved before validation.');
  }

  const branchPage = getBranchPage(this);
  await branchPage.openEditBranchPopup(this.branchData);
  await branchPage.verifyBranchDetailsInEditPopup(this.branchData);
  await branchPage.closeEditBranchPopup();
  await logRegressionStep(this, 'branch', 'edit popup saved data verified', this.branchData);
});

Then('user deletes the created branch', async function (this: CustomWorld) {
  if (!this.branchData) {
    throw new Error('Branch data was not saved before delete.');
  }

  const branchPage = getBranchPage(this);
  await branchPage.deleteCreatedBranch(this.branchData);
  await branchPage.verifyBranchDeleted(this.branchData);
  await logRegressionStep(this, 'branch', 'created branch deleted and removal verified', this.branchData);
});
