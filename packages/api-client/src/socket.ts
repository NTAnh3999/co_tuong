import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@xq/shared-contracts';

type ServerPayload<Event extends keyof ServerToClientEvents> = Parameters<ServerToClientEvents[Event]>[0];
type ClientPayload<Event extends keyof ClientToServerEvents> = Parameters<ClientToServerEvents[Event]>[0];

export interface GameSocketHandlers {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onRoomState?: (payload: ServerPayload<'room:state'>) => void;
  onGameState?: (payload: ServerPayload<'game:state'>) => void;
  onMoveAccepted?: (payload: ServerPayload<'game:move:accepted'>) => void;
  onMoveRejected?: (payload: ServerPayload<'game:move:rejected'>) => void;
  onGameFinished?: (payload: ServerPayload<'game:finished'>) => void;
}

export interface GameSocket {
  joinRoom(roomId: string): void;
  joinGame(gameId: string): void;
  submitMove(payload: ClientPayload<'game:move'>): void;
  sync(gameId: string): void;
  resign(gameId: string): void;
  draw(gameId: string, action: ClientPayload<'game:draw'>['action']): void;
  claimWin(gameId: string): void;
  disconnect(): void;
  readonly connected: boolean;
}

export function createGameSocket(baseUrl: string, handlers: GameSocketHandlers): GameSocket {
  // socket.io-client's `io()` factory isn't itself generic in this version — the
  // typing comes from this variable's explicit annotation, not from `io<...>()`.
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(baseUrl, {
    withCredentials: true,
    autoConnect: true,
  });

  socket.on('connect', () => handlers.onConnect?.());
  socket.on('disconnect', (reason) => handlers.onDisconnect?.(reason));
  socket.on('room:state', (payload) => handlers.onRoomState?.(payload));
  socket.on('game:state', (payload) => handlers.onGameState?.(payload));
  socket.on('game:move:accepted', (payload) => handlers.onMoveAccepted?.(payload));
  socket.on('game:move:rejected', (payload) => handlers.onMoveRejected?.(payload));
  socket.on('game:finished', (payload) => handlers.onGameFinished?.(payload));

  return {
    joinRoom(roomId) {
      socket.emit('room:join', { roomId });
    },
    joinGame(gameId) {
      socket.emit('game:join', { gameId });
    },
    submitMove(payload) {
      socket.emit('game:move', payload);
    },
    sync(gameId) {
      socket.emit('game:sync', { gameId });
    },
    resign(gameId) {
      socket.emit('game:resign', { gameId });
    },
    draw(gameId, action) {
      socket.emit('game:draw', { gameId, action });
    },
    claimWin(gameId) {
      socket.emit('game:claim-win', { gameId });
    },
    disconnect() {
      socket.disconnect();
    },
    get connected() {
      return socket.connected;
    },
  };
}
