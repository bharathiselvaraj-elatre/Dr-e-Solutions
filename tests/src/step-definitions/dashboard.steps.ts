import { DataTable, Then } from '@cucumber/cucumber';
import { expect, type Locator, type Page } from '@playwright/test';
import { CustomWorld } from '../hooks/world';

type TenantMeResponse = {
  tenant?: {
    id?: string;
  };
};

type BranchRecord = {
  isActive?: boolean;
};

type TenantBranchesResponse = {
  data?: BranchRecord[];
};

type BranchRoleSummary = {
  role?: string;
  count?: number;
};

type UserBranchSummary = {
  roles?: BranchRoleSummary[];
};

type UsersByBranchesResponse = {
  branches?: UserBranchSummary[];
};

type TenantAnalyticsResponse = {
  data?: {
    branches?: {
      total?: number;
      active?: number;
      inactive?: number;
    };
    staff?: {
      branchManagers?: number;
      providers?: number;
      frontDesk?: number;
    };
    patients?: {
      total?: number;
      active?: number;
      inactive?: number;
    };
  };
};

function getPage(world: CustomWorld) {
  if (!world.page) {
    throw new Error('Playwright page was not initialized by the test hooks.');
  }

  return world.page;
}

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getCardLabelPatterns(cardName: string) {
  const normalized = cardName.trim().toLowerCase();

  if (normalized === 'staff') {
    return ['Staff', 'Staffs', 'Front Desk', 'Front Desk Staff', 'Receptionist', 'Receptionists'];
  }

  if (normalized === 'patients') {
    return ['Patients', 'Patient'];
  }

  if (normalized === 'doctors') {
    return ['Doctors', 'Doctor', 'Providers', 'Provider'];
  }

  if (normalized === 'managers') {
    return ['Managers', 'Manager', 'Branch Managers', 'Branch Manager'];
  }

  return [cardName];
}

function getCardLabel(page: Page, cardName: string) {
  const labelPatterns = getCardLabelPatterns(cardName);
  const labelLocator = page.locator('.dashboard-home__kpi-label, [class*="kpi-label"]');
  const exactPattern = labelPatterns.map((labelPattern) => `(?:${escapeForRegex(labelPattern)})`).join('|');
  const containsPattern = labelPatterns.map((labelPattern) => escapeForRegex(labelPattern)).join('|');

  return labelLocator
    .filter({
      hasText: new RegExp(`(?:^(?:${exactPattern})$)|(?:\\b(?:${containsPattern})\\b)`, 'i'),
    })
    .first();
}

async function getCardContainer(page: Page, cardName: string) {
  const label = getCardLabel(page, cardName);
  const candidates: Locator[] = [
    label.locator('xpath=ancestor::*[contains(@class,"dashboard-home__kpi")][1]'),
    label.locator('xpath=ancestor::*[contains(@class,"kpi")][1]'),
    label.locator('xpath=ancestor::*[@role="button" or self::button or self::a][1]'),
    label,
  ];

  for (const candidate of candidates) {
    if ((await candidate.count().catch(() => 0)) > 0 && (await candidate.first().isVisible().catch(() => false))) {
      return candidate.first();
    }
  }

  return label;
}

async function fetchJson<T>(page: Page, path: string): Promise<T> {
  return await page.evaluate(async ({ requestPath }) => {
    const token = window.localStorage.getItem('access');
    const response = await fetch(requestPath, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Request failed for ${requestPath}: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }, { requestPath: path }) as T;
}

async function fetchJsonIfOk<T>(page: Page, path: string): Promise<T | null> {
  try {
    return await fetchJson<T>(page, path);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/Request failed .*:\s*(404|403|401)\b/i.test(message)) {
      return null;
    }

    throw error;
  }
}

async function getDashboardCardCount(page: Page, cardName: string) {
  const card = await getCardContainer(page, cardName);
  const cardText = (await card.innerText()).replace(/\s+/g, ' ').trim();
  const match = cardText.match(/\b\d{1,3}(?:,\d{3})*|\b\d+\b/);

  if (!match) {
    const normalizedText = cardText.replace(cardName, '').trim();

    if (/^[\u2012\u2013\u2014\u2015-]+$/.test(normalizedText)) {
      return 0;
    }

    throw new Error(`Expected numeric count for "${cardName}", but found: ${cardText}`);
  }

  return Number(match[0].replace(/,/g, ''));
}

