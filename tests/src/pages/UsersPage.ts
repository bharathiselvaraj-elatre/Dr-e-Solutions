import { expect, type Locator, type Page } from '@playwright/test';
import { type UserTestData } from '../utils/testData';

export class UserPage {
  constructor(private page: Page) {}

  async navigateToPeople() {
    await this.page.goto('https://dev-solutions.dr-e.com/users', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByText(/^Users$/i).first()).toBeVisible({ timeout: 15000 });
  }

  async openCreateUserForm() {
    const createUserButton = this.page.getByRole('button', { name: /create user/i }).first();
    await expect(createUserButton).toBeVisible({ timeout: 15000 });
    await createUserButton.click();
    await expect(this.page.getByRole('heading', { name: 'Create User' })).toBeVisible({ timeout: 15000 });
  }

  async fillCreateUserForm(user: UserTestData) {
    await this.fillCreateUserFormWithMissingField(user);
  }

  async fillCreateUserFormWithMissingField(user: UserTestData, missingField?: string) {
    const normalizedField = missingField?.trim().toLowerCase();
    const modalRoot = this.getVisibleUserModal();

    if (normalizedField !== 'branch') {
      user.branchName = await this.selectDropdownOption(modalRoot, 'Branch*', {
        preferredOption: user.branchName,
        random: !user.branchName,
      });
    }

    if (normalizedField !== 'role') {
      await this.selectDropdownOption(modalRoot, 'Role*', { preferredOption: user.role });
    }

    if (user.role.toLowerCase() === 'provider') {
      await this.waitForProviderFields(modalRoot);
      user.speciality = await this.waitForDropdownAndSelectRandom(modalRoot, ['Speciality*', 'Specialty*', 'Specialization*']);
      user.qualification = await this.selectProviderQualificationRandom(modalRoot);
    }

    if (normalizedField !== 'title') {
      user.title = await this.selectDropdownOption(modalRoot, 'Title*', { random: true });
    }

    await this.fillTextbox(modalRoot.getByRole('textbox', { name: 'First Name*' }).first(), normalizedField === 'first name' ? '' : user.firstName);
    await this.fillTextbox(modalRoot.getByRole('textbox', { name: 'Last Name*' }).first(), normalizedField === 'last name' ? '' : user.lastName);
    await this.fillTextbox(modalRoot.getByRole('textbox', { name: 'Email*' }).first(), normalizedField === 'email' ? '' : user.email);
    await this.fillTextbox(modalRoot.getByRole('textbox', { name: 'Mobile Number*' }).first(), normalizedField === 'mobile number' ? '' : user.mobile);

    if (normalizedField !== 'gender') {
      user.gender = await this.selectDropdownOption(modalRoot, 'Gender*', { random: true });
    }
    await this.selectDate(modalRoot, 'Date of Birth', { goToPreviousMonth: true, day: '5' });
    await this.selectDate(modalRoot, 'Date of Joining', { day: '11' });

    await this.fillTextbox(
      modalRoot.getByRole('textbox', { name: 'Address Line 1*' }).first(),
      normalizedField === 'address line 1' ? '' : user.addressLine1
    );
    await this.fillTextbox(modalRoot.getByRole('textbox', { name: 'Address Line 2' }).first(), user.addressLine2);

    if (normalizedField !== 'country') {
      await this.selectSearchableDropdown(modalRoot, 'Country*', user.country, 'ind');
    }
    if (normalizedField !== 'state') {
      await this.selectSearchableDropdown(modalRoot, 'State*', user.state, 'tami');
    }
    if (normalizedField !== 'city') {
      await this.selectSearchableDropdown(modalRoot, 'City*', user.city, 'thanj');
    }

    await this.fillTextbox(
      modalRoot.getByRole('textbox', { name: 'Postal Code*' }).first(),
      normalizedField === 'postal code' ? '' : user.postalCode
    );
    await this.page.keyboard.press('Tab').catch(() => {});
    await this.page.waitForTimeout(300);
  }

