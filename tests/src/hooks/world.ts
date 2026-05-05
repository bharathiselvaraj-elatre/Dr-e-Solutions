import { IWorldOptions, setWorldConstructor, World } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { RuntimeCredentials } from '../utils/runtimeCredentials';
import { BoardTestData, BranchTestData, LeadTestData, UserTestData } from '../utils/testData';

export class CustomWorld extends World {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  booking?: LoginPage;
  runtimeCredentials?: RuntimeCredentials;
  branchData?: BranchTestData;
  userData?: UserTestData;
  boardData?: BoardTestData;
  leadData?: LeadTestData;
  authFile = 'auth.json';
  branchAuthFile = 'branch-auth.json';

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(CustomWorld);
