import { expect, type Page } from '@playwright/test';
import { type BranchTestData } from '../utils/testData';

export class BranchPage {
  constructor(private page: Page) {}

  async navigateToBranches() {
    await this.navigateToBranchesFromDashboard();
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
    const createBranchCandidates = [
      this.page.getByRole('button', { name: /add new branch|create branch|add branch|new branch/i }).first(),
      this.page.getByRole('link', { name: /add new branch|create branch|add branch|new branch/i }).first(),
      this.page.locator('button, a').filter({ hasText: /add new branch|create branch|add branch|new branch/i }).first(),
      this.page.getByText(/add new branch|create branch|add branch|new branch/i).first(),
    ];

    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      const bodyText = await this.page.locator('body').innerText().catch(() => '');
      if (/loading branches/i.test(bodyText)) {
        await this.page.waitForTimeout(500);
        continue;
      }

      for (const candidate of createBranchCandidates) {
        if (await candidate.isVisible().catch(() => false)) {
          await candidate.click({ force: true, timeout: 15000 });
          return;
        }
      }

      await this.page.waitForTimeout(250);
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    throw new Error(`Could not find the create branch control. Visible page text:\n${bodyText}`);
  }

  async fillBranchForm(branch: BranchTestData) {
    await this.fillBranchFormWithMissingField(branch);
  }

  async fillBranchFormWithMissingField(branch: BranchTestData, missingField?: string) {
    const normalizedField = missingField?.trim().toLowerCase();
    const stepOneFields = new Set(['branch name', 'branch email', 'prefix', 'phone']);
    const shouldAdvanceToStepTwo = !normalizedField || !stepOneFields.has(normalizedField);

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
    await this.selectPrefixSuggestion(branch.prefix);

    await this.openBranchCategoryDropdown();
    for (const category of branch.categories) {
      await this.clickBranchCategoryOption(category);
    }
    await this.closeBranchCategoryDropdown();

    await this.typeSlowly(
      this.page.getByRole('textbox', { name: 'Phone*' }),
      normalizedField === 'phone' ? '' : branch.phone
    );
    await this.setMainBranchSelection();
    await this.advanceToBranchAddressStep(shouldAdvanceToStepTwo);
    if (!shouldAdvanceToStepTwo) {
      return;
    }

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

    await this.configureWorkingHours();
  }

  async submitBranchForm() {
    await this.scrollBranchDialogToBottom();

    const nextButton = this.page.getByRole('button', { name: /^next$/i }).first();
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click({ force: true, timeout: 10000 });
      return;
    }

