import { expect, it } from 'vitest';
import * as packageEntry from './index.js';

it('exports the package entry point', () => {
  expect(packageEntry).toBeDefined();
});
