# 04. MVP ROADMAP, ACCEPTANCE & QA

## 1. Định nghĩa MVP beta

Mục tiêu beta: người dùng trên web desktop/mobile có thể học luật, giải thế cờ, đánh AI, tự chơi local, tạo phòng riêng và đánh với bạn bè; game state online đúng luật, an toàn khi reconnect; lưu và xem lại ván.

Không phải mục tiêu beta: đồ họa 3D, thương mại hóa, ranked Elo, giải đấu, số người chơi lớn, AI Coach LLM, PWA offline hoàn chỉnh.

## 2. Milestones và phụ thuộc

| Mốc | Nội dung | Phụ thuộc | Exit criteria |
|---|---|---|---|
| M0 | Chốt `RuleSet` MVP, conventions, fixtures, UX low-fi, môi trường build | — | ADR luật ký duyệt, repo dựng xong |
| M1 | TypeScript `xiangqi-core` | M0 | 7 quân, legal/check/result, FEN, replay, unit tests đạt |
| M2 | 2D Board + LocalGameController + responsive | M1 | Hai người cùng browser chơi trọn trận; touch và mouse |
| M3 | DB schema, NestJS API, guest, lưu game | M1 | Tạo/lưu/khôi phục game, access control, migration |
| M4 | Socket.IO private rooms + clock + reconnect | M2, M3 | Hai máy chơi được; version, idempotency và recovery test |
| M5 | Pikafish adapter/worker + AI 3 cấp độ | M1, M3 | AI ra nước hợp lệ, giới hạn tài nguyên, timeout handled |
| M6 | Academy/Puzzle + Replay/history | M1, M2, M3 | Hoàn thành bài, replay đúng, history accessible |
| M7 | QA hardening + release beta | M0–M6 | Regression/E2E/security/ops checklist PASS |
| M8 | Post-MVP review + 3D technical spike | M7 | Quyết định 3D v1, benchmark/fallback và kế hoạch asset |

**Ước tính từng được bàn:** 4 sprint × 2 tuần (~8 tuần) chỉ là dự kiến tham khảo cho một MVP gọn khi tái sử dụng thư viện hiện có; không phải timeline cam kết. Khối lượng ruleset phức tạp, realtime và thiết kế nội dung có thể làm tăng thời gian đáng kể.

## 3. Detailed acceptance criteria

| ID | Kiểm thử nghiệm thu | Điều kiện đạt |
|---|---|---|
| CORE-01 | Khởi tạo bàn cờ | 32 quân, 90 điểm, quân/turn chuẩn |
| CORE-02 | Nước đi mỗi quân | Bộ fixtures PASS, gồm giới hạn phạm vi và cản quân |
| CORE-03 | An toàn Tướng | Cấm nước tự chiếu, cấm lộ mặt Tướng |
| CORE-04 | Kết quả trận | Chiếu bí/hết nước/đầu hàng/hòa/hết giờ đúng RuleSet |
| CORE-05 | Lặp và chiếu/đuổi | Fixtures theo RuleSet công bố; vấn đề chưa chốt phải được giải quyết trước release |
| CORE-06 | FEN/notation | Round trip position chuẩn, match adapter engine đã test |
| LOCAL-01 | Hai người cùng máy | Chơi trọn trận, chọn/ăn quân, undo chỉ local |
| WEB-01 | Tương tác responsive | Browser mobile & desktop thao tác tap/click chính xác |
| ROOM-01 | Mời bạn | Người A chia sẻ link; B guest tham gia phòng hợp lệ |
| ROOM-02 | Quyền phòng | Người thứ ba không thể đi quân hoặc giả danh ghế khác |
| SYNC-01 | Concurrent move | Không thể chấp nhận hai nước cho cùng `expectedVersion` |
| SYNC-02 | Duplicate move | Gửi lại `moveId` không ghi trùng database |
| SYNC-03 | Reconnect | Sau đồng bộ lại, cả 2 thấy cùng state/version/clock |
| CLOCK-01 | Hết giờ | Server kết thúc một lần; không client tự chốt thắng |
| AI-01 | Move validity | Engine trả về nước hợp lệ, timeout có fallback hợp lý |
| AI-02 | Capacity | Worker concurrency được giới hạn/có metrics |
| LEARN-01 | Puzzle | Đúng/sai/gợi ý/reset hoạt động theo solution lines |
| REPLAY-01 | Replay | Đi tới bất kỳ ply tái tạo đúng trạng thái và kết quả |
| DATA-01 | Khôi phục | Restore từ initial + moves/snapshots đúng, kể cả restart |
| OPS-01 | Basic operations | HTTPS, logs, backup, healthcheck và xử lý migration |

