import { createStore } from 'zustand/vanilla';
import {
  applyMove,
  CASUAL_RULESET,
  createInitialPosition,
  evaluateGame,
  fromFen,
  getLegalMoves,
  isLegalMove,
  replay,
  squareToIndex,
  toFen,
} from '@xq/xiangqi-core';
import type { Color, Move, Square, TerminalEvent } from '@xq/xiangqi-core';
import type { GameController, GameControllerState } from './game-controller.js';

export function createLocalGameController(initialFen?: string): GameController {
  const startingFen = initialFen ?? toFen(createInitialPosition());
  const initialPosition = fromFen(startingFen);
  const store = createStore<GameControllerState>(() => ({
    position: initialPosition,
    history: [],
    lastMove: null,
    selectedSquare: null,
    legalTargets: [],
    orientation: 'red',
    result: null,
  }));
  let terminalEvent: TerminalEvent | undefined;

  const evaluate = (history: readonly Move[], event = terminalEvent) => evaluateGame({
    initialFen: startingFen,
    moves: history,
    ruleSetVersion: CASUAL_RULESET.version,
    ...(event === undefined ? {} : { terminalEvent: event }),
  }, CASUAL_RULESET);

  const clearSelection = () => store.setState((state) => (
    state.selectedSquare === null && state.legalTargets.length === 0
      ? state
      : { ...state, selectedSquare: null, legalTargets: [] }
  ));

  const submitMove = (move: Move): boolean => {
    const state = store.getState();
    if (state.result !== null || !isLegalMove(state.position, move)) return false;

    const position = applyMove(state.position, move);
    const history = [...state.history, move];
    store.setState({
      ...state,
      position,
      history,
      lastMove: move,
      selectedSquare: null,
      legalTargets: [],
      result: evaluate(history),
    });
    return true;
  };

  const selectSquare = (square: Square | null): void => {
    const state = store.getState();
    if (state.result !== null) return;
    if (square === null) {
      clearSelection();
      return;
    }

    const piece = state.position.board[squareToIndex(square)];
    if (state.selectedSquare === null) {
      if (piece?.color !== state.position.turn) return;
      store.setState({
        ...state,
        selectedSquare: square,
        legalTargets: getLegalMoves(state.position, square).map((move) => move.to),
      });
      return;
    }

    if (state.legalTargets.includes(square)) {
      const applied = submitMove({ from: state.selectedSquare, to: square });
      if (!applied) clearSelection();
      return;
    }

    if (square !== state.selectedSquare && piece?.color === state.position.turn) {
      store.setState({
        ...state,
        selectedSquare: square,
        legalTargets: getLegalMoves(state.position, square).map((move) => move.to),
      });
      return;
    }
    clearSelection();
  };

  const flip = (): void => {
    store.setState((state) => ({ ...state, orientation: state.orientation === 'red' ? 'black' : 'red' }));
  };

  const resign = (color: Color): void => {
    const state = store.getState();
    if (state.result !== null) return;
    terminalEvent = { type: 'RESIGNATION', loser: color };
    store.setState({ ...state, result: evaluate(state.history) });
  };

  const offerDraw = (): void => {
    const state = store.getState();
    if (state.result !== null) return;
    terminalEvent = { type: 'DRAW_AGREEMENT' };
    store.setState({ ...state, result: evaluate(state.history) });
  };

  const undo = (): void => {
    const state = store.getState();
    if (state.history.length === 0) return;

    const history = state.history.slice(0, -1);
    terminalEvent = undefined;
    const steps = replay({
      initialFen: startingFen,
      moves: history,
      ruleSetVersion: CASUAL_RULESET.version,
    });
    const finalStep = steps[steps.length - 1];
    if (finalStep === undefined) return;
    store.setState({
      ...state,
      position: finalStep.position,
      history,
      lastMove: history[history.length - 1] ?? null,
      selectedSquare: null,
      legalTargets: [],
      result: evaluate(history),
    });
  };

  return {
    getState: store.getState,
    subscribe: (listener) => store.subscribe(listener),
    selectSquare,
    submitMove,
    flip,
    resign,
    undo,
    offerDraw,
  };
}
