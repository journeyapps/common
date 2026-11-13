import { defineConfig } from 'vitest/config';
import { webdriverio } from '@vitest/browser-webdriverio';

export default defineConfig({
  test: {
    include: [
      './packages/{ioc,logger,tree,router,codec,xml}/**/*.test.ts',
      './packages/sdk/tests/web.test.ts',
      './tests/browser/*.test.ts'
    ],
    browser: {
      enabled: true,
      headless: true,
      provider: webdriverio(),
      instances: [{ browser: 'chrome' }]
    }
  }
});
