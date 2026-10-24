# ADR-018: Coordinates, FEN, UCI

**ADR-ID:** ADR-018  
**Ngày:** 2026-10-24  
**Trạng thái:** Proposed  

## Vấn đề

Cần quyết định quy ước chính xác cho tọa độ bàn cờ, định dạng FEN và ký hiệu nước đi để đảm bảo khả năng tương thích với Pikafish engine và các adapter UCI.

## Bối cảnh

Xiangqi có bàn cờ 9 cột × 10 hàng. Hiện tại không có một chuẩn bộ ký hiệu toàn cầu được chấp nhận rộng rãi; các engine cục bộ sử dụng các quy ước khác nhau. Pikafish (engine mã nguồn mở phổ biến nhất cho Xiangqi) tuân theo chuẩn UCCI (Universal Chinese Chess Interface) với một quy ước cụ thể cho tọa độ và FEN.

Chọn quy ước sai sẽ dẫn đến lỗi silent khi phối hợp với engine, khó bảo trì và kiểm thử chéo.

## Các lựa chọn

1. **Quy ước tùy chỉnh + lớp dịch:** Định nghĩa một quy ước nội bộ riêng và dịch sang UCCI khi gọi Pikafish.
2. **UCCI/Pikafish trực tiếp (không dịch):** Áp dụng chuẩn UCCI của Pikafish trực tiếp, không có lớp dịch.
3. **Hỗ trợ đa quy ước:** Hỗ trợ cả UCCI và các quy ước khác, phức tạp.

## Quyết định

Chọn **UCCI/Pikafish trực tiếp**. Không có lớp dịch.

### Chi tiết quy ước

**Tọa độ:**
- Cột (file): `a` đến `i` (từ trái sang phải từ quan điểm của Đỏ)
- Hàng (rank): `0` đến `9` (từ dưới lên trên; rank 0 = dòng quân của Đỏ, rank 9 = dòng quân của Đen)
- Mảng index: `index = rank * 9 + file`
- Xoay bàn cờ trực quan không bao giờ thay đổi tọa độ logic.

**FEN:**
- Các hàng được phát ra từ rank 9 xuống rank 0 (từ trên xuống dưới như in tiêu chuẩn)
- Các chữ cái quân: `K A B N R C P` (chữ in hoa = Đỏ, in thường = Đen)
  - `K/k` = Tướng (General)
  - `A/a` = Sĩ (Advisor)
  - `B/b` = Tượng (Elephant)
  - `N/n` = Mã (Horse)
  - `R/r` = Xe (Chariot)
  - `C/c` = Pháo (Cannon)
  - `P/p` = Tốt (Pawn/Soldier)
- Trường bên đi: `w` (Đỏ) hoặc `b` (Đen)
- Trường 3-4: luôn là `- -` (không có castling hoặc en passant trong Xiangqi)
- Halfmove clock: ply kể từ lần cuối cùng ăn quân (phục vụ quy tắc move limit)
- Fullmove number: số nước cờ đầy đủ

**Vị trí khởi đầu FEN:**
```
rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1
```

**Nước đi:**
- Ký hiệu tọa độ 4 ký tự (source + destination), ví dụ: `h2e2`
- Giống hệt định dạng nước của Pikafish.

## Lý do

- **Khả năng tương thích:** Pikafish đã hỗ trợ UCCI; không cần dịch, giảm lỗi.
- **Xác minh:** Perft test (`go perft 4` từ vị trí khởi đầu) với Pikafish thực tế trả về `3290240`, giá trị tham chiếu chính xác cho quy ước này — xác nhận không cần lớp dịch.
- **Tính bảo trì:** Quy ước đơn thống nhất dễ hiểu và debug.
- **Round-trip testing:** Có thể kiểm thử FEN ↔ Position và nước đi ↔ move với Pikafish trực tiếp.

## Hệ quả / trade-offs

**Lợi ích:**
- Loại bỏ lớp dịch = ít mã, ít lỗi.
- Hạn chế số lượng điểm lỗi có thể xảy ra khi tương tác engine.

**Tradeoff:**
- Xiangqi Core phải tuân thủ chính xác UCCI; không thể thay đổi quy ước nội bộ mà không phá vỡ tương thích.
- Nhà phát triển phải quen với UCCI và các hàng bình (rank) từ 0–9 (khác cách viết truyền thống một số nơi dùng 1–10).

## Phạm vi thay đổi code/UX/QA

**Code:**
- Xiangqi Core: Tất cả tọa độ, FEN encode/decode, và nước đi phải tuân UCCI.
- Move notation: Biểu diễn nước chỉ dùng tọa độ 4 ký tự, không algebraic notation.
- Tests: Round-trip tests FEN ↔ Position, move encoding/decoding.

**UX:**
- Hiển thị nước đi cho người chơi: có thể dùng tọa độ (ví dụ: "h2→e2") hoặc tên quân + đích (ví dụ: "Xe đi e2").

**QA:**
- Perft test từ vị trí khởi đầu phải trả về 3290240 cho `go perft 4`.
- Integration test round-trip: FEN → Xiangqi Core → FEN phải giống nhau.
- Integration test move: move string → Xiangqi Core applyMove → check Pikafish.

## Tài liệu liên quan

- `docs/spec/v1.0/05_ADR_Decisions_Open_Questions.md` — Q-002
- `docs/spec/v1.0/03_Technical_Architecture.md` — section 4.1
- Pikafish UCI specification (UCCI)

## Người duyệt

Chưa duyệt — chờ xác nhận trước M7
