# API authorization matrix

Scope: handlers registered by `apps/api` (REST prefix `/api/v1`; Socket.IO gateway events). This records the checks present in code, not intended policy. “Allowed” means the handler proceeds to its normal validation/business logic; it does not guarantee a successful response. Unless specified, invalid/missing sessions are rejected before REST handlers and disconnect before socket handlers.

## Actors

- **Anonymous:** no valid `xq_sid` session.
- **Guest session:** valid session whose user type is `guest`.
- **Registered session:** valid session whose user type is `registered`.
- **Seat owner:** a valid session whose `user.id` equals the target game's `redId` or `blackId`.
- **Room creator:** a valid session that created the target room (`RoomMember.isHost`); room-member checks also admit the other room member, so “Allow” in that context means creator or member.
- **Spectator:** a valid session that is not a seat owner for the target game; for room operations, a session that is not a room member. These are contextual descriptions, not code roles.

For room-member-only checks, the Room creator column also represents a non-host room member; `isHost` is not used for authorization.

There is no separate role guard. `SessionGuard` resolves both guest and registered sessions identically. Seat/room categories can overlap with guest or registered.

## REST matrix

Paths include the global `/api/v1` prefix. “No role check” means any valid session can invoke the handler, subject to ordinary input/business validation.

| Method and path | Anonymous | Guest | Registered | Seat owner | Room creator | Spectator | Enforcement / evidence |
|---|---|---|---|---|---|---|---|
| `GET /api/v1/health` | Allow | Allow | Allow | Allow | Allow | Allow | No guard; `HealthController.getHealth` |
| `POST /api/v1/sessions/guest` | Allow | Allow | Allow | Allow | Allow | Allow | `ThrottlerGuard` (10/min); no session requirement |
| `GET /api/v1/me` | Deny | Allow | Allow | Allow | Allow | Allow | `SessionGuard`; `@CurrentUser` |
| `PATCH /api/v1/me` | Deny | Allow | Allow | Allow | Allow | Allow | `SessionGuard`; updates only current user's nickname via `user.id` |
| `POST /api/v1/games/ai` | Deny | Allow | Allow | Allow | Allow | Allow | Controller-level `SessionGuard`; no guest/registered distinction |
| `GET /api/v1/lessons` | Deny | Allow | Allow | Allow | Allow | Allow | Controller-level `SessionGuard`; no content visibility check |
| `GET /api/v1/lessons/:slug` | Deny | Allow | Allow | Allow | Allow | Allow | Controller-level `SessionGuard`; no content visibility check |
| `GET /api/v1/puzzles` | Deny | Allow | Allow | Allow | Allow | Allow | Controller-level `SessionGuard`; no content visibility check |
| `GET /api/v1/puzzles/:id` | Deny | Allow | Allow | Allow | Allow | Allow | Controller-level `SessionGuard`; no content visibility check |
| `POST /api/v1/puzzles/:id/attempts` | Deny | Allow | Allow | Allow | Allow | Allow | Controller-level `SessionGuard`; records attempt under current `user.id` |
| `GET /api/v1/games/:id` | Deny | Allow | Allow | Allow | Allow | Allow | Controller-level `SessionGuard`; `getSnapshot` checks existence only, no participant check |
| `GET /api/v1/games/:id/moves` | Deny | Allow | Allow | Allow | Allow | Allow | Controller-level `SessionGuard`; `getMoves` checks existence only |
| `POST /api/v1/games/:id/resign` | Deny | Allow | Allow | Allow | Deny* | Deny | Controller `SessionGuard`; `playerColor` requires `redId` or `blackId` match (403 otherwise) |
| `POST /api/v1/games/:id/draw-offer` | Deny | Allow | Allow | Allow | Deny* | Deny | Controller `SessionGuard`; same `playerColor` seat check |
| `GET /api/v1/me/games` | Deny | Allow | Allow | Allow | Allow | Allow | Controller `SessionGuard`; service filters to games where current id is a seat |
| `POST /api/v1/rooms` | Deny | Allow | Allow | Allow | Allow | Allow | Controller `SessionGuard`; creator recorded as host/member |
| `POST /api/v1/rooms/:code/join` | Deny | Allow | Allow | Allow | Allow | Allow | `SessionGuard` + `ThrottlerGuard`; service uses session id to enforce membership/seat capacity and idempotent rejoin; optional nickname updates current user |
| `GET /api/v1/rooms/:code` | Deny | Allow | Allow | Allow | Allow | Allow | Controller `SessionGuard`; no room membership check |
| `POST /api/v1/rooms/:code/rematch` | Deny | Allow if room member | Allow if room member | Allow if member | Allow | Deny | `SessionGuard`; `RoomsService.requestRematch` requires `members.some(userId === user.id)`, game started and finished |

\* A room creator who is also a game seat owner is allowed by the seat check; creator status alone grants nothing. “Spectator” is denied on player actions because it is defined here as a non-seat owner.

Representative source checks (line numbers are in the source tree):

