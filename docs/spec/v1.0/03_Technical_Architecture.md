# 03. TECHNICAL ARCHITECTURE

## 1. Quyết định stack và ranh giới hệ thống

**Kiến trúc:** pnpm workspace + Turborepo, Web-first, modular monolith ở NestJS, engine AI chạy worker độc lập. Không chọn Microservices cho MVP.

| Lớp | Tech stack | Quyết định |
|---|---|---|
| Web | Next.js App Router + React + TypeScript | Hướng đã thống nhất |
| UI | Tailwind CSS + shadcn/ui | Đề xuất |
| Chess 2D | React + SVG; Pointer Events, Motion | Đề xuất |
| State UI | Zustand | Đề xuất |
| API cache | TanStack Query | Đề xuất |
| Server | NestJS REST + Socket.IO | Hướng đã thống nhất |
| DB | PostgreSQL + Prisma | Hướng đã thống nhất |
| Auth | Guest sessions trước; provider đăng nhập cần chốt | Guest-first đã thống nhất; provider chưa chốt |
| Chess core | Pure TypeScript, independent package | Hướng đã thống nhất |
| AI | Pikafish UCI qua worker process | Đề xuất có rà soát GPLv3 |
| Deploy | Docker Compose trên VPS, reverse proxy HTTPS | Đề xuất MVP |
| 3D future | Three.js + React Three Fiber (stable) + GLB/glTF | Đề xuất SAU MVP |
| Analytics/ops | Logs + Sentry/OpenTelemetry tùy chọn | Đề xuất |

**Lý do dùng hai ứng dụng Next.js/NestJS:** Website có nhu cầu SEO và UI tương tác; backend cần xử lý socket dài hạn, game room, đồng hồ, AI worker, bảo mật và quyền phiên. Dù tách runtime, hệ thống vẫn là modular monolith, không phải mạng nhiều microservice.

## 2. Sơ đồ logic

```text
Desktop browser / Mobile browser / PWA (future)
            |
  Next.js Web Application
  - Home/Learn/Puzzle/Game UI
  - GameController + BoardRenderer(2D/3D)
  - Xiangqi Core (validate for UX)
            |
      REST + Socket.IO
            |
       NestJS API
  - Auth/Guest   - Rooms/Games
  - Clock        - Learning
  - Xiangqi Core (authoritative)
            |                 \
       PostgreSQL        Pikafish Worker
     (persistent log)    (UCI subprocess)

Note: online state is authoritative in NestJS, not browser.
```

## 3. Monorepo đề xuất

```text
xiangqi-platform/
  apps/
    web/                  # Next.js App Router
    api/                  # NestJS
  packages/
    xiangqi-core/         # chess rules + notation + FEN
    shared-contracts/     # types + runtime schemas
    api-client/           # fetch/socket clients
  services/
    pikafish-worker/      # isolated engine management
  infrastructure/
    docker/
    scripts/
  docs/                   # documentation versioned in git
  pnpm-workspace.yaml
  turbo.json
```

Dự án mobile-native sau này thêm `apps/mobile/` (React Native) dùng lại core, contracts và API-client nhưng **không giả định tái sử dụng trực tiếp web renderer**.

## 4. Xiangqi Core — cách biểu diễn

### 4.1. Bàn cờ và tọa độ

- Bàn cờ **9 cột × 10 hàng = 90 giao điểm**. Mảng 90 phần tử là lựa chọn cho MVP; sau này có thể tối ưu mà giữ nguyên public API.
- **Quy ước do dự án định nghĩa:** Góc trái dưới bên Đỏ là `a0`, góc phải trên là `i9`, Red ở dưới trong orientation chuẩn; tọa độ logic không đổi khi xoay bàn cờ.
- Mảng có thể map `index = rank * 9 + file` với rank 0 tại phía Đỏ, hoặc một kiểu Position cấu trúc khác; tất cả phải có round-trip tests.
- Chuỗi nước đi tọa độ, ví dụ `b0c2`, **chỉ được coi là hợp lệ sau khi test tương thích với adapter UCI của engine**; FEN và chuyển chiều cũng phải có kiểm thử integration.
- Không lưu tọa độ pixel/SVG/3D vào GameState.

