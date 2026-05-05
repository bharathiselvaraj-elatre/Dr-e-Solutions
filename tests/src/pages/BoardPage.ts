import { expect, type Page } from '@playwright/test';
import { type BoardStatusData, type BoardTestData } from '../utils/testData';

export class BoardPage {
  constructor(private page: Page) {}

  async navigateToBoard() {
    await this.dismissBlockingModalIfPresent();
    await this.page.goto('https://dev-solutions.dr-e.com/board', { waitUntil: 'commit', timeout: 60000 });
    await this.page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});

    const readyIndicators = [
      this.page.getByRole('button', { name: 'Create Board' }).first(),
      this.page.getByRole('button', { name: /add lead/i }).first(),
      this.page.getByRole('button', { name: /switch branch/i }).first(),
      this.page.getByText(/board/i).first(),
    ];

    const deadline = Date.now() + 60000;
    let reloadedForProfile = false;
    while (Date.now() < deadline) {
      const bodyText = await this.page.locator('body').innerText().catch(() => '');
      if (/loading your profile/i.test(bodyText)) {
        if (!reloadedForProfile && Date.now() + 20000 < deadline) {
          reloadedForProfile = true;
          await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
        }
        await this.page.waitForTimeout(500);
        continue;
      }

      for (const indicator of readyIndicators) {
        if (await indicator.isVisible().catch(() => false)) {
          return;
        }
      }

      await this.page.waitForTimeout(250);
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    throw new Error(`Board page did not become ready. Visible page text:\n${bodyText}`);
  }

  async switchBranch(branchName: string) {
    const switchBranchButton = this.page.getByRole('button', { name: /Switch branch\. Current branch/i }).first();

    if (!(await switchBranchButton.isVisible().catch(() => false))) {
      return;
    }

    const currentBranchLabel = (await switchBranchButton.innerText().catch(() => '')).toLowerCase();
    if (currentBranchLabel.includes(branchName.toLowerCase())) {
      return;
    }

    await switchBranchButton.click();

    const branchOption = this.page.getByRole('button', {
      name: new RegExp(`^${this.escapeForRegex(branchName)}$`, 'i'),
    }).first();

    if (await branchOption.isVisible().catch(() => false)) {
      await branchOption.click();
      return;
    }

    await this.page.keyboard.press('Escape').catch(() => {});
  }

  async openCreateBoardForm() {
    await this.page.getByRole('button', { name: 'Create Board' }).click();
    await expect(this.page.getByRole('textbox', { name: 'Board Name*' })).toBeVisible({ timeout: 10000 });
  }

  async fillBoardForm(board: BoardTestData, missingField?: string) {
    const normalizedField = missingField?.trim().toLowerCase();

    await this.page.getByRole('textbox', { name: 'Board Name*' }).fill(
      normalizedField === 'board name' ? '' : board.boardName
    );
    await this.page.getByRole('textbox', { name: 'Description*' }).fill(
      normalizedField === 'description' ? '' : board.description
    );

    if (normalizedField !== 'status') {
      for (const status of board.statuses) {
        await this.addStatus(status);
      }
    }
  }

  async submitBoardForm() {
    await this.page.getByRole('button', { name: 'Create', exact: true }).click();
  }

  async verifyBoardCreated(board: BoardTestData) {
    const indicators = [
      this.page.getByText(new RegExp(this.escapeForRegex(board.boardName), 'i')).first(),
      this.page.getByRole('button', { name: /add lead/i }).first(),
      this.page.getByText(/created successfully/i).first(),
    ];

    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      for (const indicator of indicators) {
        if (await indicator.isVisible().catch(() => false)) {
          return;
        }
      }

      await this.page.waitForTimeout(250);
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    throw new Error(`Expected board creation confirmation, but none were found. Visible page text:\n${bodyText}`);
  }

  async verifyRequiredValidations() {
    await expect(this.page.locator('body')).toContainText(/required|status/i, { timeout: 10000 });
  }

  async verifyRequiredValidation(message: string) {
    await expect(this.page.locator('body')).toContainText(message, { ignoreCase: true, timeout: 10000 });
  }

  private async addStatus(status: BoardStatusData) {
    await this.page.getByRole('button', { name: 'Add Status' }).click();
    await this.page.getByRole('textbox', { name: 'Name*', exact: true }).fill(status.name);

    if (status.type) {
      const typeButton = this.page.getByRole('button', { name: new RegExp(`^${this.escapeForRegex(status.type)}$`, 'i') });
      if (await typeButton.first().isVisible().catch(() => false)) {
        await typeButton.first().click();
      }
    }

    if (status.color) {
      const colorInput = this.page.getByRole('textbox', { name: 'Pick status color' }).last();
      if (await colorInput.isVisible().catch(() => false)) {
        await colorInput.fill(status.color);
      }
    }

    await this.page.getByRole('button', { name: 'Add status to list' }).click();
  }

  private async dismissBlockingModalIfPresent() {
    const modal = this.page.locator('.modal:visible, [role="dialog"]:visible').last();

    if (!(await modal.isVisible().catch(() => false))) {
      return;
    }

    const closeCandidates = [
      modal.getByRole('button', { name: /close|cancel|done/i }).first(),
      modal.locator('button[aria-label="Close"], button[aria-label="close"]').first(),
    ];

    for (const button of closeCandidates) {
      if (await button.isVisible().catch(() => false)) {
        await button.click({ force: true }).catch(() => {});
        await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
        if (!(await modal.isVisible().catch(() => false))) {
          return;
        }
      }
    }

    await this.page.keyboard.press('Escape').catch(() => {});
    await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  private escapeForRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
