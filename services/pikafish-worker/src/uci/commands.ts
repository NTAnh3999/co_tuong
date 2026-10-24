import type { EngineProcess } from './engine-process.js';

export async function initEngine(engine: EngineProcess): Promise<void> {
  const uciResponse = engine.waitFor((line) => line.trim() === 'uciok');
  engine.send('uci');
  await uciResponse;

  const readyResponse = engine.waitFor((line) => line.trim() === 'readyok');
  engine.send('isready');
  await readyResponse;
}

export function setPosition(
  engine: EngineProcess,
  position: { fen?: string; moves?: string[] } = {},
): void {
  const base = position.fen ? `fen ${position.fen}` : 'startpos';
  const moves = position.moves?.length ? ` moves ${position.moves.join(' ')}` : '';
  engine.send(`position ${base}${moves}`);
}

export async function perft(
  engine: EngineProcess,
  depth: number,
): Promise<{ moves: Record<string, number>; total: number }> {
  if (!Number.isInteger(depth) || depth < 0) throw new Error('Perft depth must be a non-negative integer');
  const response = engine.waitFor((line) => /^\s*Nodes searched:\s*\d+\s*$/i.test(line));
  engine.send(`go perft ${depth}`);
  const lines = await response;
  const totalLine = lines.find((line) => /^\s*Nodes searched:/i.test(line));
  const total = totalLine && /^\s*Nodes searched:\s*(\d+)\s*$/i.exec(totalLine)?.[1];
  if (total === undefined) throw new Error('Engine perft response did not include a valid total');

  const moves: Record<string, number> = {};
  for (const line of lines) {
    const match = /^\s*([a-i][0-9][a-i][0-9]):\s*(\d+)\s*$/i.exec(line);
    if (match) moves[match[1]!] = Number(match[2]);
  }
  return { moves, total: Number(total) };
}

export async function getFen(engine: EngineProcess): Promise<string> {
  const response = engine.waitFor((line) => /^\s*Fen:\s*/i.test(line));
  engine.send('d');
  const fenLine = (await response).find((line) => /^\s*Fen:\s*/i.test(line));
  if (!fenLine) throw new Error('Engine debug response did not include a FEN');
  return fenLine.replace(/^\s*Fen:\s*/i, '').trim();
}

export async function bestMove(engine: EngineProcess, movetimeMs: number): Promise<string> {
  if (!Number.isInteger(movetimeMs) || movetimeMs < 0) {
    throw new Error('Move time must be a non-negative integer');
  }
  const response = engine.waitFor((line) => /^\s*bestmove\s+/i.test(line));
  engine.send(`go movetime ${movetimeMs}`);
  const bestMoveLine = (await response).find((line) => /^\s*bestmove\s+/i.test(line));
  const move = bestMoveLine && /^\s*bestmove\s+(\S+)/i.exec(bestMoveLine)?.[1];
  if (!move) throw new Error('Engine response did not include a bestmove');
  return move;
}

export interface MultiPvLine {
  readonly multipv: number;
  readonly move: string;
  readonly scoreCp: number;
}

export async function searchMultiPv(
  engine: EngineProcess,
  movetimeMs: number,
  multiPv: number,
): Promise<MultiPvLine[]> {
  if (!Number.isInteger(movetimeMs) || movetimeMs < 0) throw new Error('Move time must be a non-negative integer');
  if (!Number.isInteger(multiPv) || multiPv < 1) throw new Error('MultiPV must be a positive integer');
  const response = engine.waitFor((line) => /^\s*bestmove\s+/i.test(line), movetimeMs + 10_000);
  engine.send(`setoption name MultiPV value ${multiPv}`);
  engine.send(`go movetime ${movetimeMs}`);
  const lines = await response;
  const latest = new Map<number, MultiPvLine>();
  for (const line of lines) {
    const pv = /\bmultipv\s+(\d+)\b.*?\bscore\s+(cp|mate)\s+(-?\d+)\b.*?\bpv\s+(\S+)/i.exec(line);
    if (!pv) continue;
    const multipvIndex = Number(pv[1]);
    // Map mate distance to a large signed score so normal threshold comparisons remain meaningful.
    const value = Number(pv[3]);
    const scoreCp = pv[2]!.toLowerCase() === 'mate'
      ? Math.sign(value) * (100_000 - Math.abs(value))
      : value;
    latest.set(multipvIndex, { multipv: multipvIndex, move: pv[4]!, scoreCp });
  }
  return [...latest.values()].sort((a, b) => a.multipv - b.multipv);
}
