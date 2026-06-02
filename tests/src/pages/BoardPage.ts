import { expect, type Page } from '@playwright/test';
import { type BoardStatusData, type BoardTestData } from '../utils/testData';

export class BoardPage {
  constructor(private page: Page) {}

  async navigateToBoard() {
    await this.dismissBlockingModalIfPresent();
    await this.page.goto('https://dev-solutions.dr-e.com/board', { waitUntil: 'commit', timeout: 60000 });
    await this.page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});

    const readyIndicators = [
      this.getCreateBoardTrigger(),
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
    const switchBranchButton = this.getSwitchBranchButton();

    if (!(await switchBranchButton.isVisible().catch(() => false))) {
      return;
    }

    const currentBranchLabel = (await switchBranchButton.innerText().catch(() => '')).toLowerCase();
    if (currentBranchLabel.includes(branchName.toLowerCase()) && currentBranchLabel !== 'switch branch') {
      return;
    }

    await switchBranchButton.click();

    const optionCandidates = [
      this.page.getByRole('button', {
        name: new RegExp(`^${this.escapeForRegex(branchName)}$`, 'i'),
      }).first(),
      this.page.getByRole('option', {
        name: new RegExp(`^${this.escapeForRegex(branchName)}$`, 'i'),
      }).first(),
      this.page.getByText(new RegExp(`^${this.escapeForRegex(branchName)}$`, 'i')).first(),
      this.page.getByText(new RegExp(this.escapeForRegex(branchName), 'i')).first(),
    ];

    for (const branchOption of optionCandidates) {
      if (await branchOption.isVisible().catch(() => false)) {
        await branchOption.click({ force: true }).catch(async () => {
          await branchOption.click();
        });
        await this.waitForBranchSelection(branchName);
        return;
      }
    }

    await this.page.keyboard.press('Escape').catch(() => {});
    throw new Error(`Could not switch to branch "${branchName}" from the board page.`);
  }

  async openCreateBoardForm(preferredBranchName?: string) {
    await this.dismissBlockingModalIfPresent();
    const createBoardButton = this.getCreateBoardTrigger();

    if (!(await createBoardButton.isVisible().catch(() => false))) {
      await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
      await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await this.dismissBlockingModalIfPresent();
    }

    if (!(await createBoardButton.isVisible().catch(() => false))) {
      const branchSwitched = await this.switchToBranchWithoutBoard(preferredBranchName);
      if (branchSwitched && (await createBoardButton.isVisible().catch(() => false))) {
        await createBoardButton.click();
        await this.waitForBoardComposerToBeReady();
        return;
      }
    }

    if (!(await createBoardButton.isVisible().catch(() => false))) {
      const bodyText = await this.page.locator('body').innerText().catch(() => '');
      throw new Error(`Create Board button is not visible on the selected branch. Visible page text:\n${bodyText}`);
    }

    await createBoardButton.click();
    await this.waitForBoardComposerToBeReady();
  }

  async fillBoardForm(board: BoardTestData, missingField?: string) {
    await this.ensureBoardFormFieldsAreOpen();
    const normalizedField = missingField?.trim().toLowerCase();

    await this.getBoardNameField().fill(normalizedField === 'board name' ? '' : board.boardName);
    await this.getBoardDescriptionField().fill(normalizedField === 'description' ? '' : board.description);

    if (normalizedField !== 'status') {
      for (const status of board.statuses) {
        await this.addStatus(status);
      }
    }
  }

  async submitBoardForm() {
    const submitCandidates = [
      this.page.getByRole('button', { name: /^create$/i }).last(),
      this.page.getByRole('button', { name: /^create board$/i }).last(),
      this.page.getByRole('button', { name: /^save$/i }).last(),
      this.page.locator('button').filter({ hasText: /create board|create|save/i }).last(),
    ];

    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      for (const candidate of submitCandidates) {
        if (await candidate.isVisible().catch(() => false)) {
          await candidate.scrollIntoViewIfNeeded().catch(() => {});
          await candidate.click({ force: true, timeout: 5000 });
          return;
        }
      }

      await this.page.waitForTimeout(250);
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    throw new Error(`Could not find a board form submit button. Visible page text:\n${bodyText}`);
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
    await this.dismissBlockingModalIfPresent();
    const addStatusButton = this.page
      .getByRole('button', { name: /add status|new status/i })
      .or(this.page.locator('button').filter({ hasText: /add status|new status/i }))
      .first();
    await addStatusButton.click();
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

    const addToListButton = this.page
      .getByRole('button', { name: /add status to list|add to list|save status|done/i })
      .or(this.page.locator('button').filter({ hasText: /add status to list|add to list|save status|done/i }))
      .last();
    await addToListButton.click({ force: true });
    await this.dismissBlockingModalIfPresent();
  }

  private async dismissBlockingModalIfPresent() {
    const modals = this.page.locator(
      '.modal:visible, [role="dialog"]:visible, .delete-confirm-modal:visible, .crm-templates-page__delete-confirm-over-drawer:visible'
    );
    const modalCount = await modals.count().catch(() => 0);

    for (let index = modalCount - 1; index >= 0; index--) {
      const modal = modals.nth(index);
      if (!(await modal.isVisible().catch(() => false))) {
        continue;
      }

      const closeCandidates = [
        modal.getByRole('button', { name: /close|cancel|done|no|stay|keep editing|continue editing/i }).first(),
        modal.locator('button[aria-label="Close"], button[aria-label="close"]').first(),
        modal.locator('button').filter({ hasText: /close|cancel|done|no|stay|keep editing|continue editing/i }).first(),
      ];

      for (const button of closeCandidates) {
        if (await button.isVisible().catch(() => false)) {
          await button.click({ force: true }).catch(() => {});
          await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
          if (!(await modal.isVisible().catch(() => false))) {
            break;
          }
        }
      }

      if (await modal.isVisible().catch(() => false)) {
        await this.page.keyboard.press('Escape').catch(() => {});
        await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      }
    }
  }

  private escapeForRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async waitForBranchSelection(branchName: string) {
    const overlay = this.page.locator(
      '[role="listbox"]:visible, [role="dialog"]:visible, .dropdown-menu:visible, .menu:visible, .popover:visible'
    ).last();
    await overlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const createBoardButton = this.getCreateBoardTrigger();
      const addLeadButton = this.page.getByRole('button', { name: /add lead/i }).first();
      const pageText = (await this.page.locator('body').innerText().catch(() => '')).toLowerCase();

      if (
        (await createBoardButton.isVisible().catch(() => false)) ||
        (await addLeadButton.isVisible().catch(() => false)) ||
        pageText.includes(branchName.toLowerCase())
      ) {
        return;
      }

      await this.page.waitForTimeout(250);
    }
  }

  private getSwitchBranchButton() {
    return this.page.getByRole('button', { name: /switch branch/i }).first();
  }

  private getCreateBoardTrigger() {
    return this.page
      .getByRole('button', { name: /create board|add board|new board/i })
      .or(this.page.locator('button, a').filter({ hasText: /create board|add board|new board/i }))
      .first();
  }

  private async waitForBoardComposerToBeReady() {
    await this.dismissBlockingModalIfPresent();
    const readySignals = [
      this.page.getByText(/create your board for/i).first(),
      this.getBoardNameField(),
      this.getBoardDescriptionField(),
      this.page.getByRole('button', { name: /add status|new status/i }).first(),
    ];

    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      for (const signal of readySignals) {
        if (await signal.isVisible().catch(() => false)) {
          return;
        }
      }

      await this.page.waitForTimeout(250);
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    throw new Error(`Board form did not become ready. Visible page text:\n${bodyText}`);
  }

  private async ensureBoardFormFieldsAreOpen() {
    const nameField = this.getBoardNameField();
    if (await nameField.isVisible().catch(() => false)) {
      return;
    }

    const splashCreateButton = this.page
      .getByRole('button', { name: /^create board$/i })
      .or(this.page.locator('button, a').filter({ hasText: /^create board$/i }))
      .first();

    if (await splashCreateButton.isVisible().catch(() => false)) {
      await splashCreateButton.click({ force: true }).catch(() => {});
      await this.dismissBlockingModalIfPresent();
    }

    const readySignals = [this.getBoardNameField(), this.getBoardDescriptionField()];
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      for (const signal of readySignals) {
        if (await signal.isVisible().catch(() => false)) {
          return;
        }
      }

      await this.page.waitForTimeout(250);
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    throw new Error(`Board fields did not become visible. Visible page text:\n${bodyText}`);
  }

  private getBoardNameField() {
    return this.page
      .locator('input[name="templateName"]')
      .or(this.page.locator('input[placeholder*="Dental Appointment Board"]'))
      .or(this.page.getByRole('textbox', { name: /board name/i }))
      .first();
  }

  private getBoardDescriptionField() {
    return this.page
      .locator('textarea[name="description"]')
      .or(this.page.getByRole('textbox', { name: /description/i }))
      .or(this.page.locator('textarea[placeholder*="Track patient appointments"]'))
      .or(this.page.locator('textarea').first())
      .first();
  }

  private async switchToBranchWithoutBoard(preferredBranchName?: string) {
    const switchBranchButton = this.getSwitchBranchButton();
    if (!(await switchBranchButton.isVisible().catch(() => false))) {
      return false;
    }

    const candidateNames = await this.getBranchCandidates(preferredBranchName);
    for (const branchName of candidateNames) {
      await switchBranchButton.click({ force: true }).catch(() => {});
      const branchOption = await this.findBranchOption(branchName);
      if (!branchOption) {
        await this.page.keyboard.press('Escape').catch(() => {});
        continue;
      }

      await branchOption.click({ force: true }).catch(async () => {
        await branchOption.click();
      });
      await this.waitForBranchSelection(branchName);

      const createBoardButton = this.getCreateBoardTrigger();
      if (await createBoardButton.isVisible().catch(() => false)) {
        return true;
      }
    }

    await this.page.keyboard.press('Escape').catch(() => {});
    return false;
  }

  private async getBranchCandidates(preferredBranchName?: string) {
    const names: string[] = [];
    if (preferredBranchName) {
      names.push(preferredBranchName);
    }

    const switchBranchButton = this.getSwitchBranchButton();
    await switchBranchButton.click({ force: true }).catch(() => {});

    const overlay = this.page.locator('[role="listbox"]:visible, [role="dialog"]:visible, .dropdown-menu:visible, .menu:visible, .popover:visible').last();
    const optionLocators = [
      overlay.getByRole('option'),
      overlay.getByRole('button'),
      overlay.locator('[role="option"], button'),
    ];

    let options = optionLocators[0];
    for (const locator of optionLocators) {
      if ((await locator.count().catch(() => 0)) > 0) {
        options = locator;
        break;
      }
    }

    const count = await options.count().catch(() => 0);
    for (let index = 0; index < count; index++) {
      const option = options.nth(index);
      if (!(await option.isVisible().catch(() => false))) {
        continue;
      }

      const text = ((await option.innerText().catch(() => '')) ?? '').trim();
      if (!text || /^(switch branch|filter|create board|add lead|today)$/i.test(text)) {
        continue;
      }

      if (!names.some((name) => name.toLowerCase() === text.toLowerCase())) {
        names.push(text);
      }
    }

    await this.page.keyboard.press('Escape').catch(() => {});
    return names;
  }

  private async findBranchOption(branchName: string) {
    const candidates = [
      this.page.getByRole('button', { name: new RegExp(`^${this.escapeForRegex(branchName)}$`, 'i') }).first(),
      this.page.getByRole('option', { name: new RegExp(`^${this.escapeForRegex(branchName)}$`, 'i') }).first(),
      this.page.getByText(new RegExp(`^${this.escapeForRegex(branchName)}$`, 'i')).first(),
      this.page.getByText(new RegExp(this.escapeForRegex(branchName), 'i')).first(),
    ];

    for (const candidate of candidates) {
      if (await candidate.isVisible().catch(() => false)) {
        return candidate;
      }
    }

    return null;
  }
}