## 4. Chiến lược kiểm thử

### 4.1. Unit tests (Vitest)

- 7 loại quân, các trường hợp bị cản, ăn/không ăn, tự chiếu, lộ mặt Tướng, checkmate/stalemate Xiangqi.
- Generative/property tests: sau bất kỳ nước hợp lệ, board giữ đúng số quân hợp lệ, không bị duplicate quân, turn đảo và FEN round-trip.
- Scenario fixtures cho repeated check/chase theo bộ luật đã chọn; không thay bằng arbitrary 3-fold check.
- History replay và undo không mutate input.

### 4.2. Integration tests (NestJS + DB)

- Tạo phòng và tham gia có phân quyền, multi-tab và guest token.
- `moveId` idempotency, transaction rollback khi version conflict, clock server.
- Lỗi engine/worker không phá vỡ online game state.
- API schema và backward compatibility; database migration.

### 4.3. E2E (Playwright)

- Hai browser contexts chơi online.
- Browser refresh khi đang đến lượt; reconnect khi đang chờ lượt.
- Test viewport desktop/mobile và thao tác click/tap.
- Bài học/puzzle/replay; API lỗi; kết thúc và rematch.
- Script mô phỏng latency/network drop; xung đột request.

### 4.4. Performance/operation

- Đo room join p95, move accept p95, số socket concurrent, CPU AI worker, memory growth và reconnect success (baseline đo thực tế; không tự đặt SLA).
- Smoke test với ít nhất hai thiết bị có trình duyệt khác nhau trước beta.
- Cơ chế log/alert cho `version_conflict`, `double_finish`, `invalid_move_accepted` (mức nghiêm trọng cao).

## 5. Rủi ro và biện pháp

| Rủi ro | Mức | Ứng phó |
|---|---|---|
| Luật chiếu đuổi/lặp rất phức tạp | Cao | Chốt RuleSet, fixtures từ nguồn tin cậy, review độc lập |
| Đồng bộ ván/clock sai sau reconnect | Cao | Server authority + gameVersion + snapshot + test drop |
| CPU Pikafish quá tải | Trung–cao | Isolated worker, concurrency cap, timeout |
| GPLv3 Pikafish tác động đóng gói | Trung–cao | Review license trước khi phân phối, ghi trong ADR |
| Guest impersonation, room hijack | Cao | Scoped tokens, authorization, rate limits, secure cookies |
| Sản xuất nội dung học thiếu/không chính xác | Trung | Editorial review, puzzle solution test, content version |
| Web mobile thao tác khó | Trung | Tap-to-tap, thiết kế responsive, mobile QA |
| 3D sau này làm đổi domain logic | Trung | Renderer boundary từ M2, thử nghiệm kỹ thuật sau MVP |
| Timeline 8 tuần quá lạc quan | Trung | Timebox từng mốc, không mở rộng P0 tùy tiện |

## 6. Release checklist beta

- [ ] ADR RuleSet được phê duyệt và công khai diễn giải ở mức phù hợp.
- [ ] Core tests, API tests, Playwright E2E qua pipeline CI.
- [ ] Chạy thử online trên hai mạng/thiết bị, bao gồm reconnect và timeout.
- [ ] Phòng riêng guest không thể bị chiếm ghế hoặc giả mạo nước đi.
- [ ] Có giới hạn resource worker, xử lý lỗi và logs.
- [ ] Backup đã thử restore, database migrations có kế hoạch xử lý sự cố.
- [ ] Privacy/terms/license phù hợp nội dung và engine phân phối.
- [ ] Bàn cờ mobile có thao tác tap-to-tap và không bị tràn giao diện.
- [ ] Bài học/puzzle có lời giải được kiểm chứng.
- [ ] Được xác nhận không cung cấp gợi ý AI bất hợp lệ trong online cạnh tranh.

## 7. Lộ trình sau MVP

- **Release 1.1:** engine review, đánh dấu sai lầm, thử lại từ nước đi sai.
- **Release 1.2:** bạn bè, thống kê và Elo (sau khi chốt ruleset tournament); puzzles theo điểm yếu.
- **3D Spike:** dựng board GLB, raycasting, thử một model quân, đo tải/lỗi fallback.
- **3D v1:** bộ bàn cờ truyền thống, skin tùy chọn, chuyển đổi 2D/3D giữ nguyên trạng thái game.
- **3D v2+:** hiệu ứng, model nhân vật hóa, animation, commerce/community nếu phù hợp.
