import { expect, type Page } from '@playwright/test';
import { type LeadTestData } from '../utils/testData';

export class LeadsPage {
  constructor(private page: Page) {}

  async openAddLeadForm() {
    await this.page.getByRole('button', { name: 'Add lead' }).click();
    await expect(this.page.locator('#firstName')).toBeVisible({ timeout: 10000 });
  }

  async fillLeadForm(lead: LeadTestData, missingField?: string) {
    const normalizedField = missingField?.trim().toLowerCase();
    const isMissingField = (...fieldNames: string[]) => fieldNames.includes(normalizedField ?? '');

    await this.fillVisibleField(this.page.locator('#firstName'), isMissingField('first name') ? '' : lead.firstName);
    await this.fillVisibleField(this.page.locator('#middleName'), lead.middleName);
    await this.fillVisibleField(this.page.locator('#lastName'), isMissingField('last name') ? '' : lead.lastName);

    await this.selectLeadDateOfBirth();
    await this.selectRandomBasicDetailsOption('gender', lead.gender);
    await this.selectRandomStatusOption(lead.status);
    await this.selectRandomBasicDetailsOption('lead source', lead.source);
    await this.selectRandomLanguageOptions(lead.languages);
    await this.selectRandomBasicDetailsOption('blood group', lead.bloodGroup);

    await this.fillVisibleField(this.page.locator('#homePhone'), isMissingField('home phone') ? '' : lead.homePhone);
    await this.fillVisibleField(this.page.locator('#phone'), isMissingField('mobile', 'mobile number') ? '' : lead.mobile);
    await this.fillVisibleField(this.page.getByRole('textbox', { name: 'Enter your email address' }), 
      isMissingField('email') ? '' : lead.email
    );

    await this.scrollLeadForm('down');
    await this.fillVisibleField(this.page.getByRole('textbox', { name: 'e.g. 2B' }), lead.houseNumber);
    await this.fillVisibleField(this.page.getByRole('textbox', { name: 'e.g. Floor 2, Suite 204,' }), lead.addressLine1);
    await this.fillVisibleField(this.page.getByRole('textbox', { name: 'e.g. 123, MG Road, Near City' }), lead.addressLine2);
    await this.fillVisibleField(this.page.locator('#addressLine3'), lead.addressLine3);
    await this.selectCountryStateCity(lead);
    await this.fillVisibleField(this.page.getByRole('textbox', { name: 'Enter your postal code' }),
      isMissingField('postal code') ? '' : lead.postalCode
    );
    await this.fillVisibleField(this.page.locator('#notes'), lead.notes);
  }

  async submitLeadForm() {
    const saveButton = this.page.getByRole('button', { name: 'Save Lead' });
    await saveButton.scrollIntoViewIfNeeded().catch(() => {});
    await this.scrollLeadForm();
    await saveButton.click({ force: true });
  }

  async verifyLeadCreated(lead: LeadTestData) {
    const successIndicators = [
      this.page.getByText(/lead created successfully/i).first(),
      this.page.getByText(/new lead has been created successfully/i).first(),
      this.page.getByText(/created successfully/i).first(),
      this.page.getByText(/saved successfully/i).first(),
      this.page.getByText(/lead saved successfully/i).first(),
      this.page.getByText(/^Lead created$/i).first(),
      this.page.getByText(new RegExp(this.escapeForRegex(lead.email), 'i')).first(),
    ];

    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      for (const indicator of successIndicators) {
        if (await indicator.isVisible().catch(() => false)) {
          await expect(indicator).toBeVisible({ timeout: 5000 });
          return;
        }
      }

      await this.page.waitForTimeout(250);
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    throw new Error(
      `Expected a visible lead creation success toast for ${lead.email}, but none appeared within 20 seconds. Visible page text:\n${bodyText}`
    );
  }

  async verifyRequiredValidations() {
    await expect(this.page.locator('body')).toContainText(/required|invalid/i, { timeout: 10000 });
  }

  async verifyRequiredValidation(message: string) {
    await expect(this.page.locator('body')).toContainText(message, { ignoreCase: true, timeout: 10000 });
  }

