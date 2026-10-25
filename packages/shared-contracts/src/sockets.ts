import { z } from 'zod';
import {
  clockStateSchema,
  gameResultSchema,
  gameSnapshotSchema,
  moveSchema,
  rejectReasonSchema,
  roomSnapshotSchema,
} from './domain.js';

export const roomJoinEventSchema = z.object({ roomId: z.string() });
export const gameJoinEventSchema = z.object({ gameId: z.string() });
export const gameMoveEventSchema = z.object({
  gameId: z.string(),
  moveId: z.string(),
  expectedVersion: z.number().int().nonnegative(),
  move: moveSchema,
});
export const gameSyncEventSchema = z.object({ gameId: z.string() });
export const gameResignEventSchema = z.object({ gameId: z.string() });
export const gameDrawEventSchema = z.object({
  gameId: z.string(),
  action: z.enum(['offer', 'accept', 'decline']),
});
export const gameClaimWinEventSchema = z.object({ gameId: z.string() });

/** How long a player must stay disconnected before the opponent may claim an abandonment win. */
export const ABANDONMENT_THRESHOLD_MS = 60_000;

export type RoomJoinEvent = z.infer<typeof roomJoinEventSchema>;
export type GameJoinEvent = z.infer<typeof gameJoinEventSchema>;
export type GameMoveEvent = z.infer<typeof gameMoveEventSchema>;
export type GameSyncEvent = z.infer<typeof gameSyncEventSchema>;
export type GameResignEvent = z.infer<typeof gameResignEventSchema>;
export type GameDrawEvent = z.infer<typeof gameDrawEventSchema>;
export type GameClaimWinEvent = z.infer<typeof gameClaimWinEventSchema>;

export type GameMoveAcceptedPayload = {
  move: z.infer<typeof moveSchema>;
  moveId: string;
  gameVersion: number;
  clocks: z.infer<typeof clockStateSchema> | null;
};

export type GameMoveRejectedPayload = {
  moveId: string;
  reason: z.infer<typeof rejectReasonSchema>;
  authoritativeVersion: number;
};

export type SocketMembershipRejectedPayload = { reason: string };

export type ColorPresence = { connected: boolean; disconnectedAt: number | null };
export type GamePresencePayload = { gameId: string; red: ColorPresence; black: ColorPresence };

export type GameFinishedPayload = {
  result: z.infer<typeof gameResultSchema>;
  finalVersion: number;
};

export type RoomStatePayload = z.infer<typeof roomSnapshotSchema>;
export type GameStatePayload = z.infer<typeof gameSnapshotSchema>;

export interface ClientToServerEvents {
  'room:join': (payload: RoomJoinEvent) => void;
  'game:join': (payload: GameJoinEvent) => void;
  'game:move': (payload: GameMoveEvent) => void;
  'game:sync': (payload: GameSyncEvent) => void;
  'game:resign': (payload: GameResignEvent) => void;
  'game:draw': (payload: GameDrawEvent) => void;
  'game:claim-win': (payload: GameClaimWinEvent) => void;
}

export interface ServerToClientEvents {
  'room:state': (snapshot: RoomStatePayload) => void;
  'room:join:rejected': (payload: SocketMembershipRejectedPayload) => void;
  'game:join:rejected': (payload: SocketMembershipRejectedPayload) => void;
  'game:sync:rejected': (payload: SocketMembershipRejectedPayload) => void;
  'game:move:accepted': (payload: GameMoveAcceptedPayload) => void;
  'game:move:rejected': (payload: GameMoveRejectedPayload) => void;
  'game:state': (snapshot: GameStatePayload) => void;
  'game:finished': (payload: GameFinishedPayload) => void;
  'game:presence': (payload: GamePresencePayload) => void;
}
