import type { MultiPvLine } from './uci/commands.js';

export type Difficulty = 'easy' | 'medium' | 'hard';
export interface DifficultyProfile { readonly movetimeMs: number; readonly multiPv: number; readonly thresholdCp: number }
export const DIFFICULTY_PROFILES: Record<Difficulty, DifficultyProfile> = {
  easy: { movetimeMs: 50, multiPv: 5, thresholdCp: 300 },
  medium: { movetimeMs: 200, multiPv: 3, thresholdCp: 80 },
  hard: { movetimeMs: 1000, multiPv: 1, thresholdCp: 0 },
};

export function selectMove(lines: MultiPvLine[], difficulty: Difficulty, random: () => number = Math.random): MultiPvLine {
  if (!lines.length) throw new Error('Engine returned no MultiPV candidates');
  const best = lines.find((line) => line.multipv === 1) ?? [...lines].sort((a, b) => a.multipv - b.multipv)[0]!;
  const threshold = DIFFICULTY_PROFILES[difficulty].thresholdCp;
  const candidates = lines.filter((line) => best.scoreCp - line.scoreCp <= threshold).sort((a, b) => a.multipv - b.multipv);
  if (difficulty === 'hard' || candidates.length === 1) return candidates[0]!;
  const roll = random();
  if (difficulty === 'easy') return candidates[Math.min(candidates.length - 1, Math.floor(roll * candidates.length))]!;
  const band = roll < 0.5 ? 0 : roll < 0.85 ? 1 : 2;
  return candidates[Math.min(band, candidates.length - 1)]!;
}
