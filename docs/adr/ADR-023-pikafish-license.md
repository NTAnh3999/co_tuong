# ADR-023: Pikafish GPLv3 License Handling

**ADR-ID:** ADR-023  
**Ngày:** 2026-10-24  
**Trạng thái:** Proposed  

## Vấn đề

Pikafish là một engine Xiangqi mã nguồn mở (GPLv3), cần đảm bảo tuân thủ license khi sử dụng trong sản phẩm. Cần quyết định vị trí triển khai (server vs. browser), cách phân phối, và làm sao để công bố nguồn gốc.

## Bối cảnh

GPLv3 yêu cầu:
- Công bố source code của chương trình nếu phân phối binary.
- Công bố source code của mọi derivative.
- Phân phối source code hoặc liên kết đến nó.

Pikafish là một binary UCI engine, không phải thư viện chia sẻ. Nếu chạy server-side, dễ tuân thủ. Nếu chạy client-side (WASM), phức tạp hơn.

## Các lựa chọn

1. **Server-side binary:** Chạy Pikafish trên server, gọi qua API → tuân thủ dễ, nhưng phải lưu trữ binary.
2. **Client-side WASM:** Compile Pikafish thành WASM, load browser → tương tác nhanh, nhưng phức tạp phân phối, binary trong asset.
3. **Hybrid:** Server có option, client không có (MVP server-side, V2+ client-side nếu muốn).

## Quyết định

Chọn **server-side binary, không WASM ở MVP**.

### Chi tiết

**Triển khai:**
- Pikafish chạy như một **unmodified upstream binary**, được build từ một specific pinned release tag (ví dụ: `v1.0.0`).
- Chạy trong **container Docker riêng** hoặc worker process độc lập, **tách biệt khỏi NestJS main process**.
- Giao tiếp qua **UCI protocol** (standard text interface) thông qua worker service, không embedded.
- **Không bao giờ ship binary hoặc code Pikafish đến browser** (no WASM, no asset).

**Tuân thủ:**
- Tạo **`/licenses` page** trong ứng dụng web danh sách tất cả thư viện bên thứ ba.
- Page `/licenses/pikafish` hoặc link thẳng trong `/licenses`:
  - Tên: "Pikafish"
  - License: "GPLv3"
  - Link đến **source code tag chính xác** được sử dụng (ví dụ: `https://github.com/Kimochiiii/Pikafish/releases/tag/v1.0.0`)
  - Reproduce lại **GPLv3 notice text** đầy đủ.
- **Docs/source-disclosure.md:** Danh sách tất cả source code external được sử dụng, kèm link.

**Tương lai (V2+):**
- Nếu thêm client-side AI later, phải:
  - Eval WASM port của Pikafish (nếu tồn tại).
  - Hoặc compile Pikafish thành WASM, đảm bảo binary có thể download, source visible.
  - Hoặc vẫn dùng server-side, chấp nhận latency.
  - Cập nhật legal review.

## Lý do

- **Compliance:** Server-side binary không phân phối, dễ comply GPLv3.
- **Simplicity:** Không cần maintain WASM port, không cần compile chain phức tạp.
- **Source transparency:** Upstream binary, không modification → clear lineage.
- **Deferral:** Client-side là future work, có thể tái đánh giá sau M5.

## Hệ quả / trade-offs

**Lợi ích:**
- GPLv3 compliance dễ.
- Không ship binary, không asset phình.
- Upstream pin → reproducible builds.

**Tradeoff:**
- AI không khả dụng offline (client cần call server).
- Latency gọi API engine.
- MVP không có offline mode cho AI (simplification).

## Ghi chú quan trọng

**ADR này cấu trúc development work ở M5 nhưng KHÔNG unblock public release.** 

Trước khi AI feature đi vào **public-release gate (M7)**, cần:
1. **Legal review** từ người counsel pháp lý để xác nhận tuân thủ GPLv3.
2. **User sign-off:** Xác nhận người dùng biết limitation (no offline AI) và license obligation.

Quyết định triển khai (server-side vs. WASM) có thể thay đổi trước M7 nếu legal advice khác.

## Phạm vi thay đổi code/UX/QA

**Code:**
- Pikafish worker service: Wrapper UCI.
- Docker Compose: Pikafish container config.
- `/api/v1/engine/*` endpoints: UCI move request → Pikafish → response.

**UX:**
- `/licenses` page: Liệt kê Pikafish + GPLv3 notice.
- Game UI: Disclaimer nếu AI feature (optional): "AI sử dụng Pikafish (GPLv3)."

**QA:**
- Verify endpoint response time acceptable.
- Verify license page render, link hoạt động.

**Regulatory:**
- Legal review before M7 public release.
- User acknowledgment của limitations.

## Tài liệu liên quan

- `docs/spec/v1.0/05_ADR_Decisions_Open_Questions.md` — Q-007
- Pikafish GitHub: https://github.com/Kimochiiii/Pikafish
- GPLv3 License text: https://www.gnu.org/licenses/gpl-3.0.html

## Người duyệt

Chưa duyệt — chờ xác nhận pháp lý trước M7
