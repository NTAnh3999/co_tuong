import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyMove, createInitialPosition, getLegalMoves, toFen, toSquare } from '@xq/xiangqi-core';
import type { GameSocket, GameSocketHandlers } from '@xq/api-client';
import type { GameSnapshot } from '@xq/shared-contracts';

const socketMock = vi.hoisted(() => ({
  handlers: undefined as GameSocketHandlers | undefined,
  methods: {
    connect: vi.fn(),
    joinGame: vi.fn(),
    submitMove: vi.fn(),
    resign: vi.fn(),
    draw: vi.fn(),
    claimWin: vi.fn(),
    disconnect: vi.fn(),
  },
}));

vi.mock('@xq/api-client', () => ({
  createGameSocket: (_url: string, handlers: GameSocketHandlers): GameSocket => {
    socketMock.handlers = handlers;
    return {
      ...socketMock.methods,
      joinRoom: vi.fn(),
      sync: vi.fn(),
      get connected() { return true; },
    };
  },
}));

import { createOnlineGameController } from './online-game-controller.js';

const snapshot = (moves: string[] = [], version = moves.length): GameSnapshot => ({
  gameId: 'game-1',
  status: 'ACTIVE',
  initialFen: toFen(createInitialPosition()),
  moves,
  gameVersion: version,
  clocks: null,
  result: null,
  redPlayerId: 'red-player',
  blackPlayerId: 'black-player',
  serverNow: 1,
});

describe('SYNC-03: OnlineGameController', () => {
  beforeEach(() => {
    socketMock.handlers = undefined;
    vi.clearAllMocks();
  });

  it('rejects a locally illegal move without sending it', () => {
    const controller = createOnlineGameController('game-1', 'http://api');
    expect(controller.submitMove({ from: toSquare('a0'), to: toSquare('a0') })).toBe(false);
    expect(socketMock.methods.submitMove).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('optimistically applies a legal move and records its pending id', () => {
    const controller = createOnlineGameController('game-1', 'http://api');
    const move = getLegalMoves(controller.getState().position, toSquare('a3'))[0];
    expect(move).toBeDefined();
    if (move === undefined) return;
    expect(controller.submitMove(move)).toBe(true);
    expect(controller.getState().position).toEqual(applyMove(createInitialPosition(), move));
    expect(controller.getState().history).toEqual([move]);
    expect(controller.getState().pendingMoveId).toEqual(expect.any(String));
    expect(socketMock.methods.submitMove).toHaveBeenCalledWith(expect.objectContaining({ gameId: 'game-1', move }));
    controller.dispose();
  });

  it('accepts a matching server snapshot as confirmation', () => {
    const controller = createOnlineGameController('game-1', 'http://api');
    const move = getLegalMoves(controller.getState().position, toSquare('a3'))[0];
    if (move === undefined) return;
    controller.submitMove(move);
    socketMock.handlers?.onGameState?.(snapshot([`${move.from}${move.to}`], 1));
    expect(controller.getState().position).toEqual(applyMove(createInitialPosition(), move));
    expect(controller.getState().history).toEqual([move]);
    expect(controller.getState().pendingMoveId).toBeNull();
    controller.dispose();
  });

  it('rolls back a rejected pending move to the latest authoritative position', () => {
    const controller = createOnlineGameController('game-1', 'http://api');
    socketMock.handlers?.onGameState?.(snapshot());
    const move = getLegalMoves(controller.getState().position, toSquare('a3'))[0];
    if (move === undefined) return;
    controller.submitMove(move);
    const moveId = controller.getState().pendingMoveId;
    expect(moveId).not.toBeNull();
    socketMock.handlers?.onMoveRejected?.({ moveId: moveId!, reason: 'VERSION_CONFLICT', authoritativeVersion: 0 });
    expect(controller.getState().position).toEqual(createInitialPosition());
    expect(controller.getState().history).toEqual([]);
    expect(controller.getState().pendingMoveId).toBeNull();
    expect(controller.getState().lastRejection?.reason).toBe('VERSION_CONFLICT');
    controller.dispose();
  });

  it('rejoins the game after disconnect and reconnect', () => {
    const controller = createOnlineGameController('game-1', 'http://api');
    socketMock.handlers?.onConnect?.();
    socketMock.handlers?.onDisconnect?.('transport close');
    expect(controller.getState().connectionStatus).toBe('disconnected');
    socketMock.handlers?.onConnect?.();
    expect(socketMock.methods.joinGame).toHaveBeenCalledTimes(2);
    expect(socketMock.methods.joinGame).toHaveBeenLastCalledWith('game-1');
    expect(controller.getState().connectionStatus).toBe('connected');
    controller.dispose();
  });

  it('connects on demand and removes its visibility listener when disposed', () => {
    const addListener = vi.spyOn(document, 'addEventListener');
    const removeListener = vi.spyOn(document, 'removeEventListener');
    const controller = createOnlineGameController('game-1', 'http://api');

    controller.connect();
    expect(socketMock.methods.connect).toHaveBeenCalledOnce();
    expect(addListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

    controller.dispose();
    expect(removeListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    addListener.mockRestore();
    removeListener.mockRestore();
  });

  it('requests resignation and a draw without changing the result locally', () => {
    const controller = createOnlineGameController('game-1', 'http://api');
    controller.resign?.('red');
    controller.offerDraw?.();
    expect(socketMock.methods.resign).toHaveBeenCalledWith('game-1');
    expect(socketMock.methods.draw).toHaveBeenCalledWith('game-1', 'offer');
    expect(controller.getState().result).toBeNull();
    controller.dispose();
  });

  it('tracks opponent presence from game:presence and forwards claim-win requests', () => {
    const controller = createOnlineGameController('game-1', 'http://api');
    expect(controller.getState().presence).toBeNull();

    socketMock.handlers?.onGamePresence?.({
      gameId: 'game-1',
      red: { connected: true, disconnectedAt: null },
      black: { connected: false, disconnectedAt: 123 },
    });
    expect(controller.getState().presence).toEqual({
      red: { connected: true, disconnectedAt: null },
      black: { connected: false, disconnectedAt: 123 },
    });

    // A presence update for a different game (e.g. a stale listener) must not leak in.
    socketMock.handlers?.onGamePresence?.({
      gameId: 'other-game',
      red: { connected: false, disconnectedAt: 456 },
      black: { connected: true, disconnectedAt: null },
    });
    expect(controller.getState().presence).toEqual({
      red: { connected: true, disconnectedAt: null },
      black: { connected: false, disconnectedAt: 123 },
    });

    controller.claimWin();
    expect(socketMock.methods.claimWin).toHaveBeenCalledWith('game-1');
    controller.dispose();
  });
});