  async submitCreateUserForm() {
    const modalRoot = this.getVisibleUserModal();
    await modalRoot.waitFor({ state: 'visible', timeout: 15000 });
    await this.scrollVisibleModalToBottom();

    const submitCandidates = [
      modalRoot.getByRole('button', { name: /^create user$/i }).first(),
      modalRoot.locator('.button--primary:has-text("Create User")').first(),
      modalRoot.locator('button:has-text("Create User")').first(),
    ];

    for (const submitButton of submitCandidates) {
      if (!(await submitButton.count().catch(() => 0))) {
        continue;
      }

      if (!(await submitButton.isVisible().catch(() => false))) {
        continue;
      }

      try {
        await submitButton.scrollIntoViewIfNeeded().catch(() => {});
        await expect(submitButton).toBeEnabled({ timeout: 10000 });
        await submitButton.click({ force: true, timeout: 5000 });
        await this.waitForCreateUserSubmissionResult(modalRoot);
        return;
      } catch {
        continue;
      }
    }

    throw new Error('Create User submit button was not visible in the modal.');
  }

  async verifyUserCreated(user: UserTestData) {
    const successMessages = [
      this.page.getByRole('heading', { name: /^user created$/i }),
      this.page.getByText(/new user has been created successfully/i),
      this.page.getByText(/user created successfully/i),
      this.page.getByText(/created successfully/i),
      this.page.getByText(/invite sent successfully/i),
    ];

    const successDeadline = Date.now() + 20000;
    while (Date.now() < successDeadline) {
      for (const message of successMessages) {
        if (await message.first().isVisible().catch(() => false)) {
          await expect(message.first()).toBeVisible({ timeout: 5000 });
          return;
        }
      }

      await this.page.waitForTimeout(250);
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    throw new Error(
      `Expected a visible user creation success toast for ${user.email}, but none appeared within 20 seconds. Visible page text:\n${bodyText}`
    );
  }

  async verifyRequiredValidations() {
    const requiredMatches = this.page.getByText(/required|please select|invalid/i);
    await expect.poll(async () => await requiredMatches.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(6);
  }

  async verifyRequiredValidation(message: string) {
    await expect(this.page.locator('body')).toContainText(message, { ignoreCase: true, timeout: 10000 });
  }

  private async selectDropdownOption(
    modalRoot: Locator,
    label: string,
    options: { preferredOption?: string; random?: boolean } = {}
  ) {
    const trigger = modalRoot.getByRole('button', { name: label, exact: true }).first();
    await trigger.click();

    const listboxId = await trigger.getAttribute('aria-controls');
    const listbox = listboxId ? this.page.locator(`[id="${listboxId}"]`) : this.page.locator('[role="listbox"]').last();
    await listbox.waitFor({ state: 'visible', timeout: 20000 });

    const optionLocators = [
      listbox.getByRole('option'),
      listbox.getByRole('button'),
      listbox.locator('.dropdown__option'),
      listbox.locator('[role="option"], button'),
    ];

    const preferredLocator = options.preferredOption
      ? listbox
          .locator('[role="option"], button, .dropdown__option')
          .filter({ hasText: new RegExp(`^${this.escapeForRegex(options.preferredOption)}$`, 'i') })
          .first()
      : null;

    if (preferredLocator && (await preferredLocator.count())) {
      const selectedText = (await preferredLocator.innerText()).trim();
      await preferredLocator.click({ force: true });
      await this.closeListboxIfVisible(listbox);
      return selectedText;
    }

    const selectableOptions: Array<{ index: number; text: string }> = [];
    let optionItems: Locator | null = null;

    for (const locator of optionLocators) {
      const count = await locator.count().catch(() => 0);
      if (count > 0) {
        optionItems = locator;
        break;
      }
    }

    if (!optionItems) {
      throw new Error(`No option items found for "${label}".`);
    }

    const optionCount = await optionItems.count();
    for (let index = 0; index < optionCount; index++) {
      const option = optionItems.nth(index);
      const optionText = (await option.innerText().catch(() => '')).trim();
      const ariaDisabled = await option.getAttribute('aria-disabled');
      const isDisabled =
        (await option.isDisabled().catch(() => false)) ||
        ariaDisabled?.toLowerCase() === 'true' ||
        /disabled/i.test((await option.getAttribute('class').catch(() => '')) ?? '');

      if (isDisabled || !optionText || /^select(?:\s+\w+)?$/i.test(optionText)) {
        continue;
      }

      selectableOptions.push({ index, text: optionText });
    }

    if (!selectableOptions.length) {
      throw new Error(`No selectable option found for "${label}".`);
    }

    const selectedOption = options.random
      ? selectableOptions[Math.floor(Math.random() * selectableOptions.length)]
      : selectableOptions[0];

    await optionItems.nth(selectedOption.index).click({ force: true });
    await this.closeListboxIfVisible(listbox);
    return selectedOption.text;
  }

  private async selectDropdownOptionIfVisible(
    modalRoot: Locator,
    label: string | string[],
    options: { preferredOption?: string; random?: boolean } = {}
  ) {
    const trigger = await this.findDropdownTrigger(modalRoot, label);

    if (!trigger || !(await trigger.isVisible().catch(() => false))) {
      return undefined;
    }

    const resolvedLabel = Array.isArray(label) ? await this.resolveVisibleLabel(trigger, label) : label;
    return this.selectDropdownOption(modalRoot, resolvedLabel, options);
  }

  private async waitForProviderFields(modalRoot: Locator) {
    const providerFieldLabels = ['Speciality*', 'Specialty*', 'Qualifications*', 'Qualification*'];
    const deadline = Date.now() + 8000;

    while (Date.now() < deadline) {
      for (const label of providerFieldLabels) {
        const trigger = await this.findDropdownTrigger(modalRoot, label);
        if (trigger && (await trigger.isVisible().catch(() => false))) {
          return;
        }
      }

      await this.page.waitForTimeout(250);
    }
  }

  private async waitForDropdownAndSelectRandom(modalRoot: Locator, labels: string[]) {
    const deadline = Date.now() + 8000;

    while (Date.now() < deadline) {
      const trigger = await this.findDropdownTrigger(modalRoot, labels);
      if (trigger && (await trigger.isVisible().catch(() => false))) {
        const resolvedLabel = await this.resolveVisibleLabel(trigger, labels);
        return this.selectDropdownOption(modalRoot, resolvedLabel, { random: true });
      }

      await this.page.waitForTimeout(250);
    }

    throw new Error(`Dropdown did not become visible for provider user creation. Tried labels: ${labels.join(', ')}`);
  }

  private async selectProviderQualificationRandom(modalRoot: Locator) {
    const selectTrigger = await this.waitForProviderQualificationTrigger(modalRoot);
    await selectTrigger.click({ force: true });
    const selectedQualification = await this.selectProviderQualificationOptions();

    const modalBody = modalRoot.locator('.custom-modal__body').first();
    if (await modalBody.isVisible().catch(() => false)) {
      await modalBody.click({ force: true, position: { x: 20, y: 20 } }).catch(() => {});
    }

    await this.page.waitForTimeout(300);
    return selectedQualification;
  }

  private async waitForProviderQualificationTrigger(modalRoot: Locator) {
    const deadline = Date.now() + 8000;

    while (Date.now() < deadline) {
      const selectButtons = modalRoot.getByRole('button', { name: /^select$/i });
      const count = await selectButtons.count().catch(() => 0);

      for (let index = count - 1; index >= 0; index--) {
        const button = selectButtons.nth(index);
        if (await button.isVisible().catch(() => false)) {
          return button;
        }
      }

      await this.page.waitForTimeout(250);
    }

    throw new Error('Qualification Select button did not become visible for provider user creation.');
  }

  private async selectProviderQualificationOptions() {
    const deadline = Date.now() + 10000;
    let optionButtons: Locator | null = null;

    while (Date.now() < deadline) {
      const popupCandidates = [
        this.page.locator('[role="dialog"]:visible').last(),
        this.page.locator('[role="listbox"]:visible').last(),
        this.page.locator('.dropdown-menu:visible, .menu:visible, .popover:visible').last(),
      ];

      for (const popup of popupCandidates) {
        if (!(await popup.count().catch(() => 0)) || !(await popup.isVisible().catch(() => false))) {
          continue;
        }

        const buttons = popup.getByRole('button');
        if ((await buttons.count().catch(() => 0)) > 0) {
          optionButtons = buttons;
          break;
        }
      }

      if (optionButtons) {
        break;
      }

      await this.page.waitForTimeout(250);
    }

    if (!optionButtons) {
      throw new Error('No qualification popup buttons were found after clicking the Select trigger.');
    }

    const selectableOptions: Array<{ index: number; text: string }> = [];
    const optionCount = await optionButtons.count();
    for (let index = 0; index < optionCount; index++) {
      const option = optionButtons.nth(index);
      if (!(await option.isVisible().catch(() => false))) {
        continue;
      }

      const optionText = (await option.innerText().catch(() => '')).trim();
      const ariaDisabled = await option.getAttribute('aria-disabled');
      const isDisabled =
        (await option.isDisabled().catch(() => false)) ||
        ariaDisabled?.toLowerCase() === 'true' ||
        /disabled/i.test((await option.getAttribute('class').catch(() => '')) ?? '');

      if (
        isDisabled ||
        !optionText ||
        /^(select|create user|cancel|close|verify otp|login now|users|role\*|speciality\*|specialty\*|title\*|gender\*|state\*|city\*)$/i.test(
          optionText
        )
      ) {
        continue;
      }

      selectableOptions.push({ index, text: optionText });
    }

    if (!selectableOptions.length) {
      throw new Error('No selectable qualification option found in the provider Select popup.');
    }

    const shuffledOptions = [...selectableOptions].sort(() => Math.random() - 0.5);
    const selectionCount = Math.min(shuffledOptions.length, 2);
    const pickedLabels: string[] = [];

    for (let index = 0; index < selectionCount; index++) {
      const selectedOption = shuffledOptions[index];
      await optionButtons.nth(selectedOption.index).click({ force: true });
      pickedLabels.push(selectedOption.text);
      await this.page.waitForTimeout(150);
    }

    return pickedLabels.join(', ');
  }

  private async findDropdownTrigger(modalRoot: Locator, labels: string | string[]) {
    for (const label of Array.isArray(labels) ? labels : [labels]) {
      const exactTrigger = modalRoot.getByRole('button', { name: label, exact: true }).first();
      if ((await exactTrigger.count().catch(() => 0)) && (await exactTrigger.isVisible().catch(() => false))) {
        return exactTrigger;
      }

      const looseTrigger = modalRoot.getByRole('button', { name: new RegExp(this.escapeForRegex(label), 'i') }).first();
      if ((await looseTrigger.count().catch(() => 0)) && (await looseTrigger.isVisible().catch(() => false))) {
        return looseTrigger;
      }

      const comboTrigger = modalRoot.getByRole('combobox', { name: new RegExp(this.escapeForRegex(label), 'i') }).first();
      if ((await comboTrigger.count().catch(() => 0)) && (await comboTrigger.isVisible().catch(() => false))) {
        return comboTrigger;
      }

      const textTrigger = modalRoot.locator('button, [role="button"], [role="combobox"]').filter({
        hasText: new RegExp(this.escapeForRegex(label), 'i'),
      }).first();
      if ((await textTrigger.count().catch(() => 0)) && (await textTrigger.isVisible().catch(() => false))) {
        return textTrigger;
      }
    }

    return null;
  }

  private async resolveVisibleLabel(trigger: Locator, labels: string[]) {
    const accessibleName =
      (await trigger.getAttribute('aria-label').catch(() => null)) ??
      (await trigger.innerText().catch(() => ''));

    const matchingLabel = labels.find((label) => new RegExp(this.escapeForRegex(label), 'i').test(accessibleName ?? ''));
    return matchingLabel ?? labels[0];
  }

  private async selectSearchableDropdown(modalRoot: Locator, label: string, option: string, searchText: string) {
    await modalRoot.getByRole('button', { name: label, exact: true }).first().click();
    const search = this.page.getByRole('textbox', { name: 'Search options' }).last();
    await search.fill(searchText);
    await this.page.getByRole('button', { name: option, exact: true }).click();
  }

  private async selectDate(modalRoot: Locator, label: string, options: { day: string; goToPreviousMonth?: boolean }) {
    const triggerCandidates = [
      modalRoot.getByRole('button', { name: new RegExp(`^${this.escapeForRegex(label)}$`, 'i') }).last(),
      modalRoot.getByLabel(new RegExp(`^${this.escapeForRegex(label)}$`, 'i')).last(),
      modalRoot.getByText(new RegExp(`^${this.escapeForRegex(label)}$`, 'i')).last(),
      modalRoot.getByRole('button', { name: new RegExp(this.escapeForRegex(label), 'i') }).last(),
    ];

    let opened = false;
    for (const trigger of triggerCandidates) {
      if (!(await trigger.count().catch(() => 0))) {
        continue;
      }

      await trigger.scrollIntoViewIfNeeded().catch(() => {});

      if (await modalRoot.isVisible().catch(() => false)) {
        await modalRoot.evaluate((element) => {
          const htmlElement = element as HTMLElement;
          htmlElement.scrollTop = htmlElement.scrollHeight;
        }).catch(() => {});
      }

      try {
        await trigger.click({ force: true, timeout: 5000 });
        opened = true;
        break;
      } catch {
        continue;
      }
    }

    if (!opened) {
      const bodyText = await this.page.locator('body').innerText().catch(() => '');
      throw new Error(`Could not open date picker for "${label}". Visible page text:\n${bodyText}`);
    }

    if (options.goToPreviousMonth) {
      await this.page.getByRole('button', { name: /previous month/i }).last().click({ force: true });
    }

    const dayCandidates = [
      this.page.getByRole('button', { name: new RegExp(`^${this.escapeForRegex(options.day)}$`) }),
      this.page.locator('[role="gridcell"], td, button').getByText(new RegExp(`^${this.escapeForRegex(options.day)}$`)),
    ];

    for (const candidates of dayCandidates) {
      const count = await candidates.count().catch(() => 0);
      for (let index = count - 1; index >= 0; index--) {
        const candidate = candidates.nth(index);
        if (!(await candidate.isVisible().catch(() => false))) {
          continue;
        }

        try {
          await candidate.click({ force: true, timeout: 5000 });
          return;
        } catch {
          continue;
        }
      }
    }

    throw new Error(`Could not select day "${options.day}" for "${label}".`);
  }

  private async closeListboxIfVisible(listbox: Locator) {
    if (await listbox.isVisible().catch(() => false)) {
      await this.page.keyboard.press('Escape').catch(() => {});
      await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
  }

  private async fillTextbox(locator: Locator, value: string) {
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.click({ force: true }).catch(() => {});
    await locator.fill('');
    await locator.fill(value);
    await expect(locator).toHaveValue(value, { timeout: 5000 });
  }

  private getVisibleUserModal() {
    return this.page.locator('.custom-modal:visible, [role="dialog"]:visible, .app-modal:visible').last();
  }

  private async waitForCreateUserSubmissionResult(modalRoot: Locator) {
    const successMessages = [
      this.page.getByRole('heading', { name: /^user created$/i }).first(),
      this.page.getByText(/new user has been created successfully/i).first(),
      this.page.getByText(/user created successfully/i).first(),
      this.page.getByText(/created successfully/i).first(),
      this.page.getByText(/invite sent successfully/i).first(),
    ];

    const validationSignals = [
      modalRoot.getByText(/required/i).first(),
      modalRoot.getByText(/invalid/i).first(),
      modalRoot.getByText(/complete required fields/i).first(),
      modalRoot.getByText(/please select/i).first(),
    ];

    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      for (const message of successMessages) {
        if (await message.isVisible().catch(() => false)) {
          return;
        }
      }

      if (!(await modalRoot.isVisible().catch(() => false))) {
        return;
      }

      for (const signal of validationSignals) {
        if (await signal.isVisible().catch(() => false)) {
          return;
        }
      }

      await this.page.waitForTimeout(250);
    }
  }

  private async scrollVisibleModalToBottom() {
    const modal = this.getVisibleUserModal();

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
      }).catch(() => {});

      await modal.hover().catch(() => {});
      await this.page.mouse.wheel(0, 1200).catch(() => {});
    }
  }

  private escapeForRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
