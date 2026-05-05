import { expect, type Page } from '@playwright/test';
import { type BranchTestData } from '../utils/testData';

export class BranchPage {
  constructor(private page: Page) {}

  async navigateToBranches() {
    await this.page.goto('https://dev-solutions.dr-e.com/branches', { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/\/branches\/?$/i, { timeout: 30000 });

    const readyIndicators = [
      this.page.getByRole('heading', { name: /^Branches$/i }).first(),
      this.page.getByRole('button', { name: /add new branch|create branch/i }).first(),
      this.page.getByRole('link', { name: /^Branches$/i }).first(),
    ];

    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      const bodyText = await this.page.locator('body').innerText().catch(() => '');
      if (/loading your profile/i.test(bodyText)) {
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
    throw new Error(`Branches page did not show an expected ready indicator. Visible page text:\n${bodyText}`);
  }

  async openCreateBranchForm() {
    await this.page
      .getByRole('button', { name: /add new branch|create branch/i })
      .first()
      .click();
  }

  async fillBranchForm(branch: BranchTestData) {
    await this.fillBranchFormWithMissingField(branch);
  }

  async fillBranchFormWithMissingField(branch: BranchTestData, missingField?: string) {
    const normalizedField = missingField?.trim().toLowerCase();

    await this.typeSlowly(
      this.page.getByRole('textbox', { name: 'Branch Name*' }),
      normalizedField === 'branch name' ? '' : branch.branchName
    );
    await this.typeSlowly(
      this.page.getByRole('textbox', { name: 'Branch Email*' }),
      normalizedField === 'branch email' ? '' : branch.branchEmail
    );
    await this.typeSlowly(
      this.page.getByRole('textbox', { name: /^(branch )?prefix\*?$/i }).first(),
      normalizedField === 'prefix' ? '' : branch.prefix
    );

    await this.openBranchCategoryDropdown();
    for (const category of branch.categories) {
      await this.clickBranchCategoryOption(category);
    }
    await this.closeBranchCategoryDropdown();

    await this.typeSlowly(
      this.page.getByRole('textbox', { name: 'Phone*' }),
      normalizedField === 'phone' ? '' : branch.phone
    );
    await this.typeSlowly(
      this.page.getByRole('textbox', { name: 'Address Line 1*' }),
      normalizedField === 'address line 1' ? '' : branch.addressLine1
    );
    await this.typeSlowly(this.page.getByRole('textbox', { name: 'Address Line 2' }), branch.addressLine2);

    await this.selectCountry(branch.country);

    if (normalizedField !== 'state') {
      await this.selectState(branch.state);
    }

    if (normalizedField !== 'city') {
      await this.selectCity(branch.city);
    }

    await this.typeSlowly(
      this.page.getByRole('textbox', { name: 'Postal Code*' }),
      normalizedField === 'postal code' ? '' : branch.postalCode
    );
  }

  async submitBranchForm() {
    await this.scrollBranchDialogToBottom();

    const submitButton = this.page.getByRole('button', { name: /^create branch$/i }).last();

    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click({ force: true, timeout: 10000 });
  }

  async verifyBranchCreated(branch: BranchTestData) {
    await this.dismissBranchCreatedToastIfPresent();
    await this.page.waitForLoadState('networkidle');
    await expect(this.page.getByText(new RegExp(branch.branchName, 'i'))).toBeVisible({
      timeout: 15000,
    });
  }

  async dismissBranchCreatedToastIfPresent() {
    const successMessages = [
      this.page.getByText(/branch created successfully/i),
      this.page.getByText(/created successfully/i),
    ];

    for (const message of successMessages) {
      if (await message.first().isVisible().catch(() => false)) {
        await expect(message.first()).toBeVisible({ timeout: 10000 });
        await this.closeSuccessToast(message.first());
        return;
      }
    }
  }

  async openEditBranchPopup(branch: BranchTestData) {
    await this.page.getByRole('button', { name: new RegExp(`^Edit ${this.escapeForRegex(branch.branchName)}$`, 'i') }).click({
      force: true,
      timeout: 15000,
    });
  }

  async verifyBranchDetailsInEditPopup(branch: BranchTestData) {
    await expect(this.page.getByText(/edit branch/i).first()).toBeVisible({ timeout: 15000 });

    const popupValues = await this.page.locator('input, textarea').evaluateAll((elements) =>
      elements
        .filter((element) => {
          const htmlElement = element as HTMLElement;
          const style = window.getComputedStyle(htmlElement);
          return style.visibility !== 'hidden' && style.display !== 'none';
        })
        .map((element) => (element as HTMLInputElement | HTMLTextAreaElement).value.trim())
        .filter(Boolean)
    );

    const containsValue = (expected: string) =>
      popupValues.some((value) => value.toLowerCase() === expected.toLowerCase());

    const containsPhone = (expected: string) =>
      popupValues.some((value) => value.replace(/\D/g, '').endsWith(expected.replace(/\D/g, '')));

    const firstVisibleValues = [branch.branchName, branch.branchEmail, branch.prefix];
    for (const value of firstVisibleValues) {
      if (!containsValue(value)) {
        throw new Error(
          `Expected edit popup inputs to contain "${value}", but captured values were:\n${popupValues.join('\n')}`
        );
      }
    }

    if (!containsPhone(branch.phone)) {
      throw new Error(
        `Expected edit popup inputs to contain phone ending with "${branch.phone}", but captured values were:\n${popupValues.join('\n')}`
      );
    }

    await this.page.waitForTimeout(800);
    await this.scrollVisibleModalToBottom();
    await this.page.waitForTimeout(800);

    const popupValuesAfterScroll = await this.page.locator('input, textarea').evaluateAll((elements) =>
      elements
        .filter((element) => {
          const htmlElement = element as HTMLElement;
          const style = window.getComputedStyle(htmlElement);
          return style.visibility !== 'hidden' && style.display !== 'none';
        })
        .map((element) => (element as HTMLInputElement | HTMLTextAreaElement).value.trim())
        .filter(Boolean)
    );

    const containsValueAfterScroll = (expected: string) =>
      popupValuesAfterScroll.some((value) => value.toLowerCase() === expected.toLowerCase());

    const expectedInputValues = [
      branch.branchName,
      branch.branchEmail,
      branch.prefix,
      branch.addressLine1,
      branch.addressLine2,
      branch.postalCode,
    ];

    for (const value of expectedInputValues) {
      if (!containsValueAfterScroll(value)) {
        throw new Error(
          `Expected edit popup inputs to contain "${value}", but captured values were:\n${popupValuesAfterScroll.join('\n')}`
        );
      }
    }

    const popupText = (await this.getVisibleBodyText()).toLowerCase();
    const expectedTexts = [branch.country, branch.state, branch.city, ...branch.categories];
    for (const value of expectedTexts) {
      if (!popupText.includes(value.toLowerCase())) {
        throw new Error(`Expected edit popup to contain "${value}", but visible page text was:\n${popupText}`);
      }
    }
  }

  async closeEditBranchPopup() {
    const modalRoot = this.page.locator('.custom-modal:visible, [role="dialog"]:visible, .app-modal:visible').last();
    await modalRoot.waitFor({ state: 'visible', timeout: 15000 });

    const closeCandidates = [
      modalRoot.locator('button.close-icon.custom-modal__close-icon[aria-label="Close"]').first(),
      modalRoot.getByRole('button', { name: /^close$/i }).first(),
      modalRoot.getByRole('button', { name: /^cancel$/i }).first(),
    ];

    for (const button of closeCandidates) {
      if (await button.isVisible().catch(() => false)) {
        await button.click({ force: true });
        await modalRoot.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
        if (!(await modalRoot.isVisible().catch(() => false))) {
          return;
        }
      }
    }

    await this.page.keyboard.press('Escape').catch(() => {});
    await expect(modalRoot).not.toBeVisible({ timeout: 15000 });
  }

  async deleteCreatedBranch(branch: BranchTestData) {
    await this.page.getByRole('button', {
      name: new RegExp(`^Delete ${this.escapeForRegex(branch.branchName)}$`, 'i'),
    }).click({ force: true, timeout: 15000 });

    await this.scrollVisibleModalToBottom();
    await this.page.getByRole('button', { name: 'Delete', exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await this.page.getByRole('button', { name: 'Delete', exact: true }).click({
      force: true,
      timeout: 15000,
    });
    await this.verifyDeleteSuccessMessage();
  }

  async verifyBranchDeleted(branch: BranchTestData) {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle');
    await this.navigateToBranches();

    await expect(
      this.page.getByRole('button', {
        name: new RegExp(`^Delete ${this.escapeForRegex(branch.branchName)}$`, 'i'),
      })
    ).toHaveCount(0, { timeout: 15000 });

    await expect(this.page.getByText(new RegExp(`^${this.escapeForRegex(branch.branchName)}$`, 'i'))).toHaveCount(0, {
      timeout: 15000,
    });
  }

  async verifyMessage(message: string) {
    const matches = this.page.getByText(message, { exact: true });
    await expect(matches.first()).toBeVisible({ timeout: 10000 });
  }

  async verifyRequiredValidations() {
    const expectedMessages = [
      'Branch name is required',
      'Branch email is required',
      'Prefix is required',
      'Phone number is required',
      'Address line 1 is required',
      'State is required',
      'City is required',
      'Postal code is required',
      'Complete required fields',
    ];

    for (const message of expectedMessages) {
      await expect(this.page.locator('body')).toContainText(message, { ignoreCase: true, timeout: 10000 });
    }
  }

  async verifyRequiredValidation(message: string) {
    await expect(this.page.locator('body')).toContainText(message, { ignoreCase: true, timeout: 10000 });
  }

  async verifyDeleteSuccessMessage() {
    const successMessages = [
      this.page.getByText(/branch was deleted successfully/i),
      this.page.getByText(/branch deleted successfully/i),
      this.page.getByText(/deleted successfully/i),
    ];

    for (const message of successMessages) {
      if (await message.first().isVisible().catch(() => false)) {
        await expect(message.first()).toBeVisible({ timeout: 10000 });
        return;
      }
    }
  }

  async getVisibleBodyText() {
    return this.page.locator('body').innerText();
  }

  private async typeSlowly(locator: ReturnType<Page['getByRole']>, value: string) {
    await locator.click();
    await locator.fill('');
    await locator.pressSequentially(value, { delay: 80 });
  }

  private async closeBranchCategoryDropdown() {
    await this.page.keyboard.press('Escape').catch(() => {});

    const dropdownButton = await this.findBranchCategoryTrigger();
    if (dropdownButton && (await dropdownButton.isVisible().catch(() => false))) {
      await dropdownButton.click({ force: true }).catch(() => {});
    }
  }

  private async openBranchCategoryDropdown() {
    const trigger = await this.findBranchCategoryTrigger();
    if (!trigger) {
      const bodyText = await this.page.locator('body').innerText().catch(() => '');
      throw new Error(`Could not find branch category trigger. Visible page text:\n${bodyText}`);
    }

    await trigger.scrollIntoViewIfNeeded().catch(() => {});
    await trigger.click({ force: true });
  }

  private async findBranchCategoryTrigger() {
    const modalRoot = this.page.locator('.custom-modal:visible, [role="dialog"]:visible, .app-modal:visible').last();
    const branchCategoriesRow = modalRoot
      .locator('div, section')
      .filter({ hasText: /^Branch Categories\*/i })
      .first();

    const triggerCandidates = [
      branchCategoriesRow.getByRole('button', { name: /^select(?:…|\.{3})?$/i }).first(),
      branchCategoriesRow.getByRole('button', { name: /^select$/i }).first(),
      branchCategoriesRow.locator('button, [role="button"]').filter({ hasText: /^select(?:…|\.{3})?$/i }).first(),
      branchCategoriesRow.locator('button, [role="button"]').first(),
      modalRoot.getByRole('button', { name: /branch categor/i }).first(),
      modalRoot.locator('button, [role="button"]').filter({ hasText: /branch categor/i }).first(),
    ];

    for (const trigger of triggerCandidates) {
      if ((await trigger.count().catch(() => 0)) && (await trigger.isVisible().catch(() => false))) {
        return trigger;
      }
    }

    return null;
  }

  private async clickBranchCategoryOption(category: string) {
    const optionCandidates = [
      this.page.getByRole('button', { name: new RegExp(`^${this.escapeForRegex(category)}$`, 'i') }).first(),
      this.page.getByRole('option', { name: new RegExp(`^${this.escapeForRegex(category)}$`, 'i') }).first(),
      this.page.getByText(new RegExp(`^${this.escapeForRegex(category)}$`, 'i')).first(),
    ];

    for (const option of optionCandidates) {
      if (await option.isVisible().catch(() => false)) {
        await option.click({ force: true });
        return;
      }
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    throw new Error(`Could not find branch category option "${category}". Visible page text:\n${bodyText}`);
  }

  private async closeSuccessToast(message: ReturnType<Page['getByText']>) {
    const toastRoot = this.page
      .locator('[role="alert"], [role="status"], .Toastify__toast, .toast, .notification, .ant-notification-notice')
      .filter({ has: message })
      .first();

    const closeCandidates = [
      toastRoot.getByRole('button', { name: /close|dismiss/i }).first(),
      toastRoot.locator('button[aria-label="Close"], button[aria-label="close"]').first(),
      this.page.getByRole('button', { name: /^close$/i }).first(),
      this.page.locator('button[aria-label="Close"], button[aria-label="close"]').first(),
    ];

    for (const button of closeCandidates) {
      if (await button.isVisible().catch(() => false)) {
        await button.click({ force: true });
        await expect(message.first()).not.toBeVisible({ timeout: 5000 });
        return;
      }
    }

    await this.page.keyboard.press('Escape').catch(() => {});
    await message.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  private async scrollBranchDialogToBottom() {
    const dialog = this.page.getByRole('dialog').last();

    if (await dialog.isVisible().catch(() => false)) {
      await dialog.evaluate((element) => {
        element.scrollTop = element.scrollHeight;

        const descendants = Array.from(element.querySelectorAll<HTMLElement>('*'));
        for (const child of descendants) {
          const style = window.getComputedStyle(child);
          const canScroll = /(auto|scroll)/.test(style.overflowY) || /(auto|scroll)/.test(style.overflow);
          if (canScroll && child.scrollHeight > child.clientHeight) {
            child.scrollTop = child.scrollHeight;
          }
        }
      });

      await dialog.hover();
      await this.page.mouse.wheel(0, 1500);
    }
  }

  private async scrollVisibleModalToBottom() {
    const modal = this.page.locator('.custom-modal, [role="dialog"], .app-modal').last();

    if (await modal.isVisible().catch(() => false)) {
      await modal.evaluate((element) => {
        const htmlElement = element as HTMLElement;
        htmlElement.scrollTop = htmlElement.scrollHeight;

        const descendants = Array.from(htmlElement.querySelectorAll<HTMLElement>('*'));
        for (const child of descendants) {
          const style = window.getComputedStyle(child);
          const canScroll = /(auto|scroll)/.test(style.overflowY) || /(auto|scroll)/.test(style.overflow);
          if (canScroll && child.scrollHeight > child.clientHeight) {
            child.scrollTop = child.scrollHeight;
          }
        }
      });

      await modal.hover().catch(() => {});
      await this.page.mouse.wheel(0, 1200);
    }
  }

  private async selectCountry(country: string) {
    await this.page.getByRole('button', { name: 'Country*' }).click();
    const search = this.page.getByRole('textbox', { name: 'Search options' });
    await search.fill(country);
    await this.page.getByRole('button', { name: country, exact: true }).click();
  }

  private async selectState(state: string) {
    await this.page.getByRole('button', { name: 'State*' }).click();
    await this.page.getByRole('button', { name: state }).click();
  }

  private async selectCity(city: string) {
    await this.page.getByText('City*Select').click();
    await this.page.getByRole('button', { name: city }).click();
  }

  private escapeForRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
