import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyMove, createInitialPosition, divide, fromFen, getAllLegalMoves, toFen } from '../../../packages/xiangqi-core/src/index.ts';
import type { PositionFixture, FixtureFile } from '../../../packages/xiangqi-core/fixtures/schema.ts';
import { curatedPositions } from '../../../packages/xiangqi-core/fixtures/curated-positions.ts';
import { EngineProcess, initEngine, perft, setPosition } from '../src/uci/index.ts';

const binaryPath = process.env.PIKAFISH_PATH;
if (!binaryPath) {
  console.log('PIKAFISH_PATH not set, skipping oracle fixture generation');
} else {
  const randomPositions = new Map<string, string>();
  for (let game = 0; game < 200; game += 1) {
    let position = createInitialPosition();
    const targetPlies = 4 + Math.floor(Math.random() * 37);
    for (let ply = 0; ply < targetPlies; ply += 1) {
      const moves = getAllLegalMoves(position, position.turn);
      if (moves.length === 0) break;
      position = applyMove(position, moves[Math.floor(Math.random() * moves.length)]!);
    }
    const fen = toFen(position);
    randomPositions.set(fen, `Random legal self-play game ${game + 1} after at most ${targetPlies} plies.`);
  }

  const inputs: PositionFixture[] = [
    ...curatedPositions.map(({ id, fen, description }) => ({ id, fen, source: 'curated' as const, description })),
    ...[...randomPositions].map(([fen, description], index) => ({
      id: `random-${String(index + 1).padStart(3, '0')}`,
      fen,
      source: 'random-playout' as const,
      description,
    })),
  ];
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(scriptDir, '../../..');
  const outputPath = resolve(repoRoot, 'packages/xiangqi-core/fixtures/golden/oracle.json');
  const engine = new EngineProcess(binaryPath);
  const verified: PositionFixture[] = [];
  const mismatches: Array<{ id: string; fen: string; depth: number; move?: string; expected?: number; actual?: number }> = [];

  try {
    await initEngine(engine);
    for (const fixture of inputs) {
      const canonicalFen = toFen(fromFen(fixture.fen));
      if (canonicalFen !== fixture.fen) throw new Error(`Non-canonical FEN for ${fixture.id}: ${fixture.fen}`);
      const depth = fixture.source === 'curated' ? 2 : 1;
      const expected = divide(fromFen(fixture.fen), depth);
      setPosition(engine, { fen: fixture.fen });
      const actual = await perft(engine, depth);
      const expectedMoves = Object.keys(expected.moves).sort();
      const actualMoves = Object.keys(actual.moves).sort();
      const differentMove = expectedMoves.find((move) => expected.moves[move] !== actual.moves[move])
        ?? actualMoves.find((move) => expected.moves[move] !== actual.moves[move]);
      if (differentMove || expected.total !== actual.total || expectedMoves.length !== actualMoves.length) {
        mismatches.push({
          id: fixture.id,
          fen: fixture.fen,
          depth,
          ...(differentMove ? { move: differentMove, expected: expected.moves[differentMove], actual: actual.moves[differentMove] } : {}),
        });
        console.error(`MISMATCH ${fixture.id} depth ${depth}${differentMove ? ` ${differentMove}: core=${expected.moves[differentMove]}, Pikafish=${actual.moves[differentMove]}` : ` total: core=${expected.total}, Pikafish=${actual.total}`}`);
        continue;
      }
      verified.push({ ...fixture, perft: { [depth]: expected } });
    }

    const fixtureFile: FixtureFile = {
      generatedAt: new Date().toISOString(),
      engine: { path: binaryPath, perftBaseline: verified[0]?.perft?.[2]?.total ?? 0 },
      positions: verified,
    };
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(fixtureFile, null, 2)}\n`, 'utf8');
    console.log(`Oracle verification: ${verified.length}/${inputs.length} positions matched exactly (${curatedPositions.length} curated, ${randomPositions.size} unique random playouts).`);
    console.log(`Wrote verified fixtures to ${outputPath}`);
    if (mismatches.length) {
      console.error('Mismatching positions were excluded from oracle.json; report these FENs for a dedicated engine investigation:');
      for (const mismatch of mismatches) console.error(JSON.stringify(mismatch));
      process.exitCode = 1;
    }
  } finally {
    await engine.dispose();
  }
}