    const submitButton = this.page.getByRole('button', { name: /^create branch$/i }).last();

    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click({ force: true, timeout: 10000 });
  }

  async verifyBranchCreated(branch: BranchTestData) {
    const branchNamePattern = new RegExp(this.escapeForRegex(branch.branchName), 'i');
    const branchIndicators = [
      this.page.getByText(branchNamePattern).first(),
      this.page.getByRole('button', {
        name: new RegExp(`^(?:Edit|Delete)\\s+${this.escapeForRegex(branch.branchName)}$`, 'i'),
      }).first(),
    ];

    const successMessages = [
      this.page.getByText(/branch created successfully/i).first(),
      this.page.getByText(/created successfully/i).first(),
    ];

    const deadline = Date.now() + 30000;
    let sawSuccessToast = false;

    while (Date.now() < deadline) {
      for (const indicator of branchIndicators) {
        if (await indicator.isVisible().catch(() => false)) {
          return;
        }
      }

      for (const message of successMessages) {
        if (await message.isVisible().catch(() => false)) {
          sawSuccessToast = true;
          await this.closeSuccessToast(message);
          await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
          await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
          await this.navigateToBranches().catch(() => {});
          break;
        }
      }

      await this.page.waitForTimeout(500);
    }

    if (sawSuccessToast) {
      for (const indicator of branchIndicators) {
        if (await indicator.isVisible().catch(() => false)) {
          return;
        }
      }
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    throw new Error(
      `Expected created branch "${branch.branchName}" to be visible after submission, but it was not found. Visible page text:\n${bodyText}`
    );
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
    const containsValueAfterScrollLoosely = (expected: string) =>
      popupValuesAfterScroll.some((value) => value.toLowerCase().includes(expected.toLowerCase()));

    const expectedInputValues = [
      branch.branchName,
      branch.branchEmail,
      branch.prefix,
      branch.addressLine1,
      branch.addressLine2,
      branch.postalCode,
    ];

    for (const value of expectedInputValues) {
      const matchesExactly = containsValueAfterScroll(value);
      const matchesLoosely =
        value === branch.addressLine2 || value === branch.addressLine1 ? containsValueAfterScrollLoosely(value) : false;

      if (!matchesExactly && !matchesLoosely) {
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
    const stepOneMessages = [
      'Branch name is required',
      'Branch email is required',
      'Prefix is required',
      'Select at least one branch category',
      'Phone number is required',
      'Complete required fields',
    ];

    for (const message of stepOneMessages) {
      await expect(this.page.locator('body')).toContainText(message, { ignoreCase: true, timeout: 10000 });
    }

    const addressLineOne = this.page.getByRole('textbox', { name: 'Address Line 1*' });
    if (await addressLineOne.isVisible().catch(() => false)) {
      const stepTwoMessages = ['Address line 1 is required', 'State is required', 'City is required', 'Postal code is required'];

      for (const message of stepTwoMessages) {
        await expect(this.page.locator('body')).toContainText(message, { ignoreCase: true, timeout: 10000 });
      }
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

  private async navigateToBranchesFromDashboard() {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.waitForDashboardToBeInteractive();

    const exactNavigationPath = async () => {
      await this.page
        .getByText('DashboardBranchesSchedulingPatientsLab ordersNewInboxLeadsAutomationEmail')
        .click()
        .catch(() => {});

      const branchesButton = this.page.getByRole('button', { name: 'Branches' });
      if (await branchesButton.first().isVisible().catch(() => false)) {
        await branchesButton.first().click({ force: true });

        const allBranchesLink = this.page.getByRole('link', { name: 'All branches' });
        if (await allBranchesLink.first().isVisible().catch(() => false)) {
          await allBranchesLink.first().click({ force: true });
          await this.page.getByRole('main').click().catch(() => {});
          return true;
        }
      }

      return false;
    };

    if (await exactNavigationPath()) {
      return;
    }

    const branchesNavPattern = /^(?:all\s+)?branches(?:\s+\d+\s+items)?$/i;
    const directBranchesNavCandidates = [
      this.page.getByRole('link', { name: /all branches|branches/i }).first(),
      this.page.getByRole('button', { name: /all branches|branches/i }).first(),
      this.page.locator('a[href*="/branches"]').first(),
      this.page.locator('button').filter({ hasText: /all branches|branches/i }).first(),
      this.page.getByText(branchesNavPattern).first(),
    ];

    for (const candidate of directBranchesNavCandidates) {
      if (await candidate.isVisible().catch(() => false)) {
        await candidate.click({ force: true });
        return;
      }
    }

    const branchManagementCandidates = [
      this.page.getByRole('button', { name: /branch management/i }).first(),
      this.page.getByRole('link', { name: /branch management/i }).first(),
      this.page.locator('button, a').filter({ hasText: /branch management/i }).first(),
      this.page.getByText(/branch management/i).first(),
    ];

    for (const branchManagement of branchManagementCandidates) {
      if (!(await branchManagement.isVisible().catch(() => false))) {
        continue;
      }

      await branchManagement.click({ force: true }).catch(() => {});
      await this.page.waitForTimeout(500);

      if (await exactNavigationPath()) {
        return;
      }

      for (const candidate of directBranchesNavCandidates) {
        if (await candidate.isVisible().catch(() => false)) {
          await candidate.click({ force: true });
          return;
        }
      }
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    throw new Error(`Could not navigate to Branches from dashboard. Visible page text:\n${bodyText}`);
  }

  private async waitForDashboardToBeInteractive() {
    const loadingPattern = /loading your profile/i;
    const deadline = Date.now() + 45000;
    let recoveredFromLoginShell = false;

    while (Date.now() < deadline) {
      if (this.page.isClosed()) {
        throw new Error('Dashboard page was closed before Branches navigation became available.');
      }

      const bodyText = await this.page.locator('body').innerText().catch(() => '');
      const looksLikeLoginShell = /secure access for healthcare teams|welcome back to dr\.e|forgot password/i.test(bodyText);

      if (looksLikeLoginShell && !recoveredFromLoginShell) {
        const hasAuthTokens = await this.page
          .evaluate(() => !!window.localStorage.getItem('access') || !!window.localStorage.getItem('refresh'))
          .catch(() => false);

        if (hasAuthTokens) {
          recoveredFromLoginShell = true;
          await this.page.goto('https://dev-solutions.dr-e.com/dashboard', {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
          });
          continue;
        }
      }

      if (loadingPattern.test(bodyText)) {
        await this.safePause(500);
        continue;
      }

      const navReadyCandidates = [
        this.page.getByRole('button', { name: /branch management/i }).first(),
        this.page.getByRole('link', { name: /branch management/i }).first(),
        this.page.getByRole('link', { name: /all branches|branches/i }).first(),
        this.page.getByRole('button', { name: /all branches|branches/i }).first(),
        this.page.locator('a[href*="/branches"]').first(),
        this.page.locator('nav').first(),
      ];

      for (const candidate of navReadyCandidates) {
        if (await candidate.isVisible().catch(() => false)) {
          return;
        }
      }

      await this.safePause(250);
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    throw new Error(`Dashboard did not finish loading. Visible page text:\n${bodyText}`);
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
      branchCategoriesRow.getByRole('button', { name: /^select(?:â€¦|\.{3})?$/i }).first(),
      branchCategoriesRow.getByRole('button', { name: /^select$/i }).first(),
      branchCategoriesRow.locator('button, [role="button"]').filter({ hasText: /^select(?:â€¦|\.{3})?$/i }).first(),
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

  private async selectPrefixSuggestion(prefix: string) {
    const suggestionCandidates = [
      this.page.getByRole('option', { name: new RegExp(`^${this.escapeForRegex(prefix)}$`, 'i') }).first(),
      this.page.getByRole('button', { name: new RegExp(`^${this.escapeForRegex(prefix)}$`, 'i') }).first(),
      this.page.locator('[role="listbox"] [role="option"]').filter({ hasText: new RegExp(`^${this.escapeForRegex(prefix)}$`, 'i') }).first(),
    ];

    for (const suggestion of suggestionCandidates) {
      if (await suggestion.isVisible().catch(() => false)) {
        await suggestion.click({ force: true });
        return;
      }
    }

    await this.page.keyboard.press('Tab').catch(() => {});
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
    const countryTrigger = this.page.getByRole('button', { name: 'Country*' }).first();
    if (!(await countryTrigger.isVisible().catch(() => false))) {
      return;
    }

    await countryTrigger.click();
    const search = this.page.getByRole('textbox', { name: 'Search options' });
    if (await search.isVisible().catch(() => false)) {
      await search.fill(country);
    }
    await this.page.getByRole('button', { name: country, exact: true }).click();
  }

  private async configureWorkingHours() {
    const sameHoursTab = this.page.getByRole('tab', { name: /same hours/i }).first();
    if (await sameHoursTab.isVisible().catch(() => false)) {
      await sameHoursTab.click().catch(() => {});
    }

    const sundayClosedSwitch = this.page.getByRole('switch', { name: /sunday closed/i }).first();
    if (await sundayClosedSwitch.isVisible().catch(() => false)) {
      await sundayClosedSwitch.click().catch(() => {});
    }

    const applyAllDaysControlCandidates = [
      this.page.locator('label').filter({ hasText: /apply to all days/i }).first(),
      this.page.getByText(/apply to all days/i).first(),
      this.page.getByRole('checkbox', { name: /apply to all days/i }).first(),
      this.page.getByRole('button', { name: /apply to all days/i }).first(),
    ];

    for (const candidate of applyAllDaysControlCandidates) {
      if (await candidate.isVisible().catch(() => false)) {
        await candidate.click({ force: true }).catch(() => {});
        break;
      }
    }

    const fromHour = this.page.locator('#branch-wh-apply-all-from-hour').first();
    const toHour = this.page.locator('#branch-wh-apply-all-to-hour').first();

    if (await fromHour.isVisible().catch(() => false)) {
      await fromHour.selectOption('6').catch(() => {});
    }

    if (await toHour.isVisible().catch(() => false)) {
      await toHour.selectOption('3').catch(() => {});
    }

    const meridiemButtons = this.page.getByRole('button', { name: /^pm$/i });
    if ((await meridiemButtons.count().catch(() => 0)) > 1) {
      await meridiemButtons.nth(1).click().catch(() => {});
    }

    const workingHoursGroup = this.page.getByRole('group', { name: /default working hours applied/i }).first();
    if (await workingHoursGroup.isVisible().catch(() => false)) {
      await workingHoursGroup.getByLabel('To').click().catch(() => {});
    }
  }

  private async selectState(state: string) {
    await this.page.getByRole('button', { name: 'State*' }).click();
    await this.page.getByRole('button', { name: state }).click();
  }

  private async selectCity(city: string) {
    const cityTriggerCandidates = [
      this.page.getByRole('button', { name: 'City*' }).first(),
      this.page.getByText('City*Select').first(),
      this.page.getByText(/^City\*/).first(),
    ];

    for (const trigger of cityTriggerCandidates) {
      if (await trigger.isVisible().catch(() => false)) {
        await trigger.click({ force: true });
        break;
      }
    }

    await this.page.getByRole('button', { name: city }).click();
  }

  private async setMainBranchSelection() {
    const mainBranchCandidates = [
      this.page.getByLabel(/main branch/i).first(),
      this.page.getByText(/^Main Branch$/i).first(),
      this.page.getByRole('checkbox', { name: /main branch/i }).first(),
      this.page.getByRole('radio', { name: /main branch/i }).first(),
      this.page.getByRole('switch', { name: /main branch/i }).first(),
    ];

    for (const candidate of mainBranchCandidates) {
      if (await candidate.isVisible().catch(() => false)) {
        await candidate.click({ force: true }).catch(() => {});
        return;
      }
    }
  }

  private async advanceToBranchAddressStep(expectAdvance = true) {
    const nextButton = this.page.getByRole('button', { name: /^next$/i }).first();
    if (!(await nextButton.isVisible().catch(() => false))) {
      return;
    }

    await nextButton.click({ force: true });
    if (expectAdvance) {
      await expect(this.page.getByRole('textbox', { name: 'Address Line 1*' })).toBeVisible({
        timeout: 15000,
      });
    }
  }

  private async safePause(ms: number) {
    if (this.page.isClosed()) {
      throw new Error('Playwright page was closed unexpectedly while waiting for the branch flow.');
    }

    await this.page.waitForTimeout(ms);
  }

  private escapeForRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
