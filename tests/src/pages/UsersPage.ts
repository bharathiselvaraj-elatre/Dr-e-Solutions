import { existsSync, readdirSync, statSync } from 'fs';
import { homedir } from 'os';
import { extname, join } from 'path';
import { expect, type Locator, type Page } from '@playwright/test';
import { type UserTestData } from '../utils/testData';

export class UserPage {
  constructor(private page: Page) {}

  async navigateToPeople(branchName?: string) {
    await this.page.goto('https://dev-solutions.dr-e.com/dashboard', { waitUntil: 'domcontentloaded' });
    await this.waitForDashboardToBeInteractive();

    const branchesNavCandidates = [
      this.page.locator('nav').getByRole('button', { name: /^Branches$/i }).first(),
      this.page.getByRole('button', { name: /^Branches$/i }).first(),
      this.page.locator('button.dashboard-page__nav-section-toggle').filter({ hasText: /^Branches$/i }).first(),
    ];

    let branchesNavOpened = false;
    for (const candidate of branchesNavCandidates) {
      if (await candidate.isVisible().catch(() => false)) {
        await candidate.click({ force: true });
        branchesNavOpened = true;
        break;
      }
    }

    if (!branchesNavOpened) {
      const bodyText = await this.page.locator('body').innerText().catch(() => '');
      throw new Error(`Could not find Branches navigation button. Visible page text:\n${bodyText}`);
    }

    await this.page.getByRole('link', { name: /^All branches$/i }).first().click({ force: true });

    const branchCandidates = [
      branchName ? this.page.getByText(new RegExp(`^${this.escapeForRegex(branchName)}$`, 'i')).first() : null,
      branchName ? this.page.getByText(branchName, { exact: false }).first() : null,
      branchName
        ? this.page.locator('button, a, div, td, span').filter({ hasText: new RegExp(this.escapeForRegex(branchName), 'i') }).first()
        : null,
      this.page.getByText(/^Anna Nagar\s+\d+$/i).first(),
      this.page.locator('button, a, div, td, span').filter({ hasText: /Anna Nagar/i }).first(),
    ].filter(Boolean) as Locator[];

    const branchDetailSignals = [
      this.page.getByRole('tab', { name: /^Personnel$/i }).first(),
      this.page.getByRole('tab', { name: /^Provider$/i }).first(),
      this.page.getByRole('button', { name: /^Create Personnel$/i }).first(),
    ];

    const branchDeadline = Date.now() + 30000;
    let branchOpened = false;
    while (Date.now() < branchDeadline && !branchOpened) {
      for (const candidate of branchCandidates) {
        if (!(await candidate.isVisible().catch(() => false))) {
          continue;
        }

        await candidate.click({ force: true }).catch(() => {});

        const detailReadyDeadline = Date.now() + 5000;
        while (Date.now() < detailReadyDeadline) {
          for (const signal of branchDetailSignals) {
            if (await signal.isVisible().catch(() => false)) {
              branchOpened = true;
              break;
            }
          }

          if (branchOpened) {
            break;
          }

          await this.page.waitForTimeout(250);
        }

        if (branchOpened) {
          break;
        }
      }

      if (!branchOpened) {
        await this.page.waitForTimeout(500);
      }
    }

    if (!branchOpened) {
      const bodyText = await this.page.locator('body').innerText().catch(() => '');
      throw new Error(
        `Could not find created branch entry${branchName ? ` for "${branchName}"` : ''} after opening All branches. Visible page text:\n${bodyText}`
      );
    }

    await this.openPersonnelSection();

    const pageReadySignals = [
      ...branchDetailSignals,
      this.page.getByRole('button', { name: /create (user|personnel|personal|personnal)|add (user|personnel|personal|personnal)|new (user|personnel|personal|personnal)/i }).first(),
    ];

    for (const signal of pageReadySignals) {
      if (await signal.isVisible().catch(() => false)) {
        return;
      }
    }

    await expect(pageReadySignals[0].or(pageReadySignals[2])).toBeVisible({ timeout: 15000 });
  }

