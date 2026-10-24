import {
  applyMove,
  createInitialPosition,
  encodeMove,
  getAllLegalMoves,
  isInCheck,
  squareToIndex,
} from '@xq/xiangqi-core';

const gamesToTry = 20_000;
const maxPlies = 80;

for (let game = 1; game <= gamesToTry; game += 1) {
  let position = createInitialPosition();
  const moves: string[] = [];

  for (let ply = 0; ply < maxPlies; ply += 1) {
    const legalMoves = getAllLegalMoves(position, position.turn);
    if (legalMoves.length === 0) {
      if (isInCheck(position, position.turn)) {
        console.log(JSON.stringify({ game, plies: moves.length, moves }));
        process.exit(0);
      }
      break;
    }

    const weightedMoves = legalMoves.flatMap((candidate) => {
      const next = applyMove(position, candidate);
      const captures = position.board[squareToIndex(candidate.to)] !== null;
      const weight = isInCheck(next, next.turn) ? 12 : captures ? 3 : 1;
      return Array.from({ length: weight }, () => candidate);
    });
    const move = weightedMoves[Math.floor(Math.random() * weightedMoves.length)]!;
    moves.push(encodeMove(move));
    position = applyMove(position, move);
  }
}

throw new Error(`No checkmate found in ${gamesToTry} random games`);
