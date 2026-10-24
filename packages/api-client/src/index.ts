import {
  createGuestRequestSchema,
  createGuestResponseSchema,
  createRoomRequestSchema,
  createRoomResponseSchema,
  drawOfferRequestSchema,
  drawOfferResponseSchema,
  getGameMovesQuerySchema,
  getGameMovesResponseSchema,
  getGameResponseSchema,
  getMeResponseSchema,
  getRoomResponseSchema,
  isApiError,
  joinRoomRequestSchema,
  joinRoomResponseSchema,
  resignGameResponseSchema,
  updateMeRequestSchema,
  updateMeResponseSchema,
} from '@xq/shared-contracts';
import type {
  CreateGuestRequest,
  CreateGuestResponse,
  CreateRoomRequest,
  CreateRoomResponse,
  DrawOfferRequest,
  DrawOfferResponse,
  GetGameMovesQuery,
  GetGameMovesResponse,
  GetGameResponse,
  GetMeResponse,
  GetRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  ResignGameResponse,
  UpdateMeRequest,
  UpdateMeResponse,
} from '@xq/shared-contracts';
import type { z } from 'zod';

export interface ApiClientOptions {
  readonly baseUrl: string;
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly details: unknown;
  readonly status: number;

  constructor(args: { code: string; message: string; details?: unknown; status: number }) {
    super(args.message);
    this.name = 'ApiClientError';
    this.code = args.code;
    this.details = args.details;
    this.status = args.status;
  }
}

export interface ApiClient {
  createGuestSession(payload: CreateGuestRequest): Promise<CreateGuestResponse>;
  getMe(): Promise<GetMeResponse>;
  updateMe(payload: UpdateMeRequest): Promise<UpdateMeResponse>;
  createRoom(payload: CreateRoomRequest): Promise<CreateRoomResponse>;
  joinRoom(code: string, payload?: JoinRoomRequest): Promise<JoinRoomResponse>;
  getRoom(code: string): Promise<GetRoomResponse>;
  getGame(id: string): Promise<GetGameResponse>;
  getGameMoves(id: string, query?: GetGameMovesQuery): Promise<GetGameMovesResponse>;
  resignGame(id: string): Promise<ResignGameResponse>;
  offerDraw(id: string, payload: DrawOfferRequest): Promise<DrawOfferResponse>;
}

type Schema<T> = z.ZodType<T>;

function errorFromResponse(response: Response, body: unknown): ApiClientError {
  if (isApiError(body)) {
    return new ApiClientError({
      code: body.error.code,
      message: body.error.message,
      ...(body.error.details === undefined ? {} : { details: body.error.details }),
      status: response.status,
    });
  }
  return new ApiClientError({
    code: 'INVALID_ERROR_RESPONSE',
    message: `The server returned HTTP ${response.status} with an invalid error response.`,
    details: body,
    status: response.status,
  });
}

export function createApiClient({ baseUrl }: ApiClientOptions): ApiClient {
  const root = baseUrl.replace(/\/+$/, '');

  async function request<T>(
    path: string,
    method: 'GET' | 'POST' | 'PATCH',
    responseSchema: Schema<T>,
    body?: unknown,
    query?: URLSearchParams,
  ): Promise<T> {
    const url = `${root}${path}${query && query.size > 0 ? `?${query.toString()}` : ''}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (error) {
      throw new ApiClientError({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'The request could not be completed.',
        details: error,
        status: 0,
      });
    }

    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch (error) {
      if (!response.ok) {
        throw errorFromResponse(response, undefined);
      }
      throw new ApiClientError({
        code: 'INVALID_RESPONSE',
        message: 'The server returned a response that was not valid JSON.',
        details: error,
        status: response.status,
      });
    }

    if (!response.ok) throw errorFromResponse(response, responseBody);
    return responseSchema.parse(responseBody);
  }

  return {
    // These are `async` (rather than a plain function returning `request(...)`'s promise)
    // specifically so a synchronous Zod validation throw below becomes a REJECTED PROMISE,
    // not an exception thrown before any promise exists — every ApiClient method must be
    // uniformly promise-returning so callers can always `.catch()`/`await` consistently.
    async createGuestSession(payload) {
      const validPayload = createGuestRequestSchema.parse(payload);
      return request('/sessions/guest', 'POST', createGuestResponseSchema, validPayload);
    },
    getMe() {
      return request('/me', 'GET', getMeResponseSchema);
    },
    async updateMe(payload) {
      const validPayload = updateMeRequestSchema.parse(payload);
      return request('/me', 'PATCH', updateMeResponseSchema, validPayload);
    },
    async createRoom(payload) {
      const validPayload = createRoomRequestSchema.parse(payload);
      return request('/rooms', 'POST', createRoomResponseSchema, validPayload);
    },
    async joinRoom(code, payload = {}) {
      const validPayload = joinRoomRequestSchema.parse(payload);
      return request(`/rooms/${encodeURIComponent(code)}/join`, 'POST', joinRoomResponseSchema, validPayload);
    },
    getRoom(code) {
      return request(`/rooms/${encodeURIComponent(code)}`, 'GET', getRoomResponseSchema);
    },
    getGame(id) {
      return request(`/games/${encodeURIComponent(id)}`, 'GET', getGameResponseSchema);
    },
    async getGameMoves(id, query = {}) {
      const validQuery = getGameMovesQuerySchema.parse(query);
      const params = new URLSearchParams();
      if (validQuery.cursor !== undefined) params.set('cursor', validQuery.cursor);
      if (validQuery.limit !== undefined) params.set('limit', String(validQuery.limit));
      return request(`/games/${encodeURIComponent(id)}/moves`, 'GET', getGameMovesResponseSchema, undefined, params);
    },
    resignGame(id) {
      return request(`/games/${encodeURIComponent(id)}/resign`, 'POST', resignGameResponseSchema);
    },
    async offerDraw(id, payload) {
      const validPayload = drawOfferRequestSchema.parse(payload);
      return request(`/games/${encodeURIComponent(id)}/draw-offer`, 'POST', drawOfferResponseSchema, validPayload);
    },
  };
}

export { createGameSocket } from './socket.js';
export type { GameSocket, GameSocketHandlers } from './socket.js';