- `SessionGuard` rejects unresolved cookies: `session.guard.ts:17-20` (`if (!user) throw new UnauthorizedException(...)`). The resolver accepts only a matching, unexpired token: `session-identity.ts:24-33, 60-65`.
- Public health endpoint has no guard: `health.controller.ts:5-10`.
- Game action authorization is user-id-to-seat matching: `games.controller.ts:56-61` (`players.redId === userId` / `players.blackId === userId`; otherwise `ForbiddenException`).
- Room rematch membership is checked in service code: `rooms.service.ts:140-145` (`NOT_A_ROOM_MEMBER` if no member's `userId` matches).

## Socket.IO matrix

Socket connection authenticates every client through the handshake cookie (`game.gateway.ts:58-66`); a missing/invalid session is disconnected. Therefore anonymous actors cannot invoke subscribed events. Socket event schemas are parsed in each handler; malformed payloads are ignored. “Join room” below means Socket.IO room membership, not product room membership.

| Event (direction) | Anonymous | Guest | Registered | Seat owner | Room creator | Spectator | Enforcement / delivery scope |
|---|---|---|---|---|---|---|---|
| `room:join` (client → server) | Deny | Allow | Allow | Allow | Allow | Allow | Authenticated connection + schema + room lookup; no membership check; joins room by supplied `roomId`, then sends `room:state` directly to requester |
| `game:join` (client → server) | Deny | Allow | Allow | Allow | Allow | Allow | Authenticated connection + schema + game lookup; anyone with a valid session joins supplied `gameId` room and receives snapshot; seat match only controls presence tracking |
| `game:move` (client → server) | Deny | Allow if seat owner | Allow if seat owner | Allow | Deny | Deny | `playerColor` checks user id against red/black seat; non-player receives direct `game:move:rejected`; `GamesService.submitMove` validates move/version/status |
| `game:sync` (client → server) | Deny | Allow | Allow | Allow | Allow | Allow | Authenticated connection + schema + game lookup only; snapshot emitted directly to requester; no seat check |
| `game:resign` (client → server) | Deny | Allow if seat owner | Allow if seat owner | Allow | Deny | Deny | `playerColor` seat check; only matching seat reaches `GamesService.resign` |
| `game:draw` (client → server) | Deny | Allow if seat owner | Allow if seat owner | Allow | Deny | Deny | `playerColor` seat check; service validates offer/response state |
| `game:claim-win` (client → server) | Deny | Allow if seat owner and threshold met | Allow if seat owner and threshold met | Partial | Deny | Deny | `playerColor` seat check and in-memory opposing-seat disconnect timestamp ≥ 60 seconds; otherwise direct rejection |
| `room:state` (server → client) | Deny | Allow if joined `roomId` room; direct response also | Allow if joined `roomId` room; direct response also | Same | Same | Same | `onRoomUpdated` broadcasts to `server.to(roomId)`; `room:join` itself directly emits snapshot to caller |
| `game:state` (server → client) | Deny | Allow if joined `gameId` room; direct response also | Allow if joined `gameId` room; direct response also | Same | Same | Same | `onGameUpdated` broadcasts to `server.to(gameId)`; `game:join` and `game:sync` directly emit snapshots to requester |
| `game:move:accepted` (server → client) | Deny | Allow if joined `gameId` room | Allow if joined `gameId` room | Same | Same | Same | `onGameUpdated` broadcasts move/clocks to every socket in game room |
| `game:finished` (server → client) | Deny | Allow if joined `gameId` room | Allow if joined `gameId` room | Same | Same | Same | `onGameUpdated` broadcasts final result to every socket in game room |
| `game:move:rejected` (server → client) | Deny | Allow if event requester | Allow if event requester | Same | Same | Same | Direct `client.emit`; non-seat can receive rejection including authoritative version |
| `game:claim-win:rejected` (server → client) | Deny | Allow if event requester | Allow if event requester | Same | Same | Same | Direct `client.emit` on non-player or unmet disconnect threshold |

The “joined room” broadcast conditions are simply socket room membership. `room:join` and `game:join` do not verify room membership/seat ownership before joining. ADR-020 states that game seats bind to internal `userId`, not `socket.id`; code follows that invariant in `playerColor` and `joinGame` presence tracking (`ADR-020`, “Chân dung (game seats)”; `game.gateway.ts:95-100, 190-195`).

## Findings

- **Room state and game state are available to any authenticated session by guessed/known identifier.** REST `GET /rooms/:code` and game snapshot/move reads do not require membership. Socket `room:join`, `game:join`, and `game:sync` accept any authenticated user's supplied identifier; join handlers add the socket to broadcast rooms without a member/seat check. Consequently non-members/spectators can obtain current state and receive room broadcasts (`rooms.controller.ts:37-40`; `games.controller.ts:15-33`; `game.gateway.ts:79-102, 129-133, 184-188`).
- **Room update broadcasts contain full room snapshots and use no membership-scoped audience.** A socket can join by `roomId` alone; later `room:state` is sent to every socket in that room (`game.gateway.ts:83-85, 184-188`).
- **Game broadcast rooms are similarly joinable by any authenticated session.** Game snapshots, moves/clocks and finished results are broadcast to all sockets in the game room (`game.gateway.ts:92-102, 170-182`). This is consistent with public spectator viewing only if that is intended; membership is not enforced by implementation.
- **Disconnect presence is tracked by user identity but not reference-counted across sockets.** Any one socket disconnect for a seat owner marks that color disconnected even if another socket for the same user remains connected (`game.gateway.ts:68-76`); claim-win relies on that presence timestamp (`151-167`). This can permit an early abandonment claim when multiple tabs/devices are connected.
- **Room creators have no privileged authorization in handlers.** `isHost` is stored and exposed, but rematch authorization checks room membership only; other room actions do not check creator identity. No creator-only endpoint/event was found.
