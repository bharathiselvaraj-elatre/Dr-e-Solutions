import { test as base } from './testFixture';
export { expect } from './testFixture';

type AuthFixtures = {
  credentials: {
    email: string;
    password: string;
  };
};

export const test = base.extend<AuthFixtures>({
  credentials: async ({}, use) => {
    await use({
      email: process.env.DRE_LOGIN_EMAIL ?? 'owner@example.com',
      password: process.env.DRE_LOGIN_PASSWORD ?? 'ChangeMe123!',
    });
  },
});
