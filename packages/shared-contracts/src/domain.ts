import { z } from 'zod';

/** ADR-018 coordinates: files a-i and ranks 0-9, from Red's perspective. */
export const squareSchema = z.string().regex(/^[a-i][0-9]$/);
export type Square = z.infer<typeof squareSchema>;

export const moveSchema = z.object({ from: squareSchema, to: squareSchema });
export type Move = z.infer<typeof moveSchema>;

export const colorSchema = z.enum(['red', 'black']);
export type Color = z.infer<typeof colorSchema>;

export const timeControlSchema = z.object({
  initialMs: z.number().int().positive(),
  incrementMs: z.number().int().nonnegative(),
});
export type TimeControl = z.infer<typeof timeControlSchema>;

export const clockStateSchema = z.object({
  redRemainingMs: z.number().int().nonnegative(),
  blackRemainingMs: z.number().int().nonnegative(),
  activeColor: colorSchema,
  turnStartedAt: z.number().int().nonnegative(),
});
export type ClockState = z.infer<typeof clockStateSchema>;

export const resultReasonSchema = z.enum([
  'CHECKMATE',
  'STALEMATE',
  'PERPETUAL_CHECK',
  'REPETITION',
  'MOVE_LIMIT',
  'INSUFFICIENT_MATERIAL',
  'RESIGNATION',
  'DRAW_AGREEMENT',
  'TIMEOUT',
  'TIMEOUT_INSUFFICIENT_MATERIAL',
  'ABANDONMENT',
  'ABORTED',
]);
export type ResultReason = z.infer<typeof resultReasonSchema>;

export const gameResultSchema = z.object({
  winner: colorSchema.nullable(),
  reason: resultReasonSchema,
});
export type GameResult = z.infer<typeof gameResultSchema>;

export const rejectReasonSchema = z.enum([
  'VERSION_CONFLICT',
  'NOT_YOUR_TURN',
  'ILLEGAL_MOVE',
  'GAME_NOT_ACTIVE',
  'NOT_A_PLAYER',
  'TIME_EXPIRED',
  'MOVE_ID_CONFLICT',
  'RATE_LIMITED',
]);
export type RejectReason = z.infer<typeof rejectReasonSchema>;

export const gameStatusSchema = z.enum(['WAITING', 'ACTIVE', 'FINISHED', 'ABORTED']);
export type GameStatus = z.infer<typeof gameStatusSchema>;

export const userSummarySchema = z.object({
  id: z.string(),
  nickname: z.string(),
  type: z.enum(['guest', 'registered']),
});
export type UserSummary = z.infer<typeof userSummarySchema>;

/** A move encoded in ADR-018's four-character UCCI coordinate form. */
export const uciMoveSchema = z.string().regex(/^[a-i][0-9][a-i][0-9]$/);
export type UciMove = z.infer<typeof uciMoveSchema>;

export const gameSnapshotSchema = z.object({
  gameId: z.string(),
  status: gameStatusSchema,
  initialFen: z.string(),
  moves: z.array(uciMoveSchema),
  gameVersion: z.number().int().nonnegative(),
  clocks: clockStateSchema.nullable(),
  result: gameResultSchema.nullable(),
  redPlayerId: z.string().nullable(),
  blackPlayerId: z.string().nullable(),
  serverNow: z.number().int().nonnegative(),
});
export type GameSnapshot = z.infer<typeof gameSnapshotSchema>;

export const roomMemberSchema = z.object({
  userId: z.string(),
  nickname: z.string(),
  color: colorSchema.nullable(),
  isHost: z.boolean(),
});
export type RoomMember = z.infer<typeof roomMemberSchema>;

export const roomStatusSchema = z.enum(['WAITING', 'READY', 'STARTED', 'CLOSED']);
export type RoomStatus = z.infer<typeof roomStatusSchema>;

export const roomSnapshotSchema = z.object({
  roomId: z.string(),
  code: z.string(),
  status: roomStatusSchema,
  timeControl: timeControlSchema,
  members: z.array(roomMemberSchema),
  gameId: z.string().nullable(),
});
export type RoomSnapshot = z.infer<typeof roomSnapshotSchema>;
