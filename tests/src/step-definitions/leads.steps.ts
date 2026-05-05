import { Given, Then, When } from '@cucumber/cucumber';
import { BoardPage } from '../pages/BoardPage';
import { LeadsPage } from '../pages/LeadsPage';
import { CustomWorld } from '../hooks/world';
import { generateLeadTestData } from '../utils/testData';

function getBoardPage(world: CustomWorld) {
  if (!world.page) {
    throw new Error('Playwright page was not initialized by the test hooks.');
  }

  return new BoardPage(world.page);
}

function getLeadsPage(world: CustomWorld) {
  if (!world.page) {
    throw new Error('Playwright page was not initialized by the test hooks.');
  }

  return new LeadsPage(world.page);
}

Given('user opens existing board page', async function (this: CustomWorld) {
  const boardPage = getBoardPage(this);
  await boardPage.navigateToBoard();
});

Given('user opens add lead form', async function (this: CustomWorld) {
  const leadsPage = getLeadsPage(this);
  await leadsPage.openAddLeadForm();
});

When('user fills lead form with auto generated data', async function (this: CustomWorld) {
  const leadsPage = getLeadsPage(this);
  this.leadData = generateLeadTestData();
  await leadsPage.fillLeadForm(this.leadData);
});

When('user fills lead form with valid data except {string}', async function (this: CustomWorld, missingField: string) {
  const leadsPage = getLeadsPage(this);
  this.leadData = generateLeadTestData();
  await leadsPage.fillLeadForm(this.leadData, missingField);
});

When('user submits lead form', async function (this: CustomWorld) {
  const leadsPage = getLeadsPage(this);
  await leadsPage.submitLeadForm();
});

Then('user should see lead result {string}', async function (this: CustomWorld, expected: string) {
  const leadsPage = getLeadsPage(this);
  const normalized = expected.trim().toLowerCase();

  if (normalized === 'lead created') {
    if (!this.leadData) {
      throw new Error('Lead data was not saved before creation verification.');
    }

    await leadsPage.verifyLeadCreated(this.leadData);
    return;
  }

  if (normalized === 'required validations displayed') {
    await leadsPage.verifyRequiredValidations();
    return;
  }

  await leadsPage.verifyRequiredValidation(expected);
});

Then('user should see lead validation message {string}', async function (this: CustomWorld, expected: string) {
  const leadsPage = getLeadsPage(this);
  await leadsPage.verifyRequiredValidation(expected);
});
