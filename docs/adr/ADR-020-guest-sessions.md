# ADR-020: Guest Sessions

**ADR-ID:** ADR-020  
**Ngày:** 2026-10-24  
**Trạng thái:** Proposed  

## Vấn đề

Cần xác định cách quản lý các phiên khách (guest sessions) cho phép người dùng chơi mà không đăng ký tài khoản, đảm bảo tính bảo mật, tính nhất quán ghế chơi trên các trò chơi khác nhau và tab khác nhau, cũng như xử lý cookie.

## Bối cảnh

MVP ưu tiên guest-first: người chơi có thể tham gia ngay mà không cần đăng ký. Tuy nhiên, cần theo dõi "ai" đó (ít nhất để giữ ghế của họ trong một phòng) mà không cần username/password.

Một phiên khách có thể bị mất (hết hạn cookie, xóa dữ liệu) hoặc khôi phục trên tab khác. Quyết định này ảnh hưởng đến cách server lưu trữ và xác thực.

## Các lựa chọn

1. **JWT trong localStorage:** Client-side validation, stateless server — dễ scale nhưng khó xác thực khi logout.
2. **Signed cookie + server-side session store:** Truyền thống, phức tạp, yêu cầu lưu trữ session server.
3. **Opaque token (random 32-byte) + SHA-256 hash server-side + httpOnly cookie:** Bảo mật cao, stateless client, server lưu hash duy nhất.

## Quyết định

Chọn **opaque 32-byte token + SHA-256 hash server-side + httpOnly cookie**.

### Chi tiết

**Tạo phiên:**
- Khi khách tham gia lần đầu, server tạo một token ngẫu nhiên 32 byte (256 bit).
- Server lưu `SHA-256(token)` trong database (không lưu token thô).
- Server gửi token thô cho client trong httpOnly cookie: `Set-Cookie: sessionToken=<token>; HttpOnly; Secure (in prod); SameSite=Lax; Max-Age=2592000` (30 ngày).

**Xác thực:**
- Client tự động gửi cookie trong mỗi request.
- Server nhận cookie, tính SHA-256, tra cứu trong database.
- Nếu tìm thấy và còn hạn → phiên hợp lệ; server nhận userId của khách.

**Chân dung (game seats):**
- Game seats luôn liên kết với `userId` nội bộ, không bao giờ với `socket.id` (socket.id có thể đổi qua reconnect).
- Cùng cookie được sử dụng trong nhiều tab → cùng một người chơi, cùng một userId, có thể tham gia vào ghế giống nhau hoặc ghế khác nhau trong các trò chơi khác nhau.
- Mất cookie (xóa dữ liệu trình duyệt, cookie hết hạn) = mất ghế (tradeoff được chấp nhận cho MVP).

**Hạn thêm:**
- 30 ngày sliding expiry: mỗi lần sử dụng, expiry được gia hạn 30 ngày tiếp theo.
- Nếu không hoạt động ≥ 30 ngày → hết hạn.

**Bảo mật:**
- httpOnly → JavaScript không thể truy cập, bảo vệ XSS.
- Secure (production) → chỉ được gửi qua HTTPS.
- SameSite=Lax → giảm CSRF.
- SHA-256 hash → token thô không lưu server, giảm rủi ro nếu database bị phơi bày.

## Lý do

- **Bảo mật:** httpOnly + hash server-side là best practice cho session tokens.
- **Đơn giản:** Opaque token không cần decode/validation client-side, không có clock skew.
- **Stateless client:** Client không biết gì, chỉ gửi cookie; server là nguồn sự thật.
- **Khôi phục qua tab:** Cùng cookie qua tab → cùng userId → có thể quay lại.
- **Đơn giản triển khai:** Không cần Redis session store hoặc JWT secret rotation.

## Hệ quả / trade-offs

**Lợi ích:**
- Bảo mật cao, không có XSS risk từ token.
- Dễ logout (server xóa hash, cookie tự hết hạn).
- Dễ triển khai, không phức tạp.

**Tradeoff:**
- Mất cookie = mất phiên (không có phiên dài hạn gắn với email hay username khác).
- Không hỗ trợ multi-device nếu không có tài khoản (nếu V2 thêm login, có thể link multi-session).
- Yêu cầu database write khi tạo/sử dụng phiên (hiệu suất có thể tối ưu hóa bằng cache).

## Phạm vi thay đổi code/UX/QA

**Code:**
- Auth Service: Tạo/validate session token, hash SHA-256.
- Middleware: Kiểm tra cookie, set `userId` trên request.
- Database: Schema `guest_sessions` {`id`, `tokenHash`, `userId`, `createdAt`, `expiresAt`}.
- Cookie handling: Set/clear cookie đúng.

**UX:**
- Landing/home: Nút "Chơi ngay" → tạo guest session nếu chưa có → chuyển hướng `/play`.
- Logout: Nút logout xóa phiên server-side (optional cho MVP, khách thường chỉ đóng tab).

**QA:**
- Test cookie set/clear.
- Test multi-tab: cùng session qua tab, seats nhất quán.
- Test expiry: hạn 30 ngày sliding, hết hạn → 403.
- Test reconnect: socket.id thay đổi, userId từ cookie giữ nguyên → seat bảo tồn.

## Tài liệu liên quan

- `docs/spec/v1.0/05_ADR_Decisions_Open_Questions.md` — Q-004
- `docs/spec/v1.0/03_Technical_Architecture.md` — section 1, auth

## Người duyệt

Chưa duyệt — chờ xác nhận trước M7