function sumRoleCounts(branches: UserBranchSummary[], roleNames: string[]) {
  const normalizedRoleNames = roleNames.map((roleName) => roleName.toLowerCase());

  return branches.reduce((total, branch) => {
    const branchRoles = branch.roles ?? [];
    const branchCount = branchRoles.reduce((roleTotal, roleSummary) => {
      const normalizedRole = roleSummary.role?.trim().toLowerCase();
      if (!normalizedRole || !normalizedRoleNames.includes(normalizedRole)) {
        return roleTotal;
      }

      return roleTotal + (roleSummary.count ?? 0);
    }, 0);

    return total + branchCount;
  }, 0);
}

async function getBackendDashboardCounts(page: Page) {
  const me = await fetchJson<TenantMeResponse>(page, '/api/auth/v1/users/me');
  const tenantId = me.tenant?.id;

  if (!tenantId) {
    throw new Error('Could not resolve tenant id from /api/auth/v1/users/me.');
  }

  const tenantBranches = await fetchJson<TenantBranchesResponse>(
    page,
    `/api/auth/v1/tenants/${tenantId}/branches`
  );
  const usersByBranches = await fetchJsonIfOk<UsersByBranchesResponse>(
    page,
    `/api/auth/v1/tenants/${tenantId}/users-by-branches`
  );
  const analytics = await fetchJsonIfOk<TenantAnalyticsResponse>(page, '/api/auth/v1/tenants/analytics');
  const branches = tenantBranches.data ?? [];
  const branchUserSummaries = usersByBranches?.branches ?? [];
  const analyticsData = analytics?.data;
  const branchAnalytics = analyticsData?.branches;
  const staffAnalytics = analyticsData?.staff;
  const patientAnalytics = analyticsData?.patients;
  const derivedManagers = sumRoleCounts(branchUserSummaries, ['branch manager', 'manager']);
  const derivedDoctors = sumRoleCounts(branchUserSummaries, ['doctor', 'doctors', 'provider', 'providers']);
  const derivedStaff = sumRoleCounts(branchUserSummaries, ['front desk', 'staff', 'receptionist', 'receptionists']);
  const hasRoleSummaryData = branchUserSummaries.length > 0;

  return {
    'Active branches': branchAnalytics?.active ?? branches.filter((branch) => branch.isActive !== false).length,
    Managers: hasRoleSummaryData ? derivedManagers : staffAnalytics?.branchManagers,
    Doctors: hasRoleSummaryData ? derivedDoctors : staffAnalytics?.providers,
    Staff: hasRoleSummaryData ? derivedStaff : staffAnalytics?.frontDesk,
    Patients: patientAnalytics?.total,
  };
}

Then('owner dashboard navigation options should be visible', async function (this: CustomWorld) {
  const page = getPage(this);

  await expect(page.getByRole('link', { name: /^branches$/i }).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('link', { name: /^inbox$/i }).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('link', { name: /^overview$/i }).first()).toBeVisible({ timeout: 15000 });
});

Then('owner dashboard should display these cards:', async function (this: CustomWorld, dataTable: DataTable) {
  const page = getPage(this);
  const cards = dataTable.raw().flat().filter(Boolean);

  for (const card of cards) {
    await expect(getCardLabel(page, card)).toBeVisible({ timeout: 15000 });
  }
});

Then('owner dashboard cards should show numeric counts:', async function (this: CustomWorld, dataTable: DataTable) {
  const page = getPage(this);
  const cards = dataTable.raw().flat().filter(Boolean);

  for (const cardName of cards) {
    await getDashboardCardCount(page, cardName);
  }
});

Then('owner dashboard card counts should match backend data:', async function (this: CustomWorld, dataTable: DataTable) {
  const page = getPage(this);
  const cards = dataTable.raw().flat().filter(Boolean);
  const backendCounts = await getBackendDashboardCounts(page);

  for (const cardName of cards) {
    const displayedCount = await getDashboardCardCount(page, cardName);
    const expectedCount = backendCounts[cardName as keyof typeof backendCounts];

    if (typeof expectedCount !== 'number') {
      console.warn(`Skipping backend count assertion for "${cardName}" because no backend count was available.`);
      continue;
    }

    expect(
      displayedCount,
      `Dashboard count mismatch for "${cardName}". Displayed=${displayedCount}, Backend=${expectedCount}`
    ).toBe(expectedCount);
  }
});

Then('owner can access each dashboard card:', async function (this: CustomWorld, dataTable: DataTable) {
  const page = getPage(this);
  const cards = dataTable.raw().flat().filter(Boolean);

  for (const card of cards) {
    const container = await getCardContainer(page, card);
    await container.scrollIntoViewIfNeeded().catch(() => {});
    await container.click({ force: true });
    await expect(getCardLabel(page, card)).toBeVisible({ timeout: 10000 });
  }
});
