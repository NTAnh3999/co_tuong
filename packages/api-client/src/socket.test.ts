import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fakeSocket, ioMock, listeners } = vi.hoisted(() => {
  const listeners = new Map<string, (...args: unknown[]) => void>();
  const fakeSocket = {
    connected: false,
    emit: vi.fn(),
    on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      listeners.set(event, callback);
      return fakeSocket;
    }),
    disconnect: vi.fn(),
  };
  return { fakeSocket, ioMock: vi.fn(() => fakeSocket), listeners };
});

vi.mock('socket.io-client', () => ({ io: ioMock }));

import { createGameSocket } from './socket.js';

describe('createGameSocket', () => {
  beforeEach(() => {
    fakeSocket.connected = false;
    fakeSocket.emit.mockClear();
    fakeSocket.on.mockClear();
    fakeSocket.disconnect.mockClear();
    ioMock.mockClear();
    listeners.clear();
  });

  it('creates a credentialed, automatically connecting socket', () => {
    createGameSocket('https://example.test', {});

    expect(ioMock).toHaveBeenCalledWith('https://example.test', {
      withCredentials: true,
      autoConnect: true,
    });
  });

  it('emits each outbound event with its contract event name and payload', () => {
    const gameSocket = createGameSocket('https://example.test', {});
    const move = { gameId: 'g1', moveId: 'm1', expectedVersion: 4, move: { from: 'a0', to: 'a1' } };

    gameSocket.joinRoom('r1');
    gameSocket.joinGame('g1');
    gameSocket.submitMove(move);
    gameSocket.sync('g1');
    gameSocket.resign('g1');
    gameSocket.draw('g1', 'offer');
    gameSocket.claimWin('g1');

    expect(fakeSocket.emit.mock.calls).toEqual([
      ['room:join', { roomId: 'r1' }],
      ['game:join', { gameId: 'g1' }],
      ['game:move', move],
      ['game:sync', { gameId: 'g1' }],
      ['game:resign', { gameId: 'g1' }],
      ['game:draw', { gameId: 'g1', action: 'offer' }],
      ['game:claim-win', { gameId: 'g1' }],
    ]);
  });

  it('wires all socket events to the matching optional handlers', () => {
    const handlers = {
      onConnect: vi.fn(),
      onDisconnect: vi.fn(),
      onRoomState: vi.fn(),
      onGameState: vi.fn(),
      onMoveAccepted: vi.fn(),
      onMoveRejected: vi.fn(),
      onGameFinished: vi.fn(),
    };
    createGameSocket('https://example.test', handlers);

    expect(fakeSocket.on.mock.calls.map(([event]) => event)).toEqual([
      'connect',
      'disconnect',
      'room:state',
      'game:state',
      'game:move:accepted',
      'game:move:rejected',
      'game:finished',
    ]);

    listeners.get('connect')?.();
    listeners.get('disconnect')?.('transport close');
    const roomState = { roomId: 'r1' };
    const gameState = { gameId: 'g1' };
    const accepted = { moveId: 'm1' };
    const rejected = { moveId: 'm2' };
    const finished = { finalVersion: 9 };
    listeners.get('room:state')?.(roomState);
    listeners.get('game:state')?.(gameState);
    listeners.get('game:move:accepted')?.(accepted);
    listeners.get('game:move:rejected')?.(rejected);
    listeners.get('game:finished')?.(finished);

    expect(handlers.onConnect).toHaveBeenCalledOnce();
    expect(handlers.onDisconnect).toHaveBeenCalledWith('transport close');
    expect(handlers.onRoomState).toHaveBeenCalledWith(roomState);
    expect(handlers.onGameState).toHaveBeenCalledWith(gameState);
    expect(handlers.onMoveAccepted).toHaveBeenCalledWith(accepted);
    expect(handlers.onMoveRejected).toHaveBeenCalledWith(rejected);
    expect(handlers.onGameFinished).toHaveBeenCalledWith(finished);
  });

  it('disconnects the underlying socket and exposes its connection state', () => {
    const gameSocket = createGameSocket('https://example.test', {});

    expect(gameSocket.connected).toBe(false);
    gameSocket.disconnect();

    expect(fakeSocket.disconnect).toHaveBeenCalledOnce();
  });
});
