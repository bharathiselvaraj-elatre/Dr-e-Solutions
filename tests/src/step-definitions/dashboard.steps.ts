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

function getPage(world: CustomWorld) {
  if (!world.page) {
    throw new Error('Playwright page was not initialized by the test hooks.');
  }

  return world.page;
}

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getCardLabel(page: Page, cardName: string) {
  const escaped = escapeForRegex(cardName);
  return page
    .locator('.dashboard-home__kpi-label, [class*="kpi-label"], span, div, p, h1, h2, h3, h4, h5, h6')
    .filter({ hasText: new RegExp(`^${escaped}$`, 'i') })
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

async function getDashboardCardCount(page: Page, cardName: string) {
  const card = await getCardContainer(page, cardName);
  const cardText = (await card.innerText()).replace(/\s+/g, ' ').trim();
  const match = cardText.match(/\b\d+\b/);

  if (!match) {
    throw new Error(`Expected numeric count for "${cardName}", but found: ${cardText}`);
  }

  return Number(match[0]);
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
  const usersByBranches = await fetchJson<UsersByBranchesResponse>(page, '/api/auth/v1/users/branches');
  const branches = tenantBranches.data ?? [];
  const branchSummaries = usersByBranches.branches ?? [];

  return {
    'Active branches': branches.filter((branch) => branch.isActive !== false).length,
    Managers: sumRoleCounts(branchSummaries, ['Branch Manager', 'Manager']),
    Doctors: sumRoleCounts(branchSummaries, ['Provider', 'Doctor']),
    Staff: sumRoleCounts(branchSummaries, ['Front Desk', 'Staff']),
    Patients: sumRoleCounts(branchSummaries, ['Patient', 'Patients']),
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
      throw new Error(`No backend mapping was defined for dashboard card "${cardName}".`);
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