  async openCreateUserForm() {
    await this.openPersonnelSection();

    const createUserCandidates = [
      this.page.getByRole('button', { name: /^Create Personnel$/i }).first(),
      this.page.getByRole('button', { name: /create (user|personnel|personal|personnal)|add (user|personnel|personal|personnal)|new (user|personnel|personal|personnal)/i }).first(),
      this.page.getByRole('link', { name: /create (user|personnel|personal|personnal)|add (user|personnel|personal|personnal)|new (user|personnel|personal|personnal)/i }).first(),
      this.page.locator('button, a').filter({ hasText: /create (user|personnel|personal|personnal)|add (user|personnel|personal|personnal)|new (user|personnel|personal|personnal)/i }).first(),
      this.page.getByText(/create (user|personnel|personal|personnal)|add (user|personnel|personal|personnal)|new (user|personnel|personal|personnal)/i).first(),
    ];

    for (const candidate of createUserCandidates) {
      if (await candidate.isVisible().catch(() => false)) {
        await candidate.click({ force: true, timeout: 15000 });
        await this.waitForUserFormToOpen();
        return;
      }
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    throw new Error(`Could not find the create user control. Visible page text:\n${bodyText}`);
  }

  async fillCreateUserForm(user: UserTestData) {
    await this.fillCreateUserFormWithMissingField(user);
  }

  async fillCreateUserFormWithMissingField(user: UserTestData, missingField?: string) {
    await this.prepareCreateUserFormForRole(user.role);

    const normalizedField = missingField?.trim().toLowerCase();
    const normalizedRole = this.normalizeRole(user.role);
    const logStep = (message: string) => console.log(`[user-form] ${message}`);
    let modalRoot = await this.getVisibleCreateUserFormModal();

    if (normalizedField !== 'branch') {
      logStep('selecting branch');
      const selectedBranch = await this.selectDropdownOptionIfVisible(modalRoot, 'Branch*', {
        preferredOption: user.branchName,
        random: !user.branchName,
      });
      if (selectedBranch) {
        user.branchName = selectedBranch;
      } else {
        logStep('branch field not visible in branch-scoped personnel form, skipping branch selection');
      }
    }

    if (normalizedField !== 'role') {
      logStep(`selecting role ${normalizedRole}`);
      await this.selectDropdownOption(modalRoot, ['Role*', 'Access Role*'], { preferredOption: normalizedRole });
    }

    if (/(doctor|provider)/i.test(normalizedRole)) {
      logStep('selecting provider speciality and qualification');
      await this.waitForDoctorFields(modalRoot);
      user.speciality = await this.waitForDropdownAndSelectRandom(modalRoot, ['Speciality*', 'Specialty*', 'Specialization*']);
      user.qualification = await this.selectDoctorQualificationRandom(modalRoot);
    }

    if (normalizedField !== 'title') {
      logStep('selecting title');
      user.title = await this.selectDropdownOption(modalRoot, 'Title*', { random: true });
    }

    logStep('filling core text fields');
    await this.fillTextbox(
      await this.findUserTextbox(modalRoot, {
        fieldName: 'First Name',
        names: ['firstName', 'first_name'],
        labels: ['First Name*', 'First Name'],
      }),
      normalizedField === 'first name' ? '' : user.firstName
    );
    await this.fillTextbox(
      await this.findUserTextbox(modalRoot, {
        fieldName: 'Last Name',
        names: ['lastName', 'last_name'],
        labels: ['Last Name*', 'Last Name'],
      }),
      normalizedField === 'last name' ? '' : user.lastName
    );
    await this.fillTextbox(
      await this.findUserTextbox(modalRoot, {
        fieldName: 'Email',
        names: ['email'],
        labels: ['Email*', 'Email'],
      }),
      normalizedField === 'email' ? '' : user.email
    );
    await this.fillTextbox(
      await this.findUserTextbox(modalRoot, {
        fieldName: 'Mobile Number',
        names: ['mobile', 'mobileNumber', 'phone', 'phoneNumber'],
        labels: ['Mobile Number*', 'Mobile Number', 'Phone Number*', 'Phone Number'],
      }),
      normalizedField === 'mobile number' ? '' : user.mobile
    );

    if (normalizedField !== 'gender') {
      logStep('selecting gender');
      user.gender = await this.selectDropdownOption(modalRoot, 'Gender*', { random: true });
    }
    logStep('selecting date of birth');
    await this.setUserDateByIndex(modalRoot, 0, this.buildPreviousMonthDate('9'), 'Date of Birth');
    logStep('selecting date of joining');
    await this.setUserDateByIndex(modalRoot, 1, this.buildPreviousMonthDate('1'), 'Date of Joining');
    logStep('dates selected');

    logStep('filling address lines');
    await this.fillTextbox(
      await this.findUserTextbox(modalRoot, {
        fieldName: 'Address Line 1',
        names: ['addressLine1', 'address1'],
        labels: ['Address Line 1*', 'Address Line 1'],
      }),
      normalizedField === 'address line 1' ? '' : user.addressLine1
    );
    await this.fillTextbox(
      await this.findUserTextbox(modalRoot, {
        fieldName: 'Address Line 2',
        names: ['addressLine2', 'address2'],
        labels: ['Address Line 2', 'Address Line 2*'],
      }),
      user.addressLine2
    );

    if (normalizedField !== 'country') {
      logStep(`selecting country ${user.country}`);
      const selectedCountry = await this.selectSearchableDropdownIfVisible(
        modalRoot,
        ['Country*', 'Country / Region*'],
        user.country,
        'ind'
      );
      if (!selectedCountry) {
        logStep('country field not visible in personnel form, skipping country selection');
      }
    }
    if (normalizedField !== 'state') {
      logStep(`selecting state ${user.state}`);
      await this.selectSearchableDropdown(modalRoot, ['State*', 'State / Province*'], user.state, 'tami');
    }
    if (normalizedField !== 'city') {
      logStep(`selecting city ${user.city}`);
      await this.selectSearchableDropdown(modalRoot, ['City*', 'City / Municipality*'], user.city, 'thanj');
    }

    logStep('filling postal code');
    await this.fillTextbox(
      await this.findUserTextbox(modalRoot, {
        fieldName: 'Postal Code',
        names: ['postalCode', 'zipCode', 'zipcode'],
        labels: ['Postal Code*', 'Postal Code', 'Zip Code*', 'Zip Code'],
      }),
      normalizedField === 'postal code' ? '' : user.postalCode
    );
    await this.page.keyboard.press('Tab').catch(() => {});

    logStep('uploading profile photo');
    await this.uploadFirstDownloadPhoto(modalRoot);
  }

  async submitCreateUserForm() {
    await this.waitForPhotoDialogToClose().catch(() => {});
    const modalRoot = await this.getVisibleCreateUserFormModal().catch(() => null);
    const submitDeadline = Date.now() + 20000;

    while (Date.now() < submitDeadline) {
      await this.waitForPhotoDialogToClose().catch(() => {});
      if (modalRoot && (await modalRoot.isVisible().catch(() => false))) {
        await this.scrollVisibleModalToBottom();
      } else {
        await this.page.mouse.wheel(0, 1200).catch(() => {});
      }

      const submitCandidates = [
        ...(modalRoot
          ? [
              modalRoot.getByRole('button', { name: /^add personnel$/i }).last(),
              modalRoot.getByRole('button', { name: /^create user$/i }).last(),
              modalRoot.getByRole('button', { name: /^create personnel$/i }).last(),
              modalRoot.getByRole('button', { name: /^save$/i }).last(),
              modalRoot.locator('button[type="submit"]').last(),
              modalRoot.locator('.button--primary').filter({ hasText: /add personnel|create user|create personnel|save/i }).last(),
              modalRoot.locator('button').filter({ hasText: /add personnel|create user|create personnel|save/i }).last(),
            ]
          : []),
        this.page.getByRole('button', { name: /^add personnel$/i }).last(),
        this.page.getByRole('button', { name: /^create user$/i }).last(),
        this.page.getByRole('button', { name: /^create personnel$/i }).last(),
        this.page.getByRole('button', { name: /^save$/i }).last(),
        this.page.locator('button[type="submit"]:visible').last(),
        this.page.locator('button:visible').filter({ hasText: /add personnel|create user|create personnel|save/i }).last(),
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
          await expect(submitButton).toBeEnabled({ timeout: 2000 });
          await submitButton.click({ force: true, timeout: 5000 });
          await this.waitForCreateUserSubmissionResult(modalRoot ?? this.page.locator('body'));
          return;
        } catch {
          continue;
        }
      }

      await this.page.waitForTimeout(250);
    }

    const visibleButtons = await this.page.locator('button:visible').evaluateAll((elements) =>
      elements
        .map((element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
    ).catch(() => []);
    const modalText = modalRoot ? await modalRoot.innerText().catch(() => '') : '';

    throw new Error(
      `Create User submit button was not visible or enabled. Visible buttons: ${visibleButtons.join(' | ')}\nModal text:\n${modalText}`
    );
  }

  async verifyUserCreated(user: UserTestData) {
    const successMessages = [
      this.page.getByRole('heading', { name: /^user created$/i }),
      this.page.getByRole('heading', { name: /^personnel created$/i }),
      this.page.getByRole('heading', { name: /^personal created$/i }),
      this.page.getByRole('heading', { name: /^personnal created$/i }),
      this.page.getByText(/new user has been created successfully/i),
      this.page.getByText(/new personnel has been created successfully/i),
      this.page.getByText(/new personal has been created successfully/i),
      this.page.getByText(/new personnal has been created successfully/i),
      this.page.getByText(/user created successfully/i),
      this.page.getByText(/personnel created successfully/i),
      this.page.getByText(/personal created successfully/i),
      this.page.getByText(/personnal created successfully/i),
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
    label: string | string[],
    options: { preferredOption?: string; random?: boolean } = {}
  ) {
    const trigger = await this.findDropdownTrigger(modalRoot, label);
    if (!trigger) {
      const bodyText = await this.page.locator('body').innerText().catch(() => '');
      throw new Error(`Could not find dropdown trigger for "${Array.isArray(label) ? label.join('" or "') : label}". Visible page text:\n${bodyText}`);
    }

    await trigger.click({ force: true });

    const listbox = await this.waitForDropdownPopup(trigger).catch(() => modalRoot);
    const search = listbox
      .getByRole('textbox', { name: /search options/i })
      .last()
      .or(this.page.getByRole('textbox', { name: /search options/i }).last());

    if (options.preferredOption && (await search.isVisible().catch(() => false))) {
      await search.fill(options.preferredOption).catch(() => {});
      await this.page.waitForTimeout(300);
    }

    const optionLocators = [
      listbox.getByRole('option'),
      listbox.getByRole('button'),
      listbox.locator('li'),
      listbox.locator('[data-value]'),
      listbox.locator('.dropdown__option'),
      listbox.locator('[role="option"], button, li, [data-value], div'),
    ];

    const preferredLocator = options.preferredOption
      ? listbox
          .locator('[role="option"], button, li, [data-value], .dropdown__option, div')
          .filter({ hasText: new RegExp(`^${this.escapeForRegex(options.preferredOption)}$`, 'i') })
          .first()
      : null;

    if (preferredLocator && (await preferredLocator.count().catch(() => 0))) {
      const selectedText = (await preferredLocator.innerText().catch(() => '')).trim();
      if (selectedText) {
        await preferredLocator.click({ force: true });
        await this.closeListboxIfVisible(listbox);
        return selectedText;
      }
    }

    if (options.preferredOption) {
      const pageLevelPreferredCandidates = [
        this.page.getByRole('option', { name: new RegExp(`^${this.escapeForRegex(options.preferredOption)}$`, 'i') }).last(),
        this.page.getByRole('button', { name: new RegExp(`^${this.escapeForRegex(options.preferredOption)}$`, 'i') }).last(),
        this.page.getByText(new RegExp(`^${this.escapeForRegex(options.preferredOption)}$`, 'i')).last(),
      ];

      for (const candidate of pageLevelPreferredCandidates) {
        if (await candidate.isVisible().catch(() => false)) {
          const selectedText = (await candidate.innerText().catch(() => options.preferredOption ?? '')).trim();
          await candidate.click({ force: true });
          await this.closeListboxIfVisible(listbox);
          return selectedText || options.preferredOption;
        }
      }
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
      throw new Error(`No option items found for "${Array.isArray(label) ? label.join('" or "') : label}".`);
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

      if (
        isDisabled ||
        !optionText ||
        /^select(?:\s+\w+)?$/i.test(optionText) ||
        /^(branch\*|role\*|title\*|gender\*|country\*|state\*|city\*|search options|create user|create personnel|cancel|close)$/i.test(
          optionText
        )
      ) {
        continue;
      }

      selectableOptions.push({ index, text: optionText });
    }

    if (!selectableOptions.length) {
      throw new Error(`No selectable option found for "${Array.isArray(label) ? label.join('" or "') : label}".`);
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

  private async waitForDoctorFields(modalRoot: Locator) {
    const doctorFieldLabels = ['Speciality*', 'Specialty*', 'Qualifications*', 'Qualification*'];
    const deadline = Date.now() + 8000;

    while (Date.now() < deadline) {
      for (const label of doctorFieldLabels) {
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

    const unlabeledDoctorTrigger = await this.findVisibleGenericSelectTrigger(modalRoot, 0);
    if (unlabeledDoctorTrigger) {
      return this.selectDropdownOptionFromTrigger(unlabeledDoctorTrigger, { random: true });
    }

    throw new Error(`Dropdown did not become visible for doctor user creation. Tried labels: ${labels.join(', ')}`);
  }

  private async selectDoctorQualificationRandom(modalRoot: Locator) {
    const selectTrigger = await this.waitForDoctorQualificationTrigger(modalRoot);
    await selectTrigger.click({ force: true });
    const selectedQualification = await this.selectDoctorQualificationOptions();

    const modalBody = modalRoot.locator('.custom-modal__body').first();
    if (await modalBody.isVisible().catch(() => false)) {
      await modalBody.click({ force: true, position: { x: 20, y: 20 } }).catch(() => {});
    }

    await this.page.waitForTimeout(300);
    return selectedQualification;
  }

  private async waitForDoctorQualificationTrigger(modalRoot: Locator) {
    const deadline = Date.now() + 8000;

    while (Date.now() < deadline) {
      const explicitQualificationTrigger = await this.findDropdownTrigger(modalRoot, ['Qualifications*', 'Qualification*']);
      if (explicitQualificationTrigger && (await explicitQualificationTrigger.isVisible().catch(() => false))) {
        return explicitQualificationTrigger;
      }

      const genericQualificationTrigger = await this.findVisibleGenericSelectTrigger(modalRoot, 1);
      if (genericQualificationTrigger) {
        return genericQualificationTrigger;
      }

      await this.page.waitForTimeout(250);
    }

    throw new Error('Qualification Select button did not become visible for doctor user creation.');
  }

  private async findVisibleGenericSelectTrigger(modalRoot: Locator, index: number) {
    const triggerCandidates = modalRoot.locator('button, [role="button"], [role="combobox"]');
    const visibleButtons: Locator[] = [];
    const count = await triggerCandidates.count().catch(() => 0);

    for (let buttonIndex = 0; buttonIndex < count; buttonIndex++) {
      const button = triggerCandidates.nth(buttonIndex);
      if (!(await button.isVisible().catch(() => false))) {
        continue;
      }

      const text = ((await button.innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();
      const ariaLabel = ((await button.getAttribute('aria-label').catch(() => '')) ?? '').trim();
      const className = ((await button.getAttribute('class').catch(() => '')) ?? '').trim();
      const popupHint = ((await button.getAttribute('aria-haspopup').catch(() => '')) ?? '').trim();
      const combined = `${text} ${ariaLabel} ${className} ${popupHint}`.toLowerCase();

      if (
        !combined ||
        /branch|access role|role\*|title|gender|country|state|city|discard|create personnel|create user|browse image|add photo|done|upload/i.test(
          combined
        )
      ) {
        continue;
      }

      if (/select|special|qual|dropdown|listbox|combobox|provider|doctor/i.test(combined)) {
        visibleButtons.push(button);
      }
    }

    return visibleButtons[index];
  }

  private async selectDropdownOptionFromTrigger(trigger: Locator, options: { preferredOption?: string; random?: boolean } = {}) {
    await trigger.click({ force: true });

    const listbox = await this.waitForDropdownPopup(trigger);

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

    let optionItems: Locator | null = null;
    for (const locator of optionLocators) {
      const count = await locator.count().catch(() => 0);
      if (count > 0) {
        optionItems = locator;
        break;
      }
    }

    if (!optionItems) {
      throw new Error('No option items found for dropdown trigger.');
    }

    const selectableOptions: Array<{ index: number; text: string }> = [];
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
      throw new Error('No selectable option found for dropdown trigger.');
    }

    const selectedOption = options.random
      ? selectableOptions[Math.floor(Math.random() * selectableOptions.length)]
      : selectableOptions[0];

    await optionItems.nth(selectedOption.index).click({ force: true });
    await this.closeListboxIfVisible(listbox);
    return selectedOption.text;
  }

  private async selectDoctorQualificationOptions() {
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

    const selectableOptions: Array<{ option: Locator; text: string }> = [];
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

      selectableOptions.push({ option, text: optionText });
    }

    if (!selectableOptions.length) {
      throw new Error('No selectable qualification option found in the doctor Select popup.');
    }

    const shuffledOptions = [...selectableOptions].sort(() => Math.random() - 0.5);
    const selectionCount = Math.min(shuffledOptions.length, 2);
    const pickedLabels: string[] = [];

    for (let index = 0; index < selectionCount; index++) {
      const selectedOption = shuffledOptions[index];
      await selectedOption.option.click({ force: true });
      pickedLabels.push(selectedOption.text);
      await this.page.waitForTimeout(150);
    }

    return pickedLabels.join(', ');
  }

  private async findDropdownTrigger(modalRoot: Locator, labels: string | string[]) {
    for (const label of Array.isArray(labels) ? labels : [labels]) {
      const knownFieldTrigger = this.getKnownDropdownTrigger(modalRoot, label);
      if (knownFieldTrigger && (await knownFieldTrigger.isVisible().catch(() => false))) {
        return knownFieldTrigger;
      }

      const indexedFieldTrigger = this.getIndexedDropdownTrigger(modalRoot, label);
      if (indexedFieldTrigger && (await indexedFieldTrigger.isVisible().catch(() => false))) {
        return indexedFieldTrigger;
      }

      const mappedTrigger = this.getMappedDropdownTrigger(modalRoot, label);
      if (mappedTrigger && (await mappedTrigger.isVisible().catch(() => false))) {
        return mappedTrigger;
      }

      const exactTrigger = modalRoot.getByRole('button', { name: label, exact: true }).first();
      if ((await exactTrigger.count().catch(() => 0)) && (await exactTrigger.isVisible().catch(() => false))) {
        return exactTrigger;
      }

      const looseTrigger = modalRoot.getByRole('button', { name: new RegExp(this.escapeForRegex(label), 'i') }).first();
      if ((await looseTrigger.count().catch(() => 0)) && (await looseTrigger.isVisible().catch(() => false))) {
        return looseTrigger;
      }

      for (const namePattern of this.getDropdownTriggerNamePatterns(label)) {
        const namedButton = modalRoot.getByRole('button', { name: namePattern }).first();
        if ((await namedButton.count().catch(() => 0)) && (await namedButton.isVisible().catch(() => false))) {
          return namedButton;
        }

        const namedCombobox = modalRoot.getByRole('combobox', { name: namePattern }).first();
        if ((await namedCombobox.count().catch(() => 0)) && (await namedCombobox.isVisible().catch(() => false))) {
          return namedCombobox;
        }
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

      const labelAdjacentTrigger = await this.findDropdownTriggerNearLabel(modalRoot, label);
      if (labelAdjacentTrigger && (await labelAdjacentTrigger.isVisible().catch(() => false))) {
        return labelAdjacentTrigger;
      }
    }

    return null;
  }

  private getKnownDropdownTrigger(modalRoot: Locator, label: string) {
    const normalized = label.trim().toLowerCase();
    const selectorsByLabel: Record<string, string[]> = {
      'branch*': ['input[name="branchId"] ~ button.dropdown__trigger', 'input[name="branchId"] + button'],
      'role*': ['input[name="roleId"] ~ button.dropdown__trigger', 'input[name="roleId"] + button'],
      'access role*': ['input[name="roleId"] ~ button.dropdown__trigger', 'input[name="roleId"] + button'],
      'title*': ['input[name="title"] ~ button.dropdown__trigger', 'input[name="title"] + button'],
      'gender*': ['input[name="gender"] ~ button.dropdown__trigger', 'input[name="gender"] + button'],
      'country*': ['button#user-country', 'input[name="country"] ~ button.dropdown__trigger', 'input[name="country"] + button'],
      'country / region*': ['button#user-country', 'input[name="country"] ~ button.dropdown__trigger', 'input[name="country"] + button'],
      'state*': ['button#user-state', 'input[name="state"] ~ button.dropdown__trigger', 'input[name="state"] + button'],
      'state / province*': ['button#user-state', 'input[name="state"] ~ button.dropdown__trigger', 'input[name="state"] + button'],
      'city*': ['button#user-city', 'input[name="city"] ~ button.dropdown__trigger', 'input[name="city"] + button'],
      'city / municipality*': ['button#user-city', 'input[name="city"] ~ button.dropdown__trigger', 'input[name="city"] + button'],
    };

    for (const selector of selectorsByLabel[normalized] ?? []) {
      const candidate = modalRoot.locator(selector).first();
      if (candidate) {
        return candidate;
      }
    }

    return null;
  }

  private getIndexedDropdownTrigger(modalRoot: Locator, label: string) {
    const normalized = label.trim().toLowerCase();
    const triggerIndexes: Record<string, number> = {
      'branch*': 0,
      'role*': 1,
      'access role*': 1,
      'title*': 2,
      'gender*': 3,
      'country*': 4,
      'country / region*': 4,
      'state*': 5,
      'state / province*': 5,
      'city*': 6,
      'city / municipality*': 6,
    };

    const triggerIndex = triggerIndexes[normalized];
    if (triggerIndex === undefined) {
      return null;
    }

    return modalRoot.locator('button.dropdown__trigger, [role="button"].dropdown__trigger').nth(triggerIndex);
  }

  private async resolveVisibleLabel(trigger: Locator, labels: string[]) {
    const accessibleName =
      (await trigger.getAttribute('aria-label').catch(() => null)) ??
      (await trigger.innerText().catch(() => ''));

    const matchingLabel = labels.find((label) => new RegExp(this.escapeForRegex(label), 'i').test(accessibleName ?? ''));
    return matchingLabel ?? labels[0];
  }

  private async findDropdownTriggerNearLabel(modalRoot: Locator, label: string) {
    const escapedLabel = this.escapeForRegex(label);
    const xpathCandidates = [
      `xpath=.//*[normalize-space(text())="${label}"]/following::button[1]`,
      `xpath=.//*[normalize-space(text())="${label}"]/following::*[@role="button"][1]`,
      `xpath=.//*[normalize-space(text())="${label}"]/following::*[@role="combobox"][1]`,
      `xpath=.//*[contains(normalize-space(text()), "${label.replace(/"/g, '')}")]/following::button[1]`,
      `xpath=.//*[contains(normalize-space(text()), "${label.replace(/"/g, '')}")]/following::*[@role="button"][1]`,
      `xpath=.//*[contains(normalize-space(text()), "${label.replace(/"/g, '')}")]/following::*[@role="combobox"][1]`,
    ];

    for (const selector of xpathCandidates) {
      const candidate = modalRoot.locator(selector).first();
      if ((await candidate.count().catch(() => 0)) && (await candidate.isVisible().catch(() => false))) {
        return candidate;
      }
    }

    const textRows = modalRoot
      .locator('div, section, label, span, p')
      .filter({ hasText: new RegExp(`^${escapedLabel}$`, 'i') });

    const textRowCount = await textRows.count().catch(() => 0);
    for (let index = 0; index < textRowCount; index++) {
      const textRow = textRows.nth(index);
      if (!(await textRow.isVisible().catch(() => false))) {
        continue;
      }

      const nearbyCandidates = [
        textRow.locator('xpath=ancestor::*[self::div or self::section or self::label][1]//button').first(),
        textRow.locator('xpath=ancestor::*[self::div or self::section or self::label][1]//*[@role="button"]').first(),
        textRow.locator('xpath=ancestor::*[self::div or self::section or self::label][1]//*[@role="combobox"]').first(),
        textRow.locator('xpath=following-sibling::button[1]').first(),
        textRow.locator('xpath=following-sibling::*[@role="button"][1]').first(),
        textRow.locator('xpath=following-sibling::*[@role="combobox"][1]').first(),
        textRow.locator('xpath=following::button[1]').first(),
        textRow.locator('xpath=following::*[@role="button"][1]').first(),
        textRow.locator('xpath=following::*[@role="combobox"][1]').first(),
      ];

      for (const candidate of nearbyCandidates) {
        if ((await candidate.count().catch(() => 0)) && (await candidate.isVisible().catch(() => false))) {
          return candidate;
        }
      }
    }

    return null;
  }

  private async selectSearchableDropdown(modalRoot: Locator, label: string | string[], option: string, searchText: string) {
    const trigger = await this.findDropdownTrigger(modalRoot, label);
    if (!trigger) {
      const bodyText = await this.page.locator('body').innerText().catch(() => '');
      throw new Error(
        `Could not find searchable dropdown trigger for "${Array.isArray(label) ? label.join('" or "') : label}". Visible page text:\n${bodyText}`
      );
    }

    await trigger.click({ force: true });

    const dropdownPopup = await this.waitForDropdownPopup(trigger).catch(() => modalRoot);
    const searchCandidates = [
      dropdownPopup.getByRole('textbox', { name: /search options/i }).last(),
      dropdownPopup.getByRole('textbox', { name: /search/i }).last(),
      dropdownPopup.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]').last(),
      this.page.getByRole('textbox', { name: /search options/i }).last(),
      this.page.getByRole('textbox', { name: /search/i }).last(),
    ];

    for (const search of searchCandidates) {
      if ((await search.count().catch(() => 0)) && (await search.isVisible().catch(() => false))) {
        await search.fill(option).catch(async () => {
          await search.fill(searchText).catch(() => {});
        });
        await this.page.waitForTimeout(300);
        break;
      }
    }

    const optionCandidates = [
      dropdownPopup.getByRole('button', { name: option, exact: true }).last(),
      dropdownPopup.getByRole('option', { name: option, exact: true }).last(),
      dropdownPopup.getByRole('button', { name: new RegExp(`^${this.escapeForRegex(option)}$`, 'i') }).last(),
      dropdownPopup.getByRole('option', { name: new RegExp(`^${this.escapeForRegex(option)}$`, 'i') }).last(),
      dropdownPopup.getByText(new RegExp(`^${this.escapeForRegex(option)}$`, 'i')).last(),
      this.page.getByRole('button', { name: option, exact: true }).last(),
      this.page.getByRole('option', { name: option, exact: true }).last(),
      this.page.getByRole('button', { name: new RegExp(`^${this.escapeForRegex(option)}$`, 'i') }).last(),
      this.page.getByRole('option', { name: new RegExp(`^${this.escapeForRegex(option)}$`, 'i') }).last(),
      this.page.getByText(new RegExp(`^${this.escapeForRegex(option)}$`, 'i')).last(),
    ];

    for (const candidate of optionCandidates) {
      if (await candidate.isVisible().catch(() => false)) {
        await candidate.click({ force: true, timeout: 5000 });
        await this.closeListboxIfVisible(dropdownPopup);
        return;
      }
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    throw new Error(`Could not select "${option}" for "${label}". Visible page text:\n${bodyText}`);
  }

  private async selectSearchableDropdownIfVisible(
    modalRoot: Locator,
    label: string | string[],
    option: string,
    searchText: string
  ) {
    const trigger = await this.findDropdownTrigger(modalRoot, label);
    if (!trigger || !(await trigger.isVisible().catch(() => false))) {
      return false;
    }

    await this.selectSearchableDropdown(modalRoot, label, option, searchText);
    return true;
  }

  private async closeListboxIfVisible(listbox: Locator) {
    if (await listbox.isVisible().catch(() => false)) {
      await this.page.keyboard.press('Escape').catch(() => {});
      await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
  }

  private getMappedDropdownTrigger(modalRoot: Locator, label: string) {
    const normalized = label.trim().toLowerCase();
    const mappedSelectors: Record<string, string[]> = {
      'branch*': ['button#«r9»', 'input[name="branchId"] + button', 'input[name="branchId"] ~ button.dropdown__trigger'],
      'role*': ['input[name="roleId"] + button', 'input[name="roleId"] ~ button.dropdown__trigger'],
      'access role*': ['input[name="roleId"] + button', 'input[name="roleId"] ~ button.dropdown__trigger'],
      'title*': ['input[name="title"] + button', 'input[name="title"] ~ button.dropdown__trigger'],
      'gender*': ['input[name="gender"] + button', 'input[name="gender"] ~ button.dropdown__trigger'],
      'country*': ['button#user-country', 'input[name="country"] + button', 'input[name="country"] ~ button.dropdown__trigger'],
      'country / region*': ['button#user-country', 'input[name="country"] + button', 'input[name="country"] ~ button.dropdown__trigger'],
      'state*': ['button#user-state', 'input[name="state"] + button', 'input[name="state"] ~ button.dropdown__trigger'],
      'state / province*': ['button#user-state', 'input[name="state"] + button', 'input[name="state"] ~ button.dropdown__trigger'],
      'city*': ['button#user-city', 'input[name="city"] + button', 'input[name="city"] ~ button.dropdown__trigger'],
      'city / municipality*': ['button#user-city', 'input[name="city"] + button', 'input[name="city"] ~ button.dropdown__trigger'],
    };

    const selectors = mappedSelectors[normalized] ?? [];
    for (const selector of selectors) {
      const candidate = modalRoot.locator(selector).first();
      if ((candidate as Locator)) {
        return candidate;
      }
    }

    return null;
  }

  private getDropdownTriggerNamePatterns(label: string) {
    const normalized = label.trim().toLowerCase();
    const patternsByLabel: Record<string, RegExp[]> = {
      'branch*': [/^select branch$/i, /^branch$/i],
      'role*': [/^select role$/i, /^role$/i, /^access role$/i],
      'access role*': [/^select role$/i, /^role$/i, /^access role$/i],
      'country*': [/^india$/i, /^select country$/i, /^select region$/i],
      'country / region*': [/^india$/i, /^select country$/i, /^select region$/i],
      'state*': [/^select state$/i, /^tamil nadu$/i],
      'state / province*': [/^select state$/i, /^tamil nadu$/i],
      'city*': [/^select city$/i, /^thanjavur$/i],
      'city / municipality*': [/^select city$/i, /^thanjavur$/i],
    };

    return patternsByLabel[normalized] ?? [];
  }

  private async waitForDropdownPopup(trigger: Locator) {
    const listboxId = await trigger.getAttribute('aria-controls');
    const popupCandidates = [
      listboxId ? this.page.locator(`[id="${listboxId}"]`) : null,
      this.page.locator('[role="listbox"]:visible').last(),
      this.page.locator('[role="dialog"]:visible').last(),
      this.page.locator('.dropdown-menu:visible, .menu:visible, .popover:visible').last(),
    ].filter(Boolean) as Locator[];

    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      for (const popup of popupCandidates) {
        if (await popup.isVisible().catch(() => false)) {
          return popup;
        }
      }

      await this.page.waitForTimeout(250);
    }

    throw new Error('Dropdown popup did not become visible after opening the trigger.');
  }

  private async findUserTextbox(
    modalRoot: Locator,
    options: { fieldName: string; names?: string[]; labels?: string[]; placeholders?: string[] }
  ) {
    const candidates: Locator[] = [];

    for (const name of options.names ?? []) {
      candidates.push(modalRoot.locator(`input[name="${name}"], textarea[name="${name}"]`).first());
      candidates.push(this.page.locator(`input[name="${name}"]:visible, textarea[name="${name}"]:visible`).first());
    }

    for (const label of options.labels ?? []) {
      candidates.push(modalRoot.getByRole('textbox', { name: label }).first());
      candidates.push(modalRoot.getByLabel(label, { exact: true }).first());
      candidates.push(modalRoot.getByText(new RegExp(`^${this.escapeForRegex(label)}$`, 'i')).locator('xpath=following::input[1]').first());
      candidates.push(modalRoot.getByText(new RegExp(`^${this.escapeForRegex(label)}$`, 'i')).locator('xpath=following::textarea[1]').first());
    }

    for (const placeholder of options.placeholders ?? []) {
      candidates.push(modalRoot.getByPlaceholder(placeholder, { exact: true }).first());
    }

    for (const candidate of candidates) {
      if ((await candidate.count().catch(() => 0)) && (await candidate.isVisible().catch(() => false))) {
        return candidate;
      }
    }

    const visibleInputs = await modalRoot.locator('input:visible, textarea:visible').evaluateAll((elements) =>
      elements.map((element) => {
        const input = element as HTMLInputElement | HTMLTextAreaElement;
        return {
          name: input.getAttribute('name') ?? '',
          ariaLabel: input.getAttribute('aria-label') ?? '',
          placeholder: input.getAttribute('placeholder') ?? '',
          type: input.getAttribute('type') ?? '',
        };
      })
    ).catch(() => []);

    throw new Error(
      `Could not find visible textbox for "${options.fieldName}". Visible inputs: ${JSON.stringify(visibleInputs)}`
    );
  }

  private async fillTextbox(locator: Locator, value: string) {
    await locator.waitFor({ state: 'visible', timeout: 5000 }).catch(async () => {
      const descriptor =
        (await locator.getAttribute('name').catch(() => '')) ||
        (await locator.getAttribute('aria-label').catch(() => '')) ||
        (await locator.getAttribute('placeholder').catch(() => '')) ||
        'unknown textbox';
      throw new Error(`Textbox "${descriptor}" did not become visible while filling the user form.`);
    });
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.click({ force: true }).catch(() => {});
    await locator.fill('');
    await locator.fill(value);
  }

  private async uploadFirstDownloadPhoto(modalRoot: Locator) {
    const photoPath = this.getFirstDownloadPhotoPath();
    if (!photoPath) {
      throw new Error(`Could not find an image file in ${join(homedir(), 'Downloads')}.`);
    }

    const openPhotoPanelCandidates = [
      modalRoot.getByRole('button', { name: /browse image/i }).first(),
      modalRoot.getByText(/tap to choose a photo/i).first(),
      modalRoot.getByText(/add photo/i).first(),
    ];

    for (const candidate of openPhotoPanelCandidates) {
      if (await candidate.isVisible().catch(() => false)) {
        await candidate.click({ force: true }).catch(() => {});
        break;
      }
    }

    const inputCandidates = [
      modalRoot.locator('input[type="file"]').last(),
      this.page.locator('input[type="file"]').last(),
    ];

    for (const input of inputCandidates) {
      if ((await input.count().catch(() => 0)) === 0) {
        continue;
      }

      await input.setInputFiles(photoPath).catch(() => {});

      const applyUploadButton = this.page.getByRole('button', { name: /^Apply & upload$/i }).first();
      if (await applyUploadButton.isVisible().catch(() => false)) {
        await applyUploadButton.click({ force: true }).catch(() => {});
      }

      const photoSavedSignals = [
        this.page.getByText(/photo saved/i).last(),
        this.page.getByText(/saved/i).last(),
      ];

      const savedDeadline = Date.now() + 15000;
      while (Date.now() < savedDeadline) {
        let photoSaved = false;
        for (const signal of photoSavedSignals) {
          if (await signal.isVisible().catch(() => false)) {
            photoSaved = true;
            break;
          }
        }

        if (photoSaved) {
          break;
        }

        await this.page.waitForTimeout(250);
      }

      const photoDialog = this.getVisiblePhotoDialog();
      const doneCandidates = [
        photoDialog.getByRole('button', { name: /^done$/i }).last(),
        photoDialog.locator('button').filter({ hasText: /^Done$/i }).last(),
        this.page.getByRole('button', { name: /^done$/i }).last(),
        this.page.locator('button').filter({ hasText: /^Done$/i }).last(),
      ];

      for (const doneButton of doneCandidates) {
        if (await doneButton.isVisible().catch(() => false)) {
          await doneButton.click({ force: true }).catch(() => {});
          break;
        }
      }

      await this.waitForPhotoDialogToClose();
      await this.page.waitForTimeout(500);
      return;
    }

    throw new Error(`Could not find a file input to upload ${photoPath} in the create personnel form.`);
  }

  private getVisiblePhotoDialog() {
    return this.page.locator('.custom-modal:visible, [role="dialog"]:visible, .app-modal:visible').filter({ hasText: /user photo/i }).last();
  }

  private async waitForPhotoDialogToClose() {
    const photoDialog = this.getVisiblePhotoDialog();
    const deadline = Date.now() + 8000;

    while (Date.now() < deadline) {
      if (!(await photoDialog.isVisible().catch(() => false))) {
        return;
      }

      const closeCandidates = [
        photoDialog.getByRole('button', { name: /^done$/i }).last(),
        photoDialog.getByRole('button', { name: /^close$/i }).last(),
        photoDialog.locator('button').filter({ hasText: /^Done$/i }).last(),
        photoDialog.locator('button').first(),
      ];

      for (const candidate of closeCandidates) {
        if (await candidate.isVisible().catch(() => false)) {
          await candidate.click({ force: true }).catch(() => {});
        }
      }

      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(250);
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    throw new Error(`User photo dialog did not close after upload. Visible page text:\n${bodyText}`);
  }

  private getFirstDownloadPhotoPath() {
    const downloadsDir = join(homedir(), 'Downloads');
    if (!existsSync(downloadsDir)) {
      return null;
    }

    const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
    const files = readdirSync(downloadsDir)
      .filter((name) => imageExtensions.has(extname(name).toLowerCase()))
      .sort((left, right) => left.localeCompare(right))
      .map((name) => join(downloadsDir, name))
      .filter((filePath) => {
        try {
          return statSync(filePath).isFile();
        } catch {
          return false;
        }
      });

    return files[0] ?? null;
  }

  private getVisibleUserModal() {
    return this.page.locator('.custom-modal:visible, [role="dialog"]:visible, .app-modal:visible').last();
  }

  private async getVisibleCreateUserFormModal() {
    const visibleModals = this.page.locator('.custom-modal:visible, [role="dialog"]:visible, .app-modal:visible');
    const modalCandidates = [
      visibleModals
        .filter({
          has: this.page.locator(
            'input[name="firstName"], input[name="lastName"], input[name="email"], input[name="mobile"], input[placeholder="DD/MM/YYYY"], textarea[name="addressLine1"]'
          ),
        })
        .last(),
      visibleModals
        .filter({
          has: this.page.locator('input[name="firstName"], input[name="email"], input[name="mobile"], textarea, input'),
          hasNot: this.page.getByText(/tap to replace photo|browse image|photo saved/i),
        })
        .last(),
      visibleModals.filter({
        has: this.page.getByText(/first name\*|access role\*|date of joining\*|zip \/ postal code\*/i),
        hasNot: this.page.getByText(/tap to replace photo|browse image|photo saved/i),
      }).last(),
    ];

    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      for (const candidate of modalCandidates) {
        if (!(await candidate.isVisible().catch(() => false))) {
          continue;
        }

        const visibleInputCount = await candidate.locator('input:visible, textarea:visible').count().catch(() => 0);
        if (visibleInputCount > 0) {
          return candidate;
        }
      }

      await this.page.waitForTimeout(250);
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    throw new Error(`Could not find the visible create-user form modal. Visible page text:\n${bodyText}`);
  }

  private async waitForUserFormToOpen() {
    const modalRoot = await this.getVisibleCreateUserFormModal();
    const readySignals = [
      modalRoot.getByRole('heading', { name: /create (user|personnel|personal|personnal)|add (user|personnel|personal|personnal)|new (user|personnel|personal|personnal)/i }).first(),
      modalRoot.getByRole('textbox', { name: /first name\*/i }).first(),
      modalRoot.getByRole('button', { name: /branch\*/i }).first(),
    ];

    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      if (await modalRoot.isVisible().catch(() => false)) {
        for (const signal of readySignals) {
          if (await signal.isVisible().catch(() => false)) {
            return;
          }
        }
      }

      await this.page.waitForTimeout(250);
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    throw new Error(`Create user form did not become ready. Visible page text:\n${bodyText}`);
  }

  private async waitForCreateUserSubmissionResult(modalRoot: Locator) {
    const successMessages = [
      this.page.getByRole('heading', { name: /^user created$/i }).first(),
      this.page.getByRole('heading', { name: /^personnel created$/i }).first(),
      this.page.getByRole('heading', { name: /^personal created$/i }).first(),
      this.page.getByRole('heading', { name: /^personnal created$/i }).first(),
      this.page.getByText(/new user has been created successfully/i).first(),
      this.page.getByText(/new personnel has been created successfully/i).first(),
      this.page.getByText(/new personal has been created successfully/i).first(),
      this.page.getByText(/new personnal has been created successfully/i).first(),
      this.page.getByText(/user created successfully/i).first(),
      this.page.getByText(/personnel created successfully/i).first(),
      this.page.getByText(/personal created successfully/i).first(),
      this.page.getByText(/personnal created successfully/i).first(),
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

  private async prepareCreateUserFormForRole(role: string) {
    const normalizedRole = this.normalizeRole(role);
    const targetTabName = /^provider$/i.test(normalizedRole) ? 'Provider' : 'Personnel';
    const targetTab = this.page.getByRole('tab', { name: targetTabName }).first();

    if (!(await targetTab.isVisible().catch(() => false))) {
      return;
    }

    const modalRoot = this.getVisibleUserModal();
    if (await modalRoot.isVisible().catch(() => false)) {
      await this.page.keyboard.press('Escape').catch(() => {});
      await modalRoot.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    }

    await targetTab.click({ force: true });
    await this.openCreateUserForm();
  }

  private async openPersonnelSection() {
    const personnelTabCandidates = [
      this.page.getByRole('tab', { name: /^Personnel$/i }).first(),
      this.page.getByText(/^Personnel$/i).first(),
      this.page.locator('button, a, div').filter({ hasText: /^Personnel$/i }).first(),
    ];

    const createPersonnelButton = this.page.getByRole('button', { name: /^Create Personnel$/i }).first();
    if (await createPersonnelButton.isVisible().catch(() => false)) {
      return;
    }

    for (const candidate of personnelTabCandidates) {
      if (!(await candidate.isVisible().catch(() => false))) {
        continue;
      }

      await candidate.click({ force: true }).catch(() => {});

      const deadline = Date.now() + 10000;
      while (Date.now() < deadline) {
        if (await createPersonnelButton.isVisible().catch(() => false)) {
          return;
        }

        await this.page.waitForTimeout(250);
      }
    }
  }

  private async waitForDashboardToBeInteractive() {
    const loadingPattern = /loading your profile/i;
    const deadline = Date.now() + 45000;
    let recoveredFromLoginShell = false;

    while (Date.now() < deadline) {
      if (this.page.isClosed()) {
        throw new Error('Dashboard page was closed before user navigation became available.');
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
        await this.page.waitForTimeout(500);
        continue;
      }

      const navReadyCandidates = [
        this.page.locator('nav').getByRole('button', { name: /^Branches$/i }).first(),
        this.page.getByRole('button', { name: /^Branches$/i }).first(),
        this.page.getByRole('link', { name: /^All branches$/i }).first(),
        this.page.locator('nav').first(),
      ];

      for (const candidate of navReadyCandidates) {
        if (await candidate.isVisible().catch(() => false)) {
          return;
        }
      }

      await this.page.waitForTimeout(250);
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    throw new Error(`Dashboard did not finish loading before user navigation. Visible page text:\n${bodyText}`);
  }

  private normalizeRole(role: string) {
    if (/^doctor$/i.test(role.trim())) {
      return 'Provider';
    }

    return role;
  }

  private async findDateInput(modalRoot: Locator, label: string) {
    const dateOnlyInputs = modalRoot.locator('input[placeholder="DD/MM/YYYY"], input[placeholder*="DD/MM"]');
    const visibleDateOnlyInputs: Locator[] = [];
    const dateOnlyCount = await dateOnlyInputs.count().catch(() => 0);

    for (let index = 0; index < dateOnlyCount; index++) {
      const input = dateOnlyInputs.nth(index);
      if (await input.isVisible().catch(() => false)) {
        visibleDateOnlyInputs.push(input);
      }
    }

    const preferredIndex = /joining/i.test(label) ? 1 : 0;
    const preferredDateInput = visibleDateOnlyInputs[preferredIndex] ?? visibleDateOnlyInputs[0];
    if (preferredDateInput) {
      return preferredDateInput;
    }

    const allDateInputs = modalRoot.locator('input');
    const visibleDateInputs: Locator[] = [];
    const count = await allDateInputs.count().catch(() => 0);

    for (let index = 0; index < count; index++) {
      const input = allDateInputs.nth(index);
      if (!(await input.isVisible().catch(() => false))) {
        continue;
      }

      const placeholder = (await input.getAttribute('placeholder').catch(() => '')) ?? '';
      const ariaLabel = (await input.getAttribute('aria-label').catch(() => '')) ?? '';
      if (/dd\/mm/i.test(placeholder) || new RegExp(this.escapeForRegex(label), 'i').test(ariaLabel)) {
        visibleDateInputs.push(input);
      }
    }

    const targetIndex = /joining/i.test(label) ? 1 : 0;
    const selectedInput = visibleDateInputs[targetIndex] ?? visibleDateInputs[0];

    if (selectedInput) {
      return selectedInput;
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    throw new Error(`Could not find date input for "${label}". Visible page text:\n${bodyText}`);
  }

  private buildPreviousMonthDate(day: string) {
    const today = new Date();
    const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, Number(day));
    const dd = String(previousMonthDate.getDate()).padStart(2, '0');
    const mm = String(previousMonthDate.getMonth() + 1).padStart(2, '0');
    const yyyy = String(previousMonthDate.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }

  private async tryFillDateInput(dateInput: Locator, value: string) {
    try {
      await dateInput.click({ force: true }).catch(() => {});
      await dateInput.press('Control+A').catch(() => {});
      await dateInput.fill('');
      await dateInput.type(value, { delay: 10 }).catch(async () => {
        await dateInput.fill(value);
      });
      await dateInput.evaluate((element, nextValue) => {
        const input = element as HTMLInputElement;
        const prototype = Object.getPrototypeOf(input);
        const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
        descriptor?.set?.call(input, nextValue as string);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
      }, value);
      await this.page.keyboard.press('Tab').catch(() => {});

      const currentValue = (await dateInput.inputValue().catch(() => '')).trim();
      const normalizedCurrent = currentValue.replace(/\s+/g, '');
      const normalizedExpected = value.replace(/\s+/g, '');
      return normalizedCurrent === normalizedExpected || normalizedCurrent.length > 0;
    } catch {
      return false;
    }
  }

  private async setUserDateByIndex(modalRoot: Locator, index: number, value: string, label: string) {
    const dateInputs = await this.getVisibleDateInputs(modalRoot);
    const visibleDateInput = dateInputs[index];
    const shouldPreferPicker = /date of birth/i.test(label);

    if (shouldPreferPicker && (await this.selectDateFromPicker(modalRoot, label, value, visibleDateInput))) {
      await this.closeVisibleDatePicker();
      return;
    }

    if (visibleDateInput) {
      await visibleDateInput.scrollIntoViewIfNeeded().catch(() => {});

      if (await this.tryFillDateInput(visibleDateInput, value)) {
        await this.closeVisibleDatePicker();
        return;
      }
    }

    const labelControl = await this.findDateFieldControlByLabel(modalRoot, label);
    if (!labelControl) {
      const bodyText = await this.page.locator('body').innerText().catch(() => '');
      throw new Error(`Could not find date control for "${label}". Visible page text:\n${bodyText}`);
    }

    await labelControl.scrollIntoViewIfNeeded().catch(() => {});

    if (await this.trySetDateControlValue(labelControl, value)) {
      await this.closeVisibleDatePicker();
      return;
    }

    if (await this.selectDateFromPicker(modalRoot, label, value, labelControl)) {
      await this.closeVisibleDatePicker();
      return;
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    throw new Error(`Could not set date value for "${label}". Visible page text:\n${bodyText}`);
  }

  private async getVisibleDateInputs(modalRoot: Locator) {
    const inputs = modalRoot.locator('input[placeholder="DD/MM/YYYY"], input[placeholder*="DD/MM"]');
    const visibleInputs: Locator[] = [];
    const count = await inputs.count().catch(() => 0);

    for (let index = 0; index < count; index++) {
      const input = inputs.nth(index);
      if (await input.isVisible().catch(() => false)) {
        visibleInputs.push(input);
      }
    }

    return visibleInputs;
  }

  private async findDateFieldControlByLabel(modalRoot: Locator, label: string) {
    const escapedLabel = this.escapeForRegex(label);
    const xpathCandidates = [
      `xpath=.//*[normalize-space(text())="${label}"]/following::input[1]`,
      `xpath=.//*[normalize-space(text())="${label}"]/following::*[@role="textbox"][1]`,
      `xpath=.//*[normalize-space(text())="${label}"]/following::button[1]`,
      `xpath=.//*[normalize-space(text())="${label}"]/parent::*//input[1]`,
      `xpath=.//*[normalize-space(text())="${label}"]/parent::*//*[@role="textbox"][1]`,
      `xpath=.//*[normalize-space(text())="${label}"]/parent::*//button[1]`,
    ];

    for (const selector of xpathCandidates) {
      const candidate = modalRoot.locator(selector).first();
      if ((await candidate.count().catch(() => 0)) && (await candidate.isVisible().catch(() => false))) {
        return candidate;
      }
    }

    const textRow = modalRoot.locator('div, section, label').filter({ hasText: new RegExp(`^${escapedLabel}$`, 'i') }).first();
    if ((await textRow.count().catch(() => 0)) && (await textRow.isVisible().catch(() => false))) {
      const nearbyCandidates = [
        textRow.locator('input, button, [role="textbox"], [role="button"]').first(),
        textRow.locator('xpath=following::input[1]').first(),
        textRow.locator('xpath=following::button[1]').first(),
      ];

      for (const candidate of nearbyCandidates) {
        if ((await candidate.count().catch(() => 0)) && (await candidate.isVisible().catch(() => false))) {
          return candidate;
        }
      }
    }

    return null;
  }

  private async trySetDateControlValue(control: Locator, value: string) {
    try {
      const tagName = (await control.evaluate((element) => element.tagName.toLowerCase()).catch(() => '')) ?? '';
      const role = ((await control.getAttribute('role').catch(() => '')) ?? '').toLowerCase();

      if (tagName === 'input' || role === 'textbox') {
        return await this.tryFillDateInput(control, value);
      }

      const nestedInput = control.locator('input').first();
      if ((await nestedInput.count().catch(() => 0)) && (await nestedInput.isVisible().catch(() => false))) {
        return await this.tryFillDateInput(nestedInput, value);
      }

      return false;
    } catch {
      return false;
    }
  }

  private async selectDateFromPicker(modalRoot: Locator, label: string, value: string, trigger?: Locator) {
    const datePicker = this.page.locator('.react-datepicker:visible, .rdp:visible, [role="dialog"]:visible').last();

    if (!(await datePicker.isVisible().catch(() => false))) {
      const clickableTrigger = trigger ?? (await this.findDateFieldControlByLabel(modalRoot, label));
      if (!clickableTrigger) {
        return false;
      }

      await clickableTrigger.scrollIntoViewIfNeeded().catch(() => {});
      await clickableTrigger.click({ force: true }).catch(() => {});
    }

    if (!(await datePicker.isVisible().catch(() => false))) {
      return false;
    }

    const previousMonthButton = this.page.getByRole('button', { name: /previous month/i }).last();
    if (await previousMonthButton.isVisible().catch(() => false)) {
      await previousMonthButton.click({ force: true }).catch(() => {});
    }

    const day = value.slice(0, 2).replace(/^0/, '') || value.slice(0, 2);
    const dayCandidates = [
      datePicker.getByRole('button', { name: new RegExp(`^${this.escapeForRegex(day)}$`) }).first(),
      this.page.getByRole('button', { name: new RegExp(`^${this.escapeForRegex(day)}$`) }).last(),
    ];

    for (const candidate of dayCandidates) {
      if (await candidate.isVisible().catch(() => false)) {
        await candidate.click({ force: true, timeout: 5000 });
        return true;
      }
    }

    return false;
  }

  private async closeVisibleDatePicker() {
    const datePicker = this.page.locator('.react-datepicker:visible, .rdp:visible, [role="dialog"]:visible').last();
    if (!(await datePicker.isVisible().catch(() => false))) {
      return;
    }

    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.mouse.click(20, 20).catch(() => {});
    await datePicker.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  }
}
