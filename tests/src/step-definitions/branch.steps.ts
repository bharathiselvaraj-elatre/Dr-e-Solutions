import { Given, Then, When } from '@cucumber/cucumber';
import { BranchPage } from '../pages/BranchPage';
import { CustomWorld } from '../hooks/world';
import { generateOTP } from '../utils/otp';
import { loadRuntimeCredentials } from '../utils/runtimeCredentials';
import { generateBranchTestData } from '../utils/testData';

const LOGIN_URL = 'https://dev-solutions.dr-e.com/login';
const DASHBOARD_URL = 'https://dev-solutions.dr-e.com/dashboard';
const FALLBACK_LOGIN_EMAIL =
  process.env.DRE_BRANCH_LOGIN_EMAIL ?? 'bharathiselvaraj.elatre@gmail.com';
const FALLBACK_LOGIN_PASSWORD = process.env.DRE_BRANCH_LOGIN_PASSWORD ?? 'Bhar@123';

function resolveBranchFlowCredentials() {
  try {
    const runtimeUser = loadRuntimeCredentials();
    return {
      email: runtimeUser.email,
      password: runtimeUser.password,
    };
  } catch {
    return {
      email: FALLBACK_LOGIN_EMAIL,
      password: FALLBACK_LOGIN_PASSWORD,
    };
  }
}

function getBranchPage(world: CustomWorld) {
  if (!world.page) {
    throw new Error('Playwright page was not initialized by the test hooks.');
  }

  return new BranchPage(world.page);
}

Given('user logs into dr.e solutions for branch flow', async function (this: CustomWorld) {
  if (!this.page || !this.booking) {
    throw new Error('Playwright page was not initialized by the test hooks.');
  }

  await this.booking.navigate(DASHBOARD_URL);
  if (!(await this.booking.isLoginPageVisible())) {
    await this.booking.verifyDashboard();
    return;
  }

  await this.booking.navigate(LOGIN_URL);

  const credentials = resolveBranchFlowCredentials();

  await this.booking.enterEmail(credentials.email);
  await this.booking.enterPassword(credentials.password);
  await this.booking.clickLogin();
  await this.booking.waitForAuthenticationCheckpoint();

  if (await this.booking.isOtpPageVisible()) {
    await this.booking.enterOtp(generateOTP());
  }

  await this.booking.verifyDashboard();
  await this.context?.storageState({ path: this.authFile });
});

Given('user opens create branch form', async function (this: CustomWorld) {
  const branchPage = getBranchPage(this);
  await branchPage.navigateToBranches();
  await branchPage.openCreateBranchForm();
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

    await branchPage.fillBranchForm(this.branchData);
  }
);

When('user submits branch form', async function (this: CustomWorld) {
  const branchPage = getBranchPage(this);
  await branchPage.submitBranchForm();
});

When(
  'user fills branch form with valid data except {string}',
  async function (this: CustomWorld, missingField: string) {
    const branchPage = getBranchPage(this);
    const generatedBranch = generateBranchTestData();
    this.branchData = generatedBranch;
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
    return;
  }

  if (normalized === 'required validations displayed') {
    await branchPage.verifyRequiredValidations();
    return;
  }

  await branchPage.verifyMessage(expected);
});

Then('user should see branch validation message {string}', async function (this: CustomWorld, expected: string) {
  const branchPage = getBranchPage(this);
  await branchPage.verifyRequiredValidation(expected);
});

Then('user opens edit popup and validates saved data', async function (this: CustomWorld) {
  if (!this.branchData) {
    throw new Error('Branch data was not saved before validation.');
  }

  const branchPage = getBranchPage(this);
  await branchPage.openEditBranchPopup(this.branchData);
  await branchPage.verifyBranchDetailsInEditPopup(this.branchData);
  await branchPage.closeEditBranchPopup();
});

Then('user deletes the created branch', async function (this: CustomWorld) {
  if (!this.branchData) {
    throw new Error('Branch data was not saved before delete.');
  }

  const branchPage = getBranchPage(this);
  await branchPage.deleteCreatedBranch(this.branchData);
  await branchPage.verifyBranchDeleted(this.branchData);
});
