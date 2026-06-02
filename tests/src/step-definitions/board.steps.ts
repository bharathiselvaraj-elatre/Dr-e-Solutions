import { Given, Then, When } from '@cucumber/cucumber';
import { BoardPage } from '../pages/BoardPage';
import { CustomWorld } from '../hooks/world';
import { logRegressionStep } from '../utils/testLogger';
import { generateBoardTestData } from '../utils/testData';

function getBoardPage(world: CustomWorld) {
  if (!world.page) {
    throw new Error('Playwright page was not initialized by the test hooks.');
  }

  return new BoardPage(world.page);
}

Given('user opens create board form', async function (this: CustomWorld) {
  if (!this.branchData?.branchName) {
    throw new Error('Branch data was not saved before board creation.');
  }

  const boardPage = getBoardPage(this);
  await boardPage.navigateToBoard();
  await boardPage.switchBranch(this.branchData.branchName);
  await boardPage.openCreateBoardForm(this.branchData.branchName);
  await logRegressionStep(this, 'board', 'opened create board form', {
    branchName: this.branchData.branchName,
  });
});

When('user fills board form with auto generated data', async function (this: CustomWorld) {
  const boardPage = getBoardPage(this);
  this.boardData = generateBoardTestData(this.branchData?.branchName);
  await logRegressionStep(this, 'board', 'prepared board create data', this.boardData);
  await boardPage.fillBoardForm(this.boardData);
});

When('user fills board form with valid data except {string}', async function (this: CustomWorld, missingField: string) {
  const boardPage = getBoardPage(this);
  this.boardData = generateBoardTestData(this.branchData?.branchName);
  await logRegressionStep(this, 'board', 'prepared negative board data', {
    missingField,
    ...this.boardData,
  });
  await boardPage.fillBoardForm(this.boardData, missingField);
});

When('user submits board form', async function (this: CustomWorld) {
  const boardPage = getBoardPage(this);
  await logRegressionStep(this, 'board', 'submitting board form', this.boardData);
  await boardPage.submitBoardForm();
});

Then('user should see board result {string}', async function (this: CustomWorld, expected: string) {
  const boardPage = getBoardPage(this);
  const normalized = expected.trim().toLowerCase();

  if (normalized === 'board created') {
    if (!this.boardData) {
      throw new Error('Board data was not saved before creation verification.');
    }

    await boardPage.verifyBoardCreated(this.boardData);
    await logRegressionStep(this, 'board', 'board creation verified with saved data', this.boardData);
    return;
  }

  if (normalized === 'required validations displayed') {
    await boardPage.verifyRequiredValidations();
    await logRegressionStep(this, 'board', 'required validations verified');
    return;
  }

  await boardPage.verifyRequiredValidation(expected);
  await logRegressionStep(this, 'board', 'board validation verified', {
    message: expected,
  });
});

Then('user should see board validation message {string}', async function (this: CustomWorld, expected: string) {
  const boardPage = getBoardPage(this);
  await boardPage.verifyRequiredValidation(expected);
  await logRegressionStep(this, 'board', 'specific validation verified', {
    message: expected,
  });
});
