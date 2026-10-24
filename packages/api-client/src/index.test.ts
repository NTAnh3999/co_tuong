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
  rematchVotes: [],
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

  it('parses content endpoint responses', async () => {
    const lesson = { slug: 'khai-cuoc', title: 'Khai cuộc cơ bản', level: 'beginner' as const };
    const puzzle = {
      id: 'puzzle-1', title: 'Chiếu bí', difficulty: 2, objective: 'Chiếu hết trong một nước',
      initialFen: 'test-fen', sideToMove: 'red' as const, solutionLines: [['h2e2']],
      allowedAlternatives: [], hints: [], source: 'unit-test',
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([lesson])));
    await expect(client().getLessons()).resolves.toEqual([lesson]);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ...lesson, steps: [] })));
    await expect(client().getLesson('khai-cuoc')).resolves.toEqual({ ...lesson, steps: [] });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([{ id: puzzle.id, title: puzzle.title, difficulty: puzzle.difficulty }])));
    await expect(client().getPuzzles()).resolves.toEqual([{ id: puzzle.id, title: puzzle.title, difficulty: puzzle.difficulty }]);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(puzzle)));
    await expect(client().getPuzzle('puzzle-1')).resolves.toEqual(puzzle);

    const attemptFetch = vi.fn().mockResolvedValue(jsonResponse({ status: 'completed', attempts: 2 }));
    vi.stubGlobal('fetch', attemptFetch);
    await expect(client().recordPuzzleAttempt('puzzle-1', { completed: true, hintsUsed: 1 }))
      .resolves.toEqual({ status: 'completed', attempts: 2 });
    expect(attemptFetch).toHaveBeenCalledWith('http://localhost:3001/api/v1/puzzles/puzzle-1/attempts', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ completed: true, hintsUsed: 1 }),
    }));
  });

  it('parses GET /me/games', async () => {
    const response = { games: [{ gameId: 'g1', opponent: null, status: 'ACTIVE' as const, result: null }] };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(response));
    vi.stubGlobal('fetch', fetchMock);

    await expect(client().getMyGames()).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/v1/me/games', expect.objectContaining({
      method: 'GET',
      credentials: 'include',
    }));
  });
});
