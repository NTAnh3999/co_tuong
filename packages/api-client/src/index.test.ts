import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError, createApiClient } from './index.js';

const user = { id: 'user-1', nickname: 'Xe', type: 'guest' as const };
const room = {
  roomId: 'room-1',
  code: 'ABC12345',
  status: 'WAITING' as const,
  timeControl: { initialMs: 600_000, incrementMs: 5_000 },
  members: [{ userId: 'user-1', nickname: 'Xe', color: 'red' as const, isHost: true }],
  gameId: null,
};

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const client = () => createApiClient({ baseUrl: 'http://localhost:3001/api/v1/' });

afterEach(() => vi.unstubAllGlobals());

describe('@xq/api-client', () => {
  it('returns a parsed GET response and includes credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(user));
    vi.stubGlobal('fetch', fetchMock);

    await expect(client().getMe()).resolves.toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/v1/me', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('validates a POST payload before sending and returns the parsed response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(user));
    vi.stubGlobal('fetch', fetchMock);

    await expect(client().createGuestSession({ nickname: 'Xe' })).resolves.toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/v1/sessions/guest', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: 'Xe' }),
    });

    await expect(client().createGuestSession({ nickname: '' })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws an ApiClientError containing the server error envelope and status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      error: { code: 'SESSION_REQUIRED', message: 'Sign in first.', details: { reason: 'missing' } },
    }, 401)));

    const promise = client().getMe();
    await expect(promise).rejects.toBeInstanceOf(ApiClientError);
    await expect(promise).rejects.toMatchObject({
      code: 'SESSION_REQUIRED',
      message: 'Sign in first.',
      details: { reason: 'missing' },
      status: 401,
    });
  });

  it('validates list responses and rejects a drifted response shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ moves: [], nextCursor: null }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(client().getGameMoves('g/1', { cursor: '2', limit: 5 })).resolves.toEqual({
      moves: [],
      nextCursor: null,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/v1/games/g%2F1/moves?cursor=2&limit=5',
      expect.objectContaining({ credentials: 'include', method: 'GET' }),
    );

    fetchMock.mockResolvedValueOnce(jsonResponse({ moves: [{ ply: 'bad' }], nextCursor: null }));
    await expect(client().getGameMoves('g1')).rejects.toThrow(/Expected number/);
  });

  it('surfaces malformed HTTP error responses as ApiClientError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ reason: 'unknown' }, 500)));

    await expect(client().getMe()).rejects.toMatchObject({
      name: 'ApiClientError',
      code: 'INVALID_ERROR_RESPONSE',
      status: 500,
    });
  });

  it('returns a parsed room response from a POST body endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(room));
    vi.stubGlobal('fetch', fetchMock);

    await expect(client().createRoom({
      timeControl: { initialMs: 600_000, incrementMs: 5_000 },
      hostColor: 'red',
    })).resolves.toEqual(room);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/v1/rooms', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ timeControl: { initialMs: 600_000, incrementMs: 5_000 }, hostColor: 'red' }),
    }));
  });
});