### 4.2. Domain contracts (đề xuất)

```ts
type Color = 'red' | 'black';
type PieceType = 'GENERAL' | 'ADVISOR' | 'ELEPHANT' |
  'HORSE' | 'CHARIOT' | 'CANNON' | 'SOLDIER';
type Square = string;  // validated at runtime: /^[a-i][0-9]$/
interface Piece { color: Color; type: PieceType }
interface Move { from: Square; to: Square }
interface Position {
  board: readonly (Piece | null)[]; // length 90
  turn: Color;
}
interface GameRecord {
  initialPosition: Position;
  moves: readonly Move[];
  ruleSetVersion: string;
}
```

`Square` không chỉ là chuỗi tự do: dùng schema validator hoặc value object trước khi chuyển sang index. `Position` **không đủ** để xử lý lặp thế/đuổi quân và đồng hồ; phải giữ **game history + time state + ruleset** ở tầng phiên game.

### 4.3. API core bắt buộc

- `createInitialPosition()`
- `getLegalMoves(position, square)`
- `isLegalMove(position, move)`
- `applyMove(position, move): Position` — pure function
- `isInCheck(position, color)`
- `evaluateGame(gameRecord, clocks, ruleSet): GameResult`
- `toFen(position)` / `fromFen(fen)` — có kiểm tra round-trip
- `encodeMove(move)` / `decodeMove(text)` — định dạng tọa độ đã thống nhất

Nguyên tắc: không import UI, DOM, networking, database hay Pikafish vào package `xiangqi-core`. Unit tests độc lập, không cần chạy web/server.

### 4.4. Tình huống luật cờ cần kiểm thử

- Pháo đi không ăn như Xe nhưng ăn quân phải nhảy qua **đúng một** quân.
- Mã bị cản chân; Tượng bị cản mắt và không qua sông; Tướng và Sĩ ở trong cung.
- Tốt đi thẳng một bước trước khi qua sông; sau sông đi ngang được nhưng không đi lùi.
- Tướng không được đối mặt nhau trên cùng cột khi không có quân chắn.
- Không được để Tướng của mình bị chiếu sau nước đi; không được bỏ chiếu mà không hóa giải.
- Không có nước đi hợp lệ: **bên đến lượt thua**, kể cả không bị chiếu (khác với stalemate trong cờ vua quốc tế).
- Phân loại lặp thế, chiếu liên tục, đuổi quân, hòa theo **RuleSet** đã chốt. Đây là bài toán độc lập, phức tạp, không đánh đồng với kiểm tra 3-fold của cờ vua.

**CHƯA CHỐT / blocker trước phát hành:** Lựa chọn bộ luật (ví dụ tài liệu Asian Xiangqi Federation), mức bao phủ chiếu-đuổi, cách xử lý trường hợp lặp chưa giải quyết được. Có thể beta casual với quy định giản lược được thông báo rõ, nhưng không được quảng cáo là luật thi đấu chuẩn nếu thiếu kiểm thử.

## 5. GameController và Multi-renderer

Tách three layers:

1. **Core:** Vị trí, nước đi hợp lệ, kết quả, tuần tự lịch sử.
2. **Game Controller:** Chuyển đổi hành động thành command, quản lý phiên local/AI/online, optimistic visual state nếu cần.
3. **Board Renderer:** Vẽ và nhận tương tác để phát command, không ra quyết định luật.

```ts
interface BoardRendererProps {
  position: Position;
  orientation: Color;
  selectedSquare: Square | null;
  legalMoves: readonly Move[];
  lastMove: Move | null;
  onSquareClick(square: Square): void;
  onMove(move: Move): void;
}
```

