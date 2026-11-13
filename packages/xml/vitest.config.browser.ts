import { defineConfig } from 'vitest/config';
import { webdriverio } from '@vitest/browser-webdriverio';

export default defineConfig({
  test: {
    globals: true,
    include: ['./tests/**/*.test.ts'],
    reporters: 'verbose',
    alias: {
      stream: 'stream-browserify'
    },
    browser: {
      provider: webdriverio(),
      instances: [{ browser: 'chrome' }],
      enabled: true,
      headless: true
    }
  }
});
