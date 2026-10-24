# ADR-022: Rematch

**ADR-ID:** ADR-022  
**Ngày:** 2026-10-24  
**Trạng thái:** Proposed  

## Vấn đề

Cần xác định cách xử lý khi hai người chơi muốn chơi lại sau khi trò chơi kết thúc: tạo phòng/trò chơi mới hay tái sử dụng phòng cũ, cách swap màu, và cách đặt lại đồng hồ.

## Bối cảnh

Sau một ván căng thẳng, người chơi thường muốn "đấu lại" ngay. Để tránh phải nhập lại mã phòng hoặc tạo từ đầu, cần một cơ chế rematch tích hợp. Tuy nhiên, quyết định kiến trúc này ảnh hưởng đến cách lưu trữ game history, room state và game relationship.

## Các lựa chọn

1. **Tái sử dụng phòng cũ:** Reset game state, swap colors, swap turns → đơn giản nhưng lịch sử game phức tạp.
2. **Tạo game mới trong cùng phòng:** Phòng chứa nhiều game, link chuỗi (game 1 → rematch → game 2) → rõ ràng, dễ quản lý lịch sử.
3. **Tạo phòng mới:** Yêu cầu người chơi tạo phòng/share link lại → không UX tốt.

## Quyết định

Chọn **tạo game mới trong cùng phòng** với swap colors.

### Chi tiết

**Flow rematch:**
1. Game kết thúc → hiển thị result dialog với nút "Đấu lại".
2. Một trong hai người chơi click "Đấu lại" → gửi rematch offer.
3. Đối thủ nhận offer, có 60 giây để chấp nhận hoặc từ chối (hoặc rời phòng = từ chối tự động).
4. Nếu cả hai chấp nhận → server tạo game mới với:
   - Cùng `roomId`, nhưng `gameId` mới.
   - Màu đổi: người chơi trước là Đỏ → lần này Đen; ngược lại.
   - Cùng `timeControl` như game cũ.
   - Đồng hồ reset: `clocks = {red: timeControl.base * 60, black: timeControl.base * 60}`.
   - Game status: `ACTIVE`, `turn: red`, `version: 0`.
5. Phòng vẫn tồn tại; lịch sử game bao gồm cả trò chơi cũ và trò chơi mới.

**Hết hạn offer:**
- Nếu offer không được trả lời trong 60 giây → tự động expire.
- Nếu một bên rời phòng trong lúc pending offer → offer bị hủy.

**Lịch sử:**
- Mỗi game có `gameId` riêng, `previousGameId` tùy chọn (để link chuỗi rematch).
- Game history view hiển thị chuỗi nếu người chơi muốn xem.

## Lý do

- **UX tốt:** Một click rematch, không cần chia sẻ link lại.
- **Rõ ràng:** Mỗi game độc lập về data nhưng liên kết qua lịch sử.
- **Công bằng:** Swap colors sau mỗi ván để cân bằng.
- **Quản lý:** Phòng là nơi lưu trữ, dễ theo dõi lịch sử.

## Hệ quả / trade-offs

**Lợi ích:**
- Rematch không cần setup lại.
- Lịch sử rõ ràng (có thể xem toàn bộ chuỗi).
- Swap color công bằng.

**Tradeoff:**
- Phòng có thể chứa nhiều game, phức tạp query.
- Nếu một bên rời, offer hủy tự động (không persistence offer qua session reconnect).

## Phạm vi thay đổi code/UX/QA

**Code:**
- Game model: Thêm `previousGameId: UUID | null`.
- Room model: Một room có thể chứa nhiều game (relation).
- Rematch service: Validate offer, tạo game mới, swap colors.
- WebSocket: `game:rematch-offer`, `game:rematch-accept`, `game:rematch-decline`.
- Database: Migration tạo rematch link.

**UX:**
- Game finished dialog: Nút "Đấu lại" prominent.
- Rematch dialog: "A đề nghị đấu lại. Chấp nhận?" với timer 60s.
- Room view: Hiển thị "Ván X, Y, ..." nếu có nhiều game.

**QA:**
- Test rematch flow: tạo game, kết thúc, offer, accept, game mới tạo, colors swap.
- Test offer expire: 60s timeout.
- Test reject: cả hai bên có thể decline.
- Test room persistence: phòng vẫn tồn tại sau N rematch.

## Tài liệu liên quan

- `docs/spec/v1.0/05_ADR_Decisions_Open_Questions.md` — Q-006
- `docs/spec/v1.0/03_Technical_Architecture.md` — section 6

## Người duyệt

Chưa duyệt — chờ xác nhận trước M7
