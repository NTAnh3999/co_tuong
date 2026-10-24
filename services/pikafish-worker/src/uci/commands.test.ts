import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bestMove, getFen, initEngine, perft, setPosition } from './commands.js';
import { EngineProcess } from './engine-process.js';

const stubEngine = String.raw`
const readline = require('node:readline');
readline.createInterface({ input: process.stdin }).on('line', (command) => {
  if (command === 'uci') {
    console.log('id name Stub Pikafish');
    console.log('uciok');
  } else if (command === 'isready') {
    console.log('readyok');
  } else if (command === 'go perft 2') {
    console.log('a0a1: 17');
    console.log('b0b1: 23');
    console.log('');
    console.log('Nodes searched: 40');
  } else if (command === 'd') {
    console.log(' +-------------------+');
    console.log('Fen: rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1');
  } else if (command === 'go movetime 50') {
    console.log('info depth 1');
    console.log('bestmove h2e2 ponder h9g7');
  } else if (command === 'quit') {
    process.exit(0);
  }
});
`;

describe('UCI commands with a stub engine', () => {
  let engine: EngineProcess;

  beforeEach(async () => {
    engine = new EngineProcess(process.execPath, ['-e', stubEngine]);
    await initEngine(engine);
  });

  afterEach(async () => {
    await engine.dispose();
  });

  it('initializes after receiving uciok and readyok', async () => {
    await expect(initEngine(engine)).resolves.toBeUndefined();
  });

  it('parses a multi-move perft divide block and total', async () => {
    await expect(perft(engine, 2)).resolves.toEqual({
      moves: { a0a1: 17, b0b1: 23 },
      total: 40,
    });
  });

  it('extracts the FEN from a debug board response', async () => {
    await expect(getFen(engine)).resolves.toBe(
      'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1',
    );
  });

  it('parses bestmove and ignores the ponder suffix', async () => {
    await expect(bestMove(engine, 50)).resolves.toBe('h2e2');
  });

  it('formats start position and move history commands', () => {
    const sent: string[] = [];
    const fake = { send: (command: string) => sent.push(command) } as unknown as EngineProcess;
    setPosition(fake);
    setPosition(fake, { fen: 'some fen', moves: ['h2e2', 'h9g7'] });
    expect(sent).toEqual(['position startpos', 'position fen some fen moves h2e2 h9g7']);
  });
});
