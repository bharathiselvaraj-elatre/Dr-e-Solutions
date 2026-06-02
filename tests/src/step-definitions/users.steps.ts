import { Given, Then, When } from '@cucumber/cucumber';
import { UserPage } from '../pages/UsersPage';
import { CustomWorld } from '../hooks/world';
import { logRegressionStep } from '../utils/testLogger';
import { generateUserTestDataForRole } from '../utils/testData';

function getUserPage(world: CustomWorld) {
  if (!world.page) {
    throw new Error('Playwright page was not initialized by the test hooks.');
  }

  return new UserPage(world.page);
}

Given('user opens create user form', async function (this: CustomWorld) {
  const userPage = getUserPage(this);
  await userPage.navigateToPeople(this.branchData?.branchName);
  await userPage.openCreateUserForm();
  await logRegressionStep(this, 'user', 'opened create user form');
});

When('user fills create user form with auto generated {string} data', async function (this: CustomWorld, role: string) {
  const userPage = getUserPage(this);
  this.userData = generateUserTestDataForRole(role);
  if (this.branchData?.branchName) {
    this.userData.branchName = this.branchData.branchName;
  }
  await logRegressionStep(this, 'user', 'prepared user create data', this.userData);
  await userPage.fillCreateUserForm(this.userData);
});

When(
  'user fills create user form with valid {string} data except {string}',
  async function (this: CustomWorld, role: string, missingField: string) {
    const userPage = getUserPage(this);
    this.userData = generateUserTestDataForRole(role);
    if (this.branchData?.branchName) {
      this.userData.branchName = this.branchData.branchName;
    }
    await logRegressionStep(this, 'user', 'prepared negative user data', {
      missingField,
      ...this.userData,
    });
    await userPage.fillCreateUserFormWithMissingField(this.userData, missingField);
  }
);

When('user submits create user form', async function (this: CustomWorld) {
  const userPage = getUserPage(this);
  await logRegressionStep(this, 'user', 'submitting user form', this.userData);
  await userPage.submitCreateUserForm();
});

Then('user should see user result {string}', async function (this: CustomWorld, expected: string) {
  const userPage = getUserPage(this);
  const normalized = expected.trim().toLowerCase();

  if (normalized === 'user created') {
    if (!this.userData) {
      throw new Error('User data was not saved before creation verification.');
    }

    await userPage.verifyUserCreated(this.userData);
    await logRegressionStep(this, 'user', 'user creation verified with saved data', this.userData);
    return;
  }

  if (normalized === 'required validations displayed') {
    await userPage.verifyRequiredValidations();
    await logRegressionStep(this, 'user', 'required validations verified');
    return;
  }

  throw new Error(`Unhandled expected user result "${expected}".`);
});

Then('user should see user validation message {string}', async function (this: CustomWorld, expected: string) {
  const userPage = getUserPage(this);
  await userPage.verifyRequiredValidation(expected);
  await logRegressionStep(this, 'user', 'specific validation verified', {
    message: expected,
  });
});
