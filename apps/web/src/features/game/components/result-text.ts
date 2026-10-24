import type { Color, GameResult, ResultReason } from '@xq/xiangqi-core';

/** Vietnamese labels for every ADR-017 result reason. Shared by GameStatusBanner and ResultDialog. */
export const RESULT_REASON_LABELS: Record<ResultReason, string> = {
  CHECKMATE: 'Chiếu bí',
  STALEMATE: 'Hết nước đi',
  PERPETUAL_CHECK: 'Chiếu dai',
  REPETITION: 'Lặp thế',
  MOVE_LIMIT: 'Quá giới hạn nước đi',
  INSUFFICIENT_MATERIAL: 'Thiếu lực lượng',
  RESIGNATION: 'Đầu hàng',
  DRAW_AGREEMENT: 'Thỏa thuận hòa',
  TIMEOUT: 'Hết giờ',
  TIMEOUT_INSUFFICIENT_MATERIAL: 'Hết giờ — thiếu lực lượng',
  ABANDONMENT: 'Bỏ cuộc',
  ABORTED: 'Đã hủy ván',
};

export function colorName(color: Color): string {
  return color === 'red' ? 'Đỏ' : 'Đen';
}

/** Short turn line shown while a game is ongoing, e.g. "Đỏ đi". */
export function turnText(turn: Color): string {
  return `${colorName(turn)} đi`;
}

/** Full outcome line, e.g. "Đỏ thắng — Chiếu bí" or "Hòa — Lặp thế". */
export function resultText(result: GameResult): string {
  const reason = RESULT_REASON_LABELS[result.reason];
  if (result.winner === null) return `Hòa — ${reason}`;
  return `${colorName(result.winner)} thắng — ${reason}`;
}
