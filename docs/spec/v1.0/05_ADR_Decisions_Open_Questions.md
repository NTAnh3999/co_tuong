# 05. DECISION REGISTER / ADR-LITE

Mục tiêu: phân biệt **định hướng đã được xác nhận** với **cấu hình đề xuất** và **điểm chưa quyết**. Nếu có thay đổi, tạo ADR mới hoặc tăng revision; không xóa lịch sử quyết định.

## 1. Decision register

| ID | Chủ đề | Quyết định hiện tại | Trạng thái | Tác động |
|---|---|---|---|---|
| ADR-001 | Kênh phát triển | Website đầu tiên; mobile-native mở rộng sau | ĐÃ THỐNG NHẤT | Next.js; responsive mobile web |
| ADR-002 | Product scope | Học cờ và chơi cùng bạn bè trong một trải nghiệm | ĐÃ THỐNG NHẤT | Core loop Play/Review/Learn/Rematch |
| ADR-003 | MVP visual | 2D đầu tiên; 3D sau MVP | ĐÃ THỐNG NHẤT | Multi-renderer boundary |
| ADR-004 | Web stack | Next.js + React + TypeScript | ĐÃ THỐNG NHẤT định hướng | Client chess board, server content |
| ADR-005 | Backend stack | NestJS + Socket.IO, PostgreSQL | ĐÃ THỐNG NHẤT định hướng | Server authoritative, realtime |
| ADR-006 | Game rules | Standalone pure TS package `xiangqi-core` | ĐÃ THỐNG NHẤT định hướng | Code reuse, automated fixtures |
| ADR-007 | Repository | pnpm + Turborepo monorepo | ĐỀ XUẤT | Shared packages & tooling |
| ADR-008 | Board renderer | React SVG + Motion ở MVP | ĐỀ XUẤT | Responsive 2D |
| ADR-009 | AI | Pikafish UCI, worker isolated | ĐỀ XUẤT có điều kiện | Review GPLv3, load limits |
| ADR-010 | Infra | VPS + Docker Compose MVP | ĐỀ XUẤT | Chi phí thấp, tự quản lý |
| ADR-011 | Auth | Guest-first; Supabase Auth cho user đăng ký | Guest-first ĐÃ THỐNG NHẤT; provider CHƯA CHỐT | Account, sessions, ACL |
| ADR-012 | 3D renderer | Three.js + React Three Fiber + GLB | ĐỀ XUẤT SAU MVP | Lazy load; WebGL fallback |
| ADR-013 | 3D art style | Truyền thống gỗ trước, nhân vật chiến thuật sau | ĐỀ XUẤT | Asset pipeline |
| ADR-014 | Tournament rules | RuleSet xử lý chiếu/đuổi/lặp, hòa và clock | CHƯA CHỐT (blocking) | Kết quả trận, QA |
| ADR-015 | Online competitive | MVP private-room casual, không ranked Elo | ĐỀ XUẤT | Chống gian lận ít phức tạp |
| ADR-016 | AI on device | Browser WASM research sau MVP | CHƯA CHỐT | Tải assets, năng lực máy, license |

## 2. Các câu hỏi phải chốt trước M1 hoặc release

### Bắt buộc trước M1

**Q-001 — Chọn RuleSet nào?** Bộ luật châu Á/WXF/luật riêng casual có công bố? Cần định nghĩa chiếu đuổi, trường hợp hai bên liên tục lặp, xử lý ván hòa và tie breaker.

**Q-002 — Convention FEN/UCI chính xác?** Chọn orientation và mapping canonical; test round-trip với ít nhất một adapter engine và một tập vị trí chuẩn.

**Q-003 — Clock policy:** 5/10/15 phút hay thêm increment? Tính thời gian ra sao khi tab background và người dùng disconnect? Ai có quyền pause? Chốt reason result.

### Bắt buộc trước multiplayer beta

**Q-004 — Session/guest ownership:** JWT hay signed cookie, expiry, cách giữ ghế sau reconnect và phục hồi qua tab khác.

**Q-005 — Retention/privacy:** Lịch sử guest được lưu bao lâu? Dữ liệu cá nhân, log và mức xóa theo yêu cầu.

**Q-006 — Rematch:** Giữ phòng cũ hay sinh game mới? Quy tắc đổi màu và reset clock.

### Trước AI public release

**Q-007 — Rà soát license:** Pikafish GPLv3, NNUE, asset, source obligations, phương án worker/WASM và phát hành.

**Q-008 — AI difficulty:** Cách tạo ba mức dễ/vừa/khó, benchmark thiết bị và concurrency/timeout.

### Trước 3D

**Q-009 — Phong cách:** quân gỗ truyền thống, tượng trưng hay tướng lĩnh nhân vật hóa? Mục tiêu thiết bị và ngân sách GLB/texture.

**Q-010 — Acceptance 3D:** fps & bundle thresholds dựa trên benchmark, support matrix WebGL, fallback 2D, reduced motion.

## 3. ADR chuẩn cần áp dụng khi thay đổi

```text
ADR-ID: ADR-0XX
Ngày: YYYY-MM-DD
Trạng thái: Proposed | Accepted | Superseded | Rejected
Vấn đề:
Bối cảnh:
Các lựa chọn:
Quyết định:
Lý do:
Hệ quả / trade-offs:
Phạm vi thay đổi code/UX/QA:
Tài liệu liên quan:
Người duyệt:
```

## 4. Quy tắc kiểm soát thay đổi

- Nếu phạm vi MVP thay đổi, phải sửa `01_PRD_Product.md`, cập nhật milestone trong `04_MVP_Roadmap_QA.md` và ghi ADR.
- Nếu GameState hoặc protocol thay đổi, đánh giá tương thích replay cũ, clients cũ, migration DB và 3D renderers.
- Nếu RuleSet thay đổi, tăng `ruleSetVersion`; mọi game lưu phiên bản đã áp dụng để kết quả lịch sử không đổi.
- Nếu đổi tech stack 3D, phải giữ nguyên contracts domain và kiểm thử chuyển đổi renderer.
- Khi thay đổi chính sách clock/disconnect, cập nhật game result reason và integration test.
