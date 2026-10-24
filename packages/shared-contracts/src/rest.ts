import { z } from 'zod';
import {
  gameSnapshotSchema,
  gameResultSchema,
  gameStatusSchema,
  lessonDetailSchema,
  lessonSummarySchema,
  puzzleDetailSchema,
  puzzleSummarySchema,
  roomSnapshotSchema,
  timeControlSchema,
  userSummarySchema,
  uciMoveSchema,
} from './domain.js';
import type { RoomSnapshot } from './domain.js';

export const createGuestRequestSchema = z.object({ nickname: z.string().min(1).max(30) });
export const createGuestResponseSchema = userSummarySchema;
export const getMeResponseSchema = userSummarySchema;
export const updateMeRequestSchema = z.object({ nickname: z.string() });
export const updateMeResponseSchema = userSummarySchema;

export const createRoomRequestSchema = z.object({
  timeControl: timeControlSchema,
  hostColor: z.enum(['red', 'black', 'random']),
});
export const createRoomResponseSchema = roomSnapshotSchema;
export const joinRoomRequestSchema = z.object({ nickname: z.string().optional() });
export const joinRoomResponseSchema = roomSnapshotSchema;
export const getRoomResponseSchema = roomSnapshotSchema;
export const requestRematchResponseSchema = roomSnapshotSchema;

export const getGameResponseSchema = gameSnapshotSchema;
export const getGameMovesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().optional(),
});
export const getGameMovesResponseSchema = z.object({
  moves: z.array(z.object({
    ply: z.number().int().nonnegative(),
    uci: uciMoveSchema,
    clockAfterMs: z.number().int().nonnegative().nullable(),
  })),
  nextCursor: z.string().nullable(),
});
export const resignGameResponseSchema = gameSnapshotSchema;
export const drawOfferRequestSchema = z.object({ action: z.enum(['offer', 'accept', 'decline']) });
export const drawOfferResponseSchema = gameSnapshotSchema;

export const getLessonsResponseSchema = z.array(lessonSummarySchema);
export const getLessonResponseSchema = lessonDetailSchema;
export const getPuzzlesResponseSchema = z.array(puzzleSummarySchema);
export const getPuzzleResponseSchema = puzzleDetailSchema;
export const recordPuzzleAttemptRequestSchema = z.object({
  completed: z.boolean(),
  hintsUsed: z.number().int().nonnegative(),
});
export const recordPuzzleAttemptResponseSchema = z.object({
  status: z.enum(['in_progress', 'completed']),
  attempts: z.number().int(),
});
export const getMyGamesResponseSchema = z.object({
  games: z.array(z.object({
    gameId: z.string(),
    opponent: z.object({ id: z.string(), nickname: z.string() }).nullable(),
    status: gameStatusSchema,
    result: gameResultSchema.nullable(),
  })),
});

export const createAiGameRequestSchema = z.object({
  color: z.enum(['red', 'black']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});
export const createAiGameResponseSchema = z.object({ gameId: z.string() });

export type CreateGuestRequest = z.infer<typeof createGuestRequestSchema>;
export type CreateGuestResponse = z.infer<typeof createGuestResponseSchema>;
export type GetMeResponse = z.infer<typeof getMeResponseSchema>;
export type UpdateMeRequest = z.infer<typeof updateMeRequestSchema>;
export type UpdateMeResponse = z.infer<typeof updateMeResponseSchema>;
export type CreateRoomRequest = z.infer<typeof createRoomRequestSchema>;
export type CreateRoomResponse = RoomSnapshot;
export type JoinRoomRequest = z.infer<typeof joinRoomRequestSchema>;
export type JoinRoomResponse = RoomSnapshot;
export type GetRoomResponse = RoomSnapshot;
export type RequestRematchResponse = z.infer<typeof requestRematchResponseSchema>;
export type GetGameResponse = z.infer<typeof getGameResponseSchema>;
export type GetGameMovesQuery = z.infer<typeof getGameMovesQuerySchema>;
export type GetGameMovesResponse = z.infer<typeof getGameMovesResponseSchema>;
export type ResignGameResponse = z.infer<typeof resignGameResponseSchema>;
export type DrawOfferRequest = z.infer<typeof drawOfferRequestSchema>;
export type DrawOfferResponse = z.infer<typeof drawOfferResponseSchema>;
export type GetLessonsResponse = z.infer<typeof getLessonsResponseSchema>;
export type GetLessonResponse = z.infer<typeof getLessonResponseSchema>;
export type GetPuzzlesResponse = z.infer<typeof getPuzzlesResponseSchema>;
export type GetPuzzleResponse = z.infer<typeof getPuzzleResponseSchema>;
export type RecordPuzzleAttemptRequest = z.infer<typeof recordPuzzleAttemptRequestSchema>;
export type RecordPuzzleAttemptResponse = z.infer<typeof recordPuzzleAttemptResponseSchema>;
export type GetMyGamesResponse = z.infer<typeof getMyGamesResponseSchema>;
export type CreateAiGameRequest = z.infer<typeof createAiGameRequestSchema>;
export type CreateAiGameResponse = z.infer<typeof createAiGameResponseSchema>;
