import { After } from '@cucumber/cucumber';
import { CustomWorld } from './world';

After(async function (this: CustomWorld) {
  await this.page?.close();
  await this.context?.close();
  await this.browser?.close();
});
