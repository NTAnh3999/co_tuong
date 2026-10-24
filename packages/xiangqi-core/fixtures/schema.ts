export interface PositionFixture {
  id: string;
  fen: string;
  source: 'curated' | 'random-playout';
  description?: string;
  /** Depth -> expected perft divide result at that depth from this position. */
  perft?: Record<number, { moves: Record<string, number>; total: number }>;
}

export interface FixtureFile {
  generatedAt: string;
  engine: { path: string; perftBaseline: number };
  positions: PositionFixture[];
}
