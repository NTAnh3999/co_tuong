import { createInitialPosition, decodeMove, replay, toFen } from '@xq/xiangqi-core';
import type { GameSnapshot } from '@xq/shared-contracts';
import { describe, expect, it } from 'vitest';
import { createReplayController } from './replay-controller';

const initialFen = toFen(createInitialPosition());
const moves = ['a3a4', 'a6a5', 'c3c4'];
const game: GameSnapshot = {
  gameId: 'replay-test', status: 'FINISHED', initialFen, moves, gameVersion: moves.length,
  clocks: null, result: { winner: 'red', reason: 'RESIGNATION' },
  redPlayerId: 'red', blackPlayerId: 'black', drawOfferBy: null, serverNow: 1,
};

describe('ReplayController', () => {
  it('REPLAY-01 starts at the FEN position and navigates through reconstructed legal plies', () => {
    const expected = replay({ initialFen, moves: game.moves.map(decodeMove), ruleSetVersion: 'xq-casual-1.0.0' });
    const controller = createReplayController(game);
    const stateAtStart = controller.getState();

    expect(stateAtStart.steps).toHaveLength(4);
    expect(stateAtStart.steps[0]).toEqual({ position: createInitialPosition(), lastMove: null });
    expect(toFen(stateAtStart.steps[0]!.position)).toBe(initialFen);

    controller.goToPly(2);
    expect(controller.getState().currentPly).toBe(2);
    expect(controller.getState().steps[2]!.position).toEqual(expected[2]!.position);
    expect(controller.getState().steps[2]!.lastMove).toEqual(expected[2]!.move);
    controller.next();
    expect(controller.getState().currentPly).toBe(3);
    controller.previous();
    expect(controller.getState().currentPly).toBe(2);
  });

  it('REPLAY-01 clamps out-of-range ply navigation', () => {
    const controller = createReplayController(game);
    expect(() => controller.goToPly(-10)).not.toThrow();
    expect(controller.getState().currentPly).toBe(0);
    controller.goToPly(100);
    expect(controller.getState().currentPly).toBe(3);
  });
});
