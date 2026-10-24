import { createStore } from 'zustand/vanilla';
import { applyMove, decodeMove, fromFen, getLegalMoves, isLegalMove, squareToIndex, toFen } from '@xq/xiangqi-core';
import type { Move, Position, Square } from '@xq/xiangqi-core';
import type { PuzzleDetail } from '@xq/shared-contracts';

export interface PuzzleControllerState {
  readonly position: Position;
  readonly selectedSquare: Square | null;
  readonly legalTargets: readonly Square[];
  readonly history: readonly Move[];
  readonly status: 'in_progress' | 'solved';
  readonly lastMoveWasWrong: boolean;
  readonly hintsRevealed: number;
}

export interface PuzzleController {
  getState(): PuzzleControllerState;
  subscribe(listener: () => void): () => void;
  selectSquare(square: Square | null): void;
  requestHint(): void;
  retry(): void;
}

function positionKey(position: Position): string {
  // The board and side to move define puzzle equivalence; FEN move counters do not.
  return toFen(position).split(' ').slice(0, 4).join(' ');
}

export function createPuzzleController(puzzle: PuzzleDetail): PuzzleController {
  const initialPosition = fromFen(puzzle.initialFen);
  const lines = [...puzzle.solutionLines, ...puzzle.allowedAlternatives].map((line) => {
    const positions: Position[] = [initialPosition];
    let position = initialPosition;
    for (const uci of line) {
      const move = decodeMove(uci);
      if (!isLegalMove(position, move)) throw new Error(`Puzzle solution contains illegal move: ${uci}`);
      position = applyMove(position, move);
      positions.push(position);
    }
    return positions;
  });

  const store = createStore<PuzzleControllerState>(() => ({
    position: initialPosition,
    selectedSquare: null,
    legalTargets: [],
    history: [],
    status: 'in_progress',
    lastMoveWasWrong: false,
    hintsRevealed: 0,
  }));

  const clearSelection = () => store.setState((state) => ({ ...state, selectedSquare: null, legalTargets: [] }));

  const submitMove = (move: Move): void => {
    const state = store.getState();
    if (state.status === 'solved' || !isLegalMove(state.position, move)) return;
    const nextPosition = applyMove(state.position, move);
    const nextDepth = state.history.length + 1;
    const key = positionKey(nextPosition);
    const matchingLines = lines.filter((line) => {
      const expected = line[nextDepth];
      return expected !== undefined && positionKey(expected) === key;
    });

    if (matchingLines.length === 0) {
      store.setState({ ...state, selectedSquare: null, legalTargets: [], lastMoveWasWrong: true });
      return;
    }

    store.setState({
      ...state,
      position: nextPosition,
      history: [...state.history, move],
      selectedSquare: null,
      legalTargets: [],
      status: matchingLines.some((line) => line.length - 1 === nextDepth) ? 'solved' : 'in_progress',
      lastMoveWasWrong: false,
    });
  };

  const selectSquare = (square: Square | null): void => {
    const state = store.getState();
    if (state.status === 'solved') return;
    if (square === null) {
      store.setState({ ...state, selectedSquare: null, legalTargets: [], lastMoveWasWrong: false });
      return;
    }

    const piece = state.position.board[squareToIndex(square)];
    if (state.selectedSquare === null) {
      if (piece?.color !== state.position.turn) {
        if (state.lastMoveWasWrong) store.setState({ ...state, lastMoveWasWrong: false });
        return;
      }
      store.setState({
        ...state,
        selectedSquare: square,
        legalTargets: getLegalMoves(state.position, square).map((move) => move.to),
        lastMoveWasWrong: false,
      });
      return;
    }

    if (state.legalTargets.includes(square)) {
      submitMove({ from: state.selectedSquare, to: square });
      return;
    }
    if (square !== state.selectedSquare && piece?.color === state.position.turn) {
      store.setState({
        ...state,
        selectedSquare: square,
        legalTargets: getLegalMoves(state.position, square).map((move) => move.to),
        lastMoveWasWrong: false,
      });
      return;
    }
    store.setState({ ...state, selectedSquare: null, legalTargets: [], lastMoveWasWrong: false });
  };

  return {
    getState: store.getState,
    subscribe: (listener) => store.subscribe(listener),
    selectSquare,
    requestHint: () => store.setState((state) => ({
      ...state,
      lastMoveWasWrong: false,
      hintsRevealed: Math.min(puzzle.hints.length, state.hintsRevealed + 1),
    })),
    retry: () => store.setState({
      position: initialPosition,
      selectedSquare: null,
      legalTargets: [],
      history: [],
      status: 'in_progress',
      lastMoveWasWrong: false,
      hintsRevealed: 0,
    }),
  };
}
