import { expect, it } from 'vitest';
import { z } from 'zod';
import * as contracts from './index.js';

const validClock = { redRemainingMs: 300_000, blackRemainingMs: 300_000, activeColor: 'red', turnStartedAt: 1_800_000_000_000 };
const validTimeControl = { initialMs: 300_000, incrementMs: 3_000 };
const validResult = { winner: 'red', reason: 'CHECKMATE' };
const validGame = {
  gameId: 'g1', status: 'ACTIVE', initialFen: 'fen', moves: ['h2e2'], gameVersion: 1,
  clocks: validClock, result: null, redPlayerId: 'u1', blackPlayerId: 'u2', serverNow: 1_800_000_000_000,
};
const validRoom = {
  roomId: 'r1', code: 'ABCD', status: 'WAITING', timeControl: validTimeControl,
  members: [{ userId: 'u1', nickname: 'Player', color: 'red', isHost: true }], gameId: null,
};
const validUser = { id: 'u1', nickname: 'Player', type: 'guest' };

const cases: Array<[string, z.ZodTypeAny, unknown, unknown]> = [
  ['squareSchema', contracts.squareSchema, 'a0', 'j0'],
  ['moveSchema', contracts.moveSchema, { from: 'a0', to: 'i9' }, { from: 'a10', to: 'i9' }],
  ['colorSchema', contracts.colorSchema, 'red', 'green'],
  ['timeControlSchema', contracts.timeControlSchema, validTimeControl, { initialMs: 0, incrementMs: 3 }],
  ['clockStateSchema', contracts.clockStateSchema, validClock, { ...validClock, blackRemainingMs: -1 }],
  ['resultReasonSchema', contracts.resultReasonSchema, 'CHECKMATE', 'UNKNOWN'],
  ['gameResultSchema', contracts.gameResultSchema, validResult, { winner: 'green', reason: 'CHECKMATE' }],
  ['rejectReasonSchema', contracts.rejectReasonSchema, 'VERSION_CONFLICT', 'CHECKMATE'],
  ['gameStatusSchema', contracts.gameStatusSchema, 'ACTIVE', 'WAITING_ROOM'],
  ['userSummarySchema', contracts.userSummarySchema, validUser, { ...validUser, type: 'anonymous' }],
  ['uciMoveSchema', contracts.uciMoveSchema, 'h2e2', 'h10e2'],
  ['gameSnapshotSchema', contracts.gameSnapshotSchema, validGame, { ...validGame, gameVersion: -1 }],
  ['roomMemberSchema', contracts.roomMemberSchema, validRoom.members[0], { ...validRoom.members[0], isHost: 'yes' }],
  ['roomStatusSchema', contracts.roomStatusSchema, 'READY', 'ACTIVE'],
  ['roomSnapshotSchema', contracts.roomSnapshotSchema, validRoom, { ...validRoom, timeControl: { initialMs: 0, incrementMs: 0 } }],

  ['createGuestRequestSchema', contracts.createGuestRequestSchema, { nickname: 'Player' }, { nickname: '' }],
  ['createGuestResponseSchema', contracts.createGuestResponseSchema, validUser, { ...validUser, id: 3 }],
  ['getMeResponseSchema', contracts.getMeResponseSchema, validUser, { ...validUser, type: 'visitor' }],
  ['updateMeRequestSchema', contracts.updateMeRequestSchema, { nickname: 'New name' }, { nickname: 4 }],
  ['updateMeResponseSchema', contracts.updateMeResponseSchema, validUser, { ...validUser, nickname: null }],
  ['createRoomRequestSchema', contracts.createRoomRequestSchema, { timeControl: validTimeControl, hostColor: 'random' }, { timeControl: validTimeControl, hostColor: 'blue' }],
  ['createRoomResponseSchema', contracts.createRoomResponseSchema, validRoom, { ...validRoom, status: 'UNKNOWN' }],
  ['joinRoomRequestSchema', contracts.joinRoomRequestSchema, {}, { nickname: 2 }],
  ['joinRoomResponseSchema', contracts.joinRoomResponseSchema, validRoom, { ...validRoom, members: 'none' }],
  ['getRoomResponseSchema', contracts.getRoomResponseSchema, validRoom, { ...validRoom, code: null }],
  ['getGameResponseSchema', contracts.getGameResponseSchema, validGame, { ...validGame, moves: ['bad'] }],
  ['getGameMovesQuerySchema', contracts.getGameMovesQuerySchema, { cursor: 'next', limit: 10 }, { limit: 0 }],
  ['getGameMovesResponseSchema', contracts.getGameMovesResponseSchema, { moves: [{ ply: 1, uci: 'h2e2', clockAfterMs: 250_000 }], nextCursor: null }, { moves: [{ ply: -1, uci: 'bad', clockAfterMs: null }], nextCursor: null }],
  ['resignGameResponseSchema', contracts.resignGameResponseSchema, validGame, { ...validGame, clocks: 'invalid' }],
  ['drawOfferRequestSchema', contracts.drawOfferRequestSchema, { action: 'offer' }, { action: 'cancel' }],
  ['drawOfferResponseSchema', contracts.drawOfferResponseSchema, validGame, { ...validGame, result: { winner: 'red', reason: 'UNKNOWN' } }],

  ['roomJoinEventSchema', contracts.roomJoinEventSchema, { roomId: 'r1' }, { roomId: 3 }],
  ['gameJoinEventSchema', contracts.gameJoinEventSchema, { gameId: 'g1' }, { gameId: null }],
  ['gameMoveEventSchema', contracts.gameMoveEventSchema, { gameId: 'g1', moveId: 'm1', expectedVersion: 0, move: { from: 'a0', to: 'a1' } }, { gameId: 'g1', moveId: 'm1', expectedVersion: -1, move: { from: 'a0', to: 'a1' } }],
  ['gameSyncEventSchema', contracts.gameSyncEventSchema, { gameId: 'g1' }, {}],
  ['gameResignEventSchema', contracts.gameResignEventSchema, { gameId: 'g1' }, { gameId: 2 }],
  ['gameDrawEventSchema', contracts.gameDrawEventSchema, { gameId: 'g1', action: 'accept' }, { gameId: 'g1', action: 'withdraw' }],
  ['gameClaimWinEventSchema', contracts.gameClaimWinEventSchema, { gameId: 'g1' }, { gameId: false }],
];

it.each(cases)('%s parses valid data and rejects invalid data', (_name, schema, valid, invalid) => {
  expect(schema.safeParse(valid).success).toBe(true);
  expect(schema.safeParse(invalid).success).toBe(false);
});

it('squareSchema rejects malformed files, ranks, and empty strings', () => {
  for (const value of ['j0', 'a10', '']) expect(contracts.squareSchema.safeParse(value).success).toBe(false);
});

it('isApiError recognizes the shared error envelope', () => {
  expect(contracts.isApiError({ error: { code: 'BAD_REQUEST', message: 'Invalid input' } })).toBe(true);
  expect(contracts.isApiError({ error: { code: 3, message: 'Invalid input' } })).toBe(false);
});
