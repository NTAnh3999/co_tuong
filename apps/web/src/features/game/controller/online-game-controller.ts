import { createStore } from 'zustand/vanilla';
import {
  applyMove,
  decodeMove,
  fromFen,
  getLegalMoves,
  isLegalMove,
  squareToIndex,
} from '@xq/xiangqi-core';
import type { Color, Move, Position, Square } from '@xq/xiangqi-core';
import type { ClockState, GameSnapshot, RejectReason } from '@xq/shared-contracts';
import { createGameSocket } from '@xq/api-client';
import type { GameSocket, GameSocketHandlers } from '@xq/api-client';
import type { GameController, GameControllerState } from './game-controller.js';

export interface OnlineGameControllerState extends GameControllerState {
  readonly clocks: ClockState | null;
  readonly gameVersion: number;
  readonly connectionStatus: 'connecting' | 'connected' | 'disconnected';
  readonly pendingMoveId: string | null;
  readonly lastRejection: { readonly reason: RejectReason; readonly at: number } | null;
}

export interface OnlineGameController extends GameController {
  getState(): OnlineGameControllerState;
  connect(): void;
  dispose(): void;
}

// crypto.randomUUID() is only exposed in secure contexts (HTTPS or localhost); accessing the
// app over a plain-HTTP LAN address does not qualify, so fall back to crypto.getRandomValues
// (available in every context) to assemble a UUID v4 string by hand.
function generateMoveId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function positionFromSnapshot(snapshot: GameSnapshot): { position: Position; history: Move[] } {
  let position = fromFen(snapshot.initialFen);
  const history = snapshot.moves.map((uci) => decodeMove(uci));
  for (const move of history) position = applyMove(position, move);
  return { position, history };
}

export function createOnlineGameController(gameId: string, apiBaseUrl: string): OnlineGameController {
  const initialPosition = fromFen('rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1');
  const store = createStore<OnlineGameControllerState>(() => ({
    position: initialPosition,
    history: [],
    lastMove: null,
    selectedSquare: null,
    legalTargets: [],
    orientation: 'red',
    result: null,
    clocks: null,
    gameVersion: 0,
    connectionStatus: 'connecting',
    pendingMoveId: null,
    lastRejection: null,
  }));

  let authoritative: Pick<OnlineGameControllerState, 'position' | 'history' | 'lastMove' | 'result' | 'clocks' | 'gameVersion'> = {
    position: initialPosition,
    history: [],
    lastMove: null,
    result: null,
    clocks: null,
    gameVersion: 0,
  };
  let socket: GameSocket;

  const reconcileSnapshot = (snapshot: GameSnapshot): void => {
    if (snapshot.gameId !== gameId) return;
    const { position, history } = positionFromSnapshot(snapshot);
    const state = store.getState();
    const lastMove = history[history.length - 1] ?? null;
    authoritative = { position, history, lastMove, result: snapshot.result, clocks: snapshot.clocks, gameVersion: snapshot.gameVersion };

    let pendingMoveId = state.pendingMoveId;
    if (state.pendingMoveId !== null) {
      // A fresh join snapshot settles an uncertain move from server truth; never blindly resend
      // a moveId after reconnect, because replaying the snapshot is enough to determine its outcome.
      // A matching move is now backed by authority; a mismatch (or unchanged count) rolls it back.
      pendingMoveId = null;
    }

    store.setState({
      ...state,
      position,
      history,
      lastMove,
      selectedSquare: null,
      legalTargets: [],
      result: snapshot.result,
      clocks: snapshot.clocks,
      gameVersion: snapshot.gameVersion,
      pendingMoveId,
    });
  };

  const handlers: GameSocketHandlers = {
    onConnect() {
      store.setState((state) => ({ ...state, connectionStatus: 'connected' }));
      socket.joinGame(gameId);
    },
    onDisconnect() {
      store.setState((state) => ({ ...state, connectionStatus: 'disconnected' }));
    },
    onGameState: reconcileSnapshot,
    onMoveAccepted(payload) {
      // game:state is the authoritative confirmation; accepted events are only an acknowledgement.
      if (payload.moveId === store.getState().pendingMoveId) return;
    },
    onMoveRejected(payload) {
      const state = store.getState();
      if (payload.moveId !== state.pendingMoveId) return;
      store.setState({
        ...state,
        ...authoritative,
        selectedSquare: null,
        legalTargets: [],
        gameVersion: payload.authoritativeVersion,
        pendingMoveId: null,
        lastRejection: { reason: payload.reason, at: Date.now() },
      });
    },
    onGameFinished(payload) {
      store.setState((state) => ({ ...state, result: payload.result, gameVersion: payload.finalVersion }));
    },
  };
  socket = createGameSocket(apiBaseUrl, handlers);
  let observingVisibility = false;

  const submitMove = (move: Move): boolean => {
    const state = store.getState();
    if (state.result !== null || state.pendingMoveId !== null || !isLegalMove(state.position, move)) return false;
    const moveId = generateMoveId();
    const history = [...state.history, move];
    store.setState({
      ...state,
      position: applyMove(state.position, move),
      history,
      lastMove: move,
      selectedSquare: null,
      legalTargets: [],
      pendingMoveId: moveId,
    });
    socket.submitMove({ gameId, moveId, expectedVersion: state.gameVersion, move });
    return true;
  };

  const selectSquare = (square: Square | null): void => {
    const state = store.getState();
    if (state.result !== null || state.pendingMoveId !== null) return;
    if (square === null) {
      store.setState({ ...state, selectedSquare: null, legalTargets: [] });
      return;
    }
    const piece = state.position.board[squareToIndex(square)];
    if (state.selectedSquare === null || piece?.color === state.position.turn) {
      if (piece?.color !== state.position.turn) return;
      store.setState({ ...state, selectedSquare: square, legalTargets: getLegalMoves(state.position, square).map((move) => move.to) });
      return;
    }
    if (state.legalTargets.includes(square)) {
      if (!submitMove({ from: state.selectedSquare, to: square })) store.setState({ ...state, selectedSquare: null, legalTargets: [] });
      return;
    }
    store.setState({ ...state, selectedSquare: null, legalTargets: [] });
  };

  const flip = (): void => {
    store.setState((state) => ({ ...state, orientation: state.orientation === 'red' ? 'black' : 'red' }));
  };
  const resign = (_color: Color): void => socket.resign(gameId);
  const offerDraw = (): void => socket.draw(gameId, 'offer');

  const onVisibilityChange = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') socket.joinGame(gameId);
  };

  return {
    getState: store.getState,
    subscribe: (listener) => store.subscribe(listener),
    selectSquare,
    submitMove,
    flip,
    resign,
    offerDraw,
    connect() {
      if (typeof document !== 'undefined' && !observingVisibility) {
        document.addEventListener('visibilitychange', onVisibilityChange);
        observingVisibility = true;
      }
      socket.connect();
    },
    dispose() {
      if (typeof document !== 'undefined' && observingVisibility) {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        observingVisibility = false;
      }
      socket.disconnect();
    },
  };
}
