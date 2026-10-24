import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EngineProcess, getFen, initEngine, perft, setPosition } from '../src/uci/index.ts';
import type { FixtureFile } from '../../../packages/xiangqi-core/fixtures/schema.ts';

const binaryPath = process.env.PIKAFISH_PATH;
if (!binaryPath) {
  console.log('PIKAFISH_PATH not set, skipping golden fixture generation');
} else {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(scriptDir, '../../..');
  const outputPath = resolve(repoRoot, 'packages/xiangqi-core/fixtures/golden/startpos.json');
  const engine = new EngineProcess(binaryPath);

  try {
    await initEngine(engine);
    setPosition(engine);
    const fen = await getFen(engine);
    const perftResults: NonNullable<FixtureFile['positions'][number]['perft']> = {};
    for (const depth of [1, 2, 3]) perftResults[depth] = await perft(engine, depth);
    if (process.env.SLOW === '1') perftResults[4] = await perft(engine, 4);

    const baselineDepth = perftResults[4] ? 4 : 3;
    const fixture: FixtureFile = {
      generatedAt: new Date().toISOString(),
      engine: { path: binaryPath, perftBaseline: perftResults[baselineDepth]!.total },
      positions: [{
        id: 'startpos',
        fen,
        source: 'curated',
        description: `Starting position; engine.perftBaseline reflects depth ${baselineDepth}.`,
        perft: perftResults,
      }],
    };

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
    console.log(`Wrote golden fixtures to ${outputPath}`);
  } finally {
    await engine.dispose();
  }
}
