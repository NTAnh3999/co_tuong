import { z } from 'zod';
import {
  gameSnapshotSchema,
  roomSnapshotSchema,
  timeControlSchema,
  userSummarySchema,
  uciMoveSchema,
} from './domain.js';

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

export type CreateGuestRequest = z.infer<typeof createGuestRequestSchema>;
export type CreateGuestResponse = z.infer<typeof createGuestResponseSchema>;
export type GetMeResponse = z.infer<typeof getMeResponseSchema>;
export type UpdateMeRequest = z.infer<typeof updateMeRequestSchema>;
export type UpdateMeResponse = z.infer<typeof updateMeResponseSchema>;
export type CreateRoomRequest = z.infer<typeof createRoomRequestSchema>;
export type CreateRoomResponse = z.infer<typeof createRoomResponseSchema>;
export type JoinRoomRequest = z.infer<typeof joinRoomRequestSchema>;
export type JoinRoomResponse = z.infer<typeof joinRoomResponseSchema>;
export type GetRoomResponse = z.infer<typeof getRoomResponseSchema>;
export type GetGameResponse = z.infer<typeof getGameResponseSchema>;
export type GetGameMovesQuery = z.infer<typeof getGameMovesQuerySchema>;
export type GetGameMovesResponse = z.infer<typeof getGameMovesResponseSchema>;
export type ResignGameResponse = z.infer<typeof resignGameResponseSchema>;
export type DrawOfferRequest = z.infer<typeof drawOfferRequestSchema>;
export type DrawOfferResponse = z.infer<typeof drawOfferResponseSchema>;