  private async selectLeadDateOfBirth() {
    const dateInput = this.page.getByRole('textbox', { name: 'DD/MM/YYYY' });
    await dateInput.scrollIntoViewIfNeeded().catch(() => {});
    await dateInput.click({ force: true }).catch(() => {});
    await dateInput.fill('').catch(() => {});
    await dateInput.click({ force: true });

    const previousMonthButton = this.page.getByRole('button', { name: /previous month/i }).last();
    if (await previousMonthButton.isVisible().catch(() => false)) {
      await previousMonthButton.click({ force: true });
    }

    const dayCandidates = [
      this.page.locator('.react-datepicker:visible, .rdp:visible, [role="dialog"]:visible').getByRole('button', { name: /^18$/ }).first(),
      this.page.getByRole('button', { name: /^18$/ }).last(),
    ];

    for (const candidate of dayCandidates) {
      if (await candidate.isVisible().catch(() => false)) {
        await candidate.click({ force: true });
        await this.dismissDatePicker(dateInput);
        return;
      }
    }

    throw new Error('Could not select lead date of birth day 18 from the previous month.');
  }

  private async dismissDatePicker(dateInput: ReturnType<Page['getByRole']>) {
    const datePicker = this.page.locator('.react-datepicker:visible, .rdp:visible, [role="dialog"]:visible').last();
    if (!(await datePicker.isVisible().catch(() => false))) {
      return;
    }

    await dateInput.press('Tab').catch(() => {});
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.mouse.click(20, 20).catch(() => {});
    await datePicker.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  }

  private async selectCountryStateCity(lead: LeadTestData) {
    await this.scrollLeadForm('down');
    await this.openNextSelectDropdown();
    await this.page.getByRole('textbox', { name: 'Search options' }).fill('indi');
    await this.page.getByRole('button', { name: lead.country, exact: true }).click();

    await this.openNextSelectDropdown();
    await this.page.getByRole('button', { name: lead.state }).click();

    await this.openNextSelectDropdown();
    await this.page.getByRole('button', { name: lead.city, exact: true }).click();
  }

  private async fillVisibleField(locator: ReturnType<Page['locator']> | ReturnType<Page['getByRole']>, value: string) {
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    await locator.click({ force: true }).catch(() => {});
    await locator.fill(value);
  }