Implement `Board2D` trước; sau MVP, `Board3D` dùng lại interface. Đổi renderer không làm thay đổi state, đồng hồ, kết quả, lịch sử hoặc protocol. Các animation chỉ phản ánh state đã chấp nhận; không là nguồn tính toán thời gian.

**2D:** React SVG, responsive theo tỷ lệ bàn cờ, Pointer Events để chạm-chạm/kéo thả, animation không block luật.  
**3D:** Three.js + React Three Fiber stable, Three Canvas chỉ chạy Client Component; model GLB/glTF từ Blender; raycasting map đối tượng → Square; lazy loading scene, fallback 2D, giảm texture/lighting và hỗ trợ reduced motion.

## 6. Multiplayer: hợp đồng tính nhất quán

### 6.1. Server-authoritative move lifecycle

1. Client phát command `{gameId, moveId, expectedVersion, move}`.
2. Server xác thực session, quyền/người chơi/màu, trạng thái game, lượt đi, giới hạn thời gian.
3. Server gọi core để xác định hợp lệ.
4. Trong một transaction/critical section theo `gameId`, ghi nước đi và tăng `gameVersion`.
5. Sau commit, phát `game:move:accepted` và `game:state` hoặc incremental event; client reconcile.
6. Reject nếu sai phiên bản, sai lượt, trái luật hoặc trận kết thúc; gửi state mới nếu cần.

**Idempotency:** `moveId` là khóa chống gửi trùng. `expectedVersion` chống ghi đè khi nhiều request cùng tới. Không đặt độ tin cậy vào `socket.id` vì socket ID có thể đổi khi reconnect.

### 6.2. WebSocket events P0

| Event | Chiều | Payload tối thiểu |
|---|---|---|
| `room:join` | C→S | `roomId/joinToken` |
| `room:state` | S→C | members, settings, status |
| `game:join` | C→S | `gameId/session` |
| `game:move` | C→S | `moveId`, `expectedVersion`, `move` |
| `game:move:accepted` | S→C | acceptedMove, gameVersion, clocks |
| `game:move:rejected` | S→C | reasonCode, authoritativeVersion |
| `game:state` | S→C | snapshot, gameVersion, clocks, status |
| `game:finished` | S→C | result, reason, finalVersion |

**Reconnect:** client gọi `GET /games/:id` hoặc `game:sync` để nhận full authoritative snapshot, bất kể Socket.IO state recovery có thành công hay không. Có phương án xử lý tab background và clock.

### 6.3. Đồng hồ

Clock server-side là nguồn duy nhất; lưu `remainingMs` từng bên, `activeColor`, `lastTickAt`/`turnStartedAt`, cơ chế timeout trên server. Định nghĩa rõ pause hay không khi mất kết nối, chính sách vắng mặt và luật xử thua hết giờ **trước khi lập trình**.

## 7. REST API P0

| Method | Path | Chức năng |
|---|---|---|
| `POST` | `/api/v1/rooms` | Tạo phòng riêng |
| `POST` | `/api/v1/rooms/:id/join` | Join phòng bằng quyền hợp lệ |
| `GET` | `/api/v1/rooms/:id` | Snapshot phòng |
| `GET` | `/api/v1/games/:id` | Snapshot trận, clock, version |
| `GET` | `/api/v1/games/:id/moves` | Move history có phân trang (nếu cần) |
| `POST` | `/api/v1/games/:id/resign` | Đầu hàng |
| `POST` | `/api/v1/games/:id/draw-offer` | Đề nghị hòa |
| `GET` | `/api/v1/lessons` | Catalog bài học |
| `GET` | `/api/v1/puzzles` | Catalog puzzle |
| `POST` | `/api/v1/puzzles/:id/attempts` | Ghi kết quả puzzle |

Auth và authorization server-side; bảo vệ room code khỏi brute-force, rate limit endpoints nhạy cảm, phân quyền game read vs control, CSRF/CORS/cookie phù hợp triển khai thực tế.

