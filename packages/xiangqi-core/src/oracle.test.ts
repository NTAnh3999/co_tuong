import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { divide, fromFen, toFen } from './index.js';
import type { FixtureFile } from '../fixtures/schema.js';

const fixtureUrl = new URL('../fixtures/golden/oracle.json', import.meta.url);
const fixtures = JSON.parse(readFileSync(fixtureUrl, 'utf8')) as FixtureFile;

describe('Pikafish oracle fixtures', () => {
  it('round-trips every verified position FEN and matches its recorded perft divide', () => {
    expect(fixtures.positions.length).toBeGreaterThan(0);
    for (const fixture of fixtures.positions) {
      expect(toFen(fromFen(fixture.fen)), `${fixture.id} FEN round-trip`).toBe(fixture.fen);
      for (const [depthText, expected] of Object.entries(fixture.perft ?? {})) {
        expect(divide(fromFen(fixture.fen), Number(depthText)), `${fixture.id} perft depth ${depthText}`).toEqual(expected);
      }
    }
  });
});