  private async clickDropdownOption(optionName: string) {
    const candidates = [
      this.page.getByRole('option', { name: optionName, exact: true }).first(),
      this.page.getByRole('option', { name: new RegExp(`^${this.escapeForRegex(optionName)}$`, 'i') }).first(),
      this.page.getByRole('button', { name: optionName, exact: true }).first(),
      this.page.getByRole('button', { name: new RegExp(`^${this.escapeForRegex(optionName)}$`, 'i') }).first(),
      this.page.getByText(new RegExp(`^${this.escapeForRegex(optionName)}$`, 'i')).first(),
    ];

    for (const candidate of candidates) {
      if (await candidate.isVisible().catch(() => false)) {
        await candidate.click({ force: true });
        return;
      }
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    throw new Error(`Could not find dropdown option "${optionName}". Visible page text:\n${bodyText}`);
  }

  private async selectRandomStatusOption(_statusName: string) {
    await this.focusBasicDetailsRegion();
    const statusButtons = this.page.getByLabel('Basic Details').getByRole('button');
    const selectableOptions = await this.collectVisibleButtonOptions(statusButtons, [
      'select',
      'female',
      'male',
      'other',
      'excel import',
      'a+',
      'a-',
      'b+',
      'b-',
      'ab+',
      'ab-',
      'o+',
      'o-',
    ]);

    if (!selectableOptions.length) {
      throw new Error('Could not find any selectable lead status buttons in Basic Details.');
    }

    const selectedOption = selectableOptions[Math.floor(Math.random() * selectableOptions.length)];
    await statusButtons.nth(selectedOption.index).click({ force: true });
  }

  private async selectRandomBasicDetailsOption(_fieldLabel: string, fallbackOption: string) {
    await this.focusBasicDetailsRegion();
    await this.openNextSelectDropdown();

    const overlayButtons = this.getVisibleOverlayButtons();
    const selectableOptions = await this.collectVisibleButtonOptions(overlayButtons, ['select']);
    if (!selectableOptions.length) {
      const fallback = this.page.getByRole('button', { name: fallbackOption, exact: true }).first();
      if (await fallback.isVisible().catch(() => false)) {
        await fallback.click({ force: true });
        return;
      }

      throw new Error(`Could not find any selectable options for lead field "${_fieldLabel}".`);
    }

    const selectedOption = selectableOptions[Math.floor(Math.random() * selectableOptions.length)];
    await overlayButtons.nth(selectedOption.index).click({ force: true });
  }

  private async selectRandomLanguageOptions(_languages: string[]) {
    await this.focusBasicDetailsRegion();
    await this.openNextSelectDropdown();

    const overlayButtons = this.getVisibleOverlayButtons();
    const selectableOptions = await this.collectVisibleButtonOptions(overlayButtons, ['select']);
    if (!selectableOptions.length) {
      throw new Error('Could not find any selectable language options.');
    }

    const shuffledOptions = [...selectableOptions].sort(() => Math.random() - 0.5);
    const pickCount = Math.min(shuffledOptions.length, 2);
    for (let index = 0; index < pickCount; index++) {
      await overlayButtons.nth(shuffledOptions[index].index).click({ force: true });
      await this.sleep(100);
    }

    await this.focusBasicDetailsRegion();
  }

  private async openNextSelectDropdown() {
    const selectButtons = this.page.getByRole('button', { name: /^select$/i });
    const count = await selectButtons.count().catch(() => 0);

    for (let index = 0; index < count; index++) {
      const trigger = selectButtons.nth(index);
      if (await trigger.isVisible().catch(() => false)) {
        await trigger.scrollIntoViewIfNeeded().catch(() => {});
        await trigger.click({ force: true });
        return;
      }
    }

    throw new Error('Could not find a visible Select dropdown trigger in the lead form.');
  }

  private getVisibleOverlayButtons() {
    const overlayContainer = this.getVisibleOverlayContainer();
    return overlayContainer.getByRole('button');
  }

  private getVisibleOverlayContainer() {
    return this.page.locator(
      '[role="listbox"]:visible, .dropdown-menu:visible, .menu:visible, .popover:visible, [role="dialog"]:visible'
    ).last();
  }

  private async collectVisibleButtonOptions(locator: ReturnType<Page['getByRole']> | ReturnType<Page['locator']>, blockedTexts: string[]) {
    const normalizedBlocked = blockedTexts.map((text) => text.toLowerCase());
    const selectableOptions: Array<{ index: number; text: string }> = [];
    const count = await locator.count().catch(() => 0);

    for (let index = 0; index < count; index++) {
      const option = locator.nth(index);
      if (!(await option.isVisible().catch(() => false))) {
        continue;
      }

      const text = (await option.innerText().catch(() => '')).trim();
      const ariaDisabled = await option.getAttribute('aria-disabled');
      const isDisabled =
        (await option.isDisabled().catch(() => false)) ||
        ariaDisabled?.toLowerCase() === 'true' ||
        /disabled/i.test((await option.getAttribute('class').catch(() => '')) ?? '');

      if (!text || isDisabled || normalizedBlocked.includes(text.toLowerCase())) {
        continue;
      }

      selectableOptions.push({ index, text });
    }

    return selectableOptions;
  }

  private async scrollLeadForm(direction: 'up' | 'down' = 'down') {
    const modal = this.page.locator('.patient-details-modal:visible, .modal:visible, [role="dialog"]:visible').last();

    if (await modal.isVisible().catch(() => false)) {
      await modal.evaluate((element) => {
        const htmlElement = element as HTMLElement;
        const delta = Math.max(400, htmlElement.clientHeight / 2);
        htmlElement.scrollTop = htmlElement.scrollTop + (direction === 'down' ? delta : -delta);

        const descendants = Array.from(htmlElement.querySelectorAll<HTMLElement>('*'));
        for (const child of descendants) {
          const style = window.getComputedStyle(child);
          const canScroll = /(auto|scroll)/.test(style.overflowY) || /(auto|scroll)/.test(style.overflow);
          if (canScroll && child.scrollHeight > child.clientHeight) {
            const childDelta = Math.max(300, child.clientHeight / 2);
            child.scrollTop = child.scrollTop + (direction === 'down' ? childDelta : -childDelta);
          }
        }
      }, direction).catch(() => {});
    }
  }

  private async closeTransientOverlays() {
    if (this.page.isClosed()) {
      return;
    }

    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.mouse.click(20, 20).catch(() => {});
    await this.sleep(50);
  }

  private async focusBasicDetailsRegion() {
    if (this.page.isClosed()) {
      return;
    }

    await this.closeTransientOverlays();

    const region = this.page.getByRole('region', { name: /Basic Details/i }).first();
    if (await region.isVisible().catch(() => false)) {
      await region.scrollIntoViewIfNeeded().catch(() => {});
      await region.click({ force: true }).catch(() => {});
      await this.sleep(50);
    }
  }

  private escapeForRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
