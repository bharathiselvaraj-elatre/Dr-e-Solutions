import { Given, Then, When } from '@cucumber/cucumber';
import { UserPage } from '../pages/UsersPage';
import { CustomWorld } from '../hooks/world';
import { generateUserTestDataForRole } from '../utils/testData';

function getUserPage(world: CustomWorld) {
  if (!world.page) {
    throw new Error('Playwright page was not initialized by the test hooks.');
  }

  return new UserPage(world.page);
}

Given('user opens create user form', async function (this: CustomWorld) {
  const userPage = getUserPage(this);
  await userPage.navigateToPeople();
  await userPage.openCreateUserForm();
});

When('user fills create user form with auto generated {string} data', async function (this: CustomWorld, role: string) {
  const userPage = getUserPage(this);
  this.userData = generateUserTestDataForRole(role);
  if (this.branchData?.branchName) {
    this.userData.branchName = this.branchData.branchName;
  }
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
    await userPage.fillCreateUserFormWithMissingField(this.userData, missingField);
  }
);

When('user submits create user form', async function (this: CustomWorld) {
  const userPage = getUserPage(this);
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
    return;
  }

  if (normalized === 'required validations displayed') {
    await userPage.verifyRequiredValidations();
    return;
  }

  throw new Error(`Unhandled expected user result "${expected}".`);
});

Then('user should see user validation message {string}', async function (this: CustomWorld, expected: string) {
  const userPage = getUserPage(this);
  await userPage.verifyRequiredValidation(expected);
});
