# ADR-017: RuleSet `xq-casual-1.0.0`

**ADR-ID:** ADR-017  
**Ngày:** 2026-10-24  
**Trạng thái:** Proposed  

## Vấn đề

Cần lựa chọn một bộ luật cờ Tướng rõ ràng cho MVP, bao gồm xác định cách xử lý các tình huống kết thúc trò chơi: chiếu tướng, lặp thế, đuổi quân, hòa và kết quả theo giờ.

## Bối cảnh

Dự án beta casual không yêu cầu tuân theo luật thi đấu chính thức AXF (Asian Xiangqi Federation), nhưng phải công bố rõ quy tắc áp dụng. Xiangqi Core yêu cầu một adjudicator cắn cơm được để xử lý tất cả kết quả trận đấu. Các tình huống lặp thế, chiếu liên tục và đuổi quân là các lĩnh vực phức tạp mà khác rõ với cờ vua quốc tế.

Baseline spec `01_PRD_Product.md` section 5 ("Ranh giới chất lượng") cho phép shipping một bộ luật casual được công bố rõ ràng, miễn là không quảng cáo là luật thi đấu chính thức.

## Các lựa chọn

1. **Tuân thủ luật AXF đầy đủ:** Phức tạp, bao gồm phát hiện đuổi quân (truy đuổi liên tục), cần đầu tư development cao.
2. **RuleSet casual giản lược:** Công bố rõ ràng là luật beta, đơn giản hóa một số tình huống phức tạp, cho phép phát triển nhanh và có thể nâng cấp sau.
3. **Không có luật kết thúc:** Chỉ hỗ trợ đầu hàng thủ công, không có kết quả tự động — không khả thi cho online.

## Quyết định

Chọn **RuleSet casual giản lược** với tên `xq-casual-1.0.0`. Thứ tự xử lý adjudication sau mỗi nước đi:

1. **Không có nước đi hợp lệ:** Bên cần đi thua ngay lập tức. Nếu bên đó đang bị chiếu → reason `CHECKMATE`; ngược lại → reason `STALEMATE` (trong Xiangqi, stalemate cũng là thua, khác cờ vua quốc tế).

2. **Lặp thế:** Position key được định nghĩa = board + side-to-move (hai trường đầu tiên của FEN). Khi một position key xuất hiện lần thứ 3, kiểm tra các ply giữa lần xuất hiện thứ 1 và thứ 3: nếu chỉ một bên đã chiếu trên mỗi nước của chính mình trong khoảng đó → bên đó thua (reason `PERPETUAL_CHECK`); ngược lại → hòa (reason `REPETITION`).

3. **Giới hạn nước không ăn:** 120 ply (60 nước cờ đầy đủ) mà không ăn quân → hòa, reason `MOVE_LIMIT`. Quy tắc này khớp với rule60 counter của Pikafish, nên trường halfmove-clock trong FEN có ý nghĩa giống nhau ở cả hai hệ thống.

4. **Material không đủ:** Nếu cả hai bên đều không còn Xe, Mã, Pháo, hay Tốt → hòa, reason `INSUFFICIENT_MATERIAL`.

5. **Sự kiện kết thúc từ bên ngoài:** `RESIGNATION`, `DRAW_AGREEMENT`, `TIMEOUT` (hoặc `TIMEOUT_INSUFFICIENT_MATERIAL` nếu đối thủ không có material tấn công), `ABANDONMENT`, `ABORTED` (không có kết quả).

## Lý do

- **Tính hiệu quả:** Giản lược cho phép ship MVP vào M1 mà không chặn ở phát hiện đuổi quân phức tạp.
- **Công bố rõ ràng:** Disclaimer trên `/rules` và trong kết quả trận báo "Luật giản lược (casual) — không phải luật thi đấu chính thức AXF."
- **Khả năng nâng cấp:** Adjudicator được thiết kế pluggable; sau này có thể thêm RuleSet `axf-*` với phát hiện đuổi đầy đủ mà không phá vỡ trò chơi cũ.
- **Reproducibility:** Mỗi trò chơi lưu trường `ruleSetVersion` để các trận cũ vẫn có thể tái hiện chính xác nếu luật thay đổi sau này.

## Hệ quả / trade-offs

**Lợi ích:**
- Đơn giản hóa core logic, dễ kiểm thử.
- Khóa được M1 mà không cần đầu tư lớn vào phát hiện đuổi.
- Công khai giới hạn của MVP.

**Tradeoff:**
- Một số tình huống mà luật chính thức xử lý khác sẽ được giải quyết bằng cách khác (ví dụ: đuổi quân dài có thể kết thúc là hòa repetition thay vì perpetual check).
- Người chơi cạnh tranh có thể kỳ vọng luật AXF đầy đủ — phải báo rõ ở UI.

## Phạm vi thay đổi code/UX/QA

**Code:**
- Xiangqi Core: Implement adjudicator với 5 quy tắc kết thúc trên.
- GameState: Thêm trường `ruleSetVersion: string`.
- GameResult: Reason enum gồm các giá trị trên.

**UX:**
- Trang `/rules`: Thêm disclaimer "Luật giản lược (casual) — không phải luật thi đấu chính thức AXF."
- Kết quả trò chơi: Hiển thị reason để người chơi hiểu vì sao kết thúc.

**QA:**
- Unit tests cho từng quy tắc adjudication (stalemate, checkmate, repetition, move limit, insufficient material).
- Integration tests cho các scenario lặp thế phức tạp.

## Tài liệu liên quan

- `docs/spec/v1.0/05_ADR_Decisions_Open_Questions.md` — Q-001
- `docs/spec/v1.0/03_Technical_Architecture.md` — section 4.4
- `docs/spec/v1.0/01_PRD_Product.md` — section 5 (Ranh giới chất lượng)

## Người duyệt

Chưa duyệt — chờ xác nhận trước M7