## 8. Dữ liệu cốt lõi (logical schema)

| Entity | Trường tối thiểu |
|---|---|
| `users` | id, nickname, type(guest/registered), createdAt |
| `rooms` | id, publicCode, hostId, settingsJson, status, expiresAt |
| `room_members` | roomId, playerId, role, joinedAt |
| `games` | id, roomId?, mode, redId, blackId, initialFen, ruleSetVersion, status, result, gameVersion, createdAt |
| `game_moves` | id, gameId, moveNumber, moveId(unique), from, to, playerId, clockAfterMs, acceptedAt |
| `game_snapshots` | gameId, ply, fen, clocksJson, version, createdAt |
| `lessons` | id, slug, title, level, contentVersion, bodyJson |
| `puzzles` | id, initialFen, sideToMove, solutionJson, difficulty, contentVersion |
| `learning_progress` | userId, contentId, status, attempts, completedAt |
| `game_analysis` | gameId, engineVersion, paramsJson, resultJson, createdAt — P1 |

**Quan trọng:** Initial FEN + move log + RuleSet là dữ liệu chuẩn của ván; snapshot là cache để khôi phục nhanh. FEN không chứa đủ đồng hồ và lịch sử lặp, nên không thể là nguồn dữ liệu duy nhất. Lưu event log bền, backup và có kiểm thử khôi phục.

## 9. Pikafish integration

- Adapter nói chuyện với engine qua UCI; worker process độc lập với NestJS request loop.
- Giới hạn CPU/time per move, số worker đồng thời, timeout, kill/restart nếu treo.
- Tránh để một trận đấu AI sinh process không giới hạn; có queue/concurrency limit.
- Engine chỉ đề nghị nước đi; trước khi trả người chơi, server/core xác thực tính hợp lệ và version.
- Không cung cấp API phân tích nước tối ưu trong ván online cạnh tranh.
- **Rà soát giấy phép GPLv3 và các điều khoản của model/asset** trước khi phân phối, đặc biệt nếu embed engine trên client hoặc phân phối WASM.
- Sau MVP mới thử nghiệm Pikafish WASM trên browser; benchmark thiết bị tầm trung, thời gian tải, tính tương thích, build maintenance và license.

## 10. Vận hành MVP

- Docker Compose gồm `web`, `api`, `postgres`, `pikafish-worker`, reverse proxy HTTPS; secrets qua environment/secret store, không commit.
- Một VPS là giả định giai đoạn đầu; tách worker/database khi quá tải. **Redis/BullMQ không bắt buộc trong MVP**; chỉ thêm khi cần distributed rooms, queue hoặc đa instance.
- Logging có `gameId`, `moveId`, `requestId`; metric cho move latency, socket reconnect, inconsistent state, AI timeout, room join.
- Backup DB, thử restore, migration rollback hoặc kế hoạch forward-fix trước beta.
- Frontend có chính sách lazy-load 3D (sau MVP) và hỗ trợ fallback WebGL.

## 11. Định hướng mở rộng 3D

**ĐÃ THỐNG NHẤT về tầm nhìn:** Sau MVP hỗ trợ 3D. **CHƯA CHỐT:** mỹ thuật cuối, ngân sách asset, chất lượng tối thiểu và giới hạn thiết bị.

Giai đoạn 3D v1: quân gỗ 3D, board 3D, camera cố định/góc nghiêng, click/raycast, animation dịch quân. 3D v2: skin/effect/lighting. 3D v3: chiến trường nhân vật hóa đòi hỏi pipeline rigging, animation, VFX lớn.

NFR của 3D: 2D luôn khả dụng; đổi renderer không restart trận; không truyền các trạng thái đồ họa qua server; model tối ưu theo thiết bị; hiệu năng **30 FPS mobile tầm trung/60 FPS desktop là mục tiêu thử nghiệm, không phải SLA cam kết**.
