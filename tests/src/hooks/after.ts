import { After, AfterAll } from '@cucumber/cucumber';
import { setSharedBrowser, sharedBrowser } from './browserSession';
import { CustomWorld } from './world';

AfterAll(async function () {
  await sharedBrowser?.close();
  setSharedBrowser(undefined);
});

After(async function (this: CustomWorld) {
  await this.page?.close();
  await this.context?.close();
});
