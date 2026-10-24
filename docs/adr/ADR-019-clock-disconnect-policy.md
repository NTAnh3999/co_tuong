# ADR-019: Clock và chính sách mất kết nối

**ADR-ID:** ADR-019  
**Ngày:** 2026-10-24  
**Trạng thái:** Proposed  

## Vấn đề

Cần xác định chính sách quản lý thời gian cho các trò chơi online, bao gồm các preset thời gian, cách tính toán giờ, và cách xử lý khi kết nối bị gián đoạn hoặc người chơi mất kết nối.

## Bối cảnh

Thời gian là yếu tố quan trọng trong trò chơi cạnh tranh. Xiangqi thường dùng các preset như 5 phút, 10 phút, 15 phút với tăng thêm (increment). 

Mất kết nối có thể xảy ra bất kỳ lúc nào trong một trò chơi; hệ thống phải xử lý một cách công bằng và rõ ràng: liệu đồng hồ có tiếp tục chạy hay không, khi nào một người chơi được coi là "bỏ cuộc" (abandonment), và làm sao để client và server giữ đồng bộ thời gian.

## Các lựa chọn

1. **Khong hỗ trợ giới hạn thời gian:** Chỉ cho phép các trò chơi không giới hạn. Quá đơn giản cho cạnh tranh nhưng dễ triển khai.
2. **Đồng hồ sever-side hoàn toàn, tạm dừng khi mất kết nối:** Bảo vệ tính công bằng nhưng khó giao tiếp.
3. **Đồng hồ server-authoritative, không tạm dừng, chính sách abandonment rõ ràng:** Công bằng, rõ ràng, dễ hiểu.

## Quyết định

Chọn **server-authoritative + không tạm dừng + chính sách abandonment rõ ràng**.

### Chi tiết

**Các preset thời gian:**
- 5+3 (5 phút + 3 giây increment)
- **10+5 (10 phút + 5 giây increment) — mặc định**
- 15+10 (15 phút + 10 giây increment)
- Các trò chơi local và với AI không giới hạn thời gian.

**Kích hoạt đồng hồ:**
- Một trò chơi trở thành ACTIVE khi cả hai người chơi đã ngồi vào (seats được lấp).
- Nước đầu tiên của mỗi bên là "tự do thời gian" nhưng phải gửi trong vòng 60 giây, nếu không trò chơi kết thúc với reason `ABORTED`.
- Sau đó, mỗi bên chỉ bắt đầu countdown đồng hồ khi đến lượt của mình (từ nước đi thứ 2 trở đi).

**Tính toán thời gian:**
- Server sử dụng server receipt time duy nhất (không có bù đắp latency của client).
- Khi một nước đi được chấp nhận:
  ```
  remaining[mover] -= (serverNow - turnStartedAt)
  ```
- Nếu `remaining[mover]` sẽ ≤ 0 → nước đi bị từ chối, reason `TIME_EXPIRED`, trò chơi kết thúc với reason `TIMEOUT`.
- Ngược lại, increment được cộng vào: `remaining[mover] += increment`.
- `activeColor` chuyển sang bên kia.

**Đảm bảo không double-finish:**
- Server-side timer kết hợp với lazy check trên mỗi nước đi/sync.
- Trò chơi được finish chính xác một lần thông qua conditional database update:
  ```sql
  WHERE status='ACTIVE' AND gameVersion=?
  ```
- Điều này ngăn race condition giữa timeout trigger và move arriving cùng lúc.

**Mất kết nối:**
- Đồng hồ tiếp tục chạy; không có tạm dừng.
- Nếu người chơi cần di chuyển nhưng đã mất socket ≥ 60 giây → đối thủ có thể yêu cầu chiến thắng (reason `ABANDONMENT`) hoặc chọn tiếp tục chờ.
- Client re-sync toàn bộ game snapshot khi reconnect và khi tab trở nên visible lại (sự kiện `visibilitychange`).
- Đồng hồ hiển thị sử dụng server-time offset, không chỉ dựa vào wall-clock local.

**Đề nghị hòa:**
- Chỉ một đề nghị hòa có thể pending cùng một lúc.
- Đề nghị bị xóa khi đối thủ đi quân hoặc từ chối.
- Sau khi từ chối, cùng một người chơi phải chờ 10 ply trước khi đề nghị lại.

## Lý do

- **Công bằng:** Server-authoritative và không tạm dừng đảm bảo không ai có lợi thế từ mất kết nối.
- **Rõ ràng:** Chính sách 60 giây abandonment dễ hiểu và cho phép đối thủ có quyền chọn.
- **Tính khả dụng:** Client có thể reconnect và tiếp tục chơi mà không mất kết quả.
- **Race-free:** Conditional update logic ngăn các trường hợp vô vị.

## Hệ quả / trade-offs

**Lợi ích:**
- Hệ thống hoạt động công bằng và dự đoán được.
- Reconnect không phức tạp.

**Tradeoff:**
- Người chơi mất kết nối sẽ mất thời gian (không tạm dừng); cần báo rõ trong UI.
- Không hỗ trợ tạm dừng thủ công (simplification cho MVP).
- 60 giây abandonment threshold — nếu một bên offline nhưng vẫn muốn chơi, đối thủ phải đợi hoặc claim win.

## Phạm vi thay đổi code/UX/QA

**Code:**
- GameState: Thêm fields `clocks: {red: number, black: number}`, `activeColor`, `turnStartedAt`, `timeControl: {base, increment}`, `lastMoveAt`.
- Server Clock Service: Quản lý startup, tính toán timeout, trigger finish.
- WebSocket handlers: `game:move` validation bao gồm kiểm tra thời gian.
- Database: Migration để lưu clock data, `ruleSetVersion`, game finish conditions.

**UX:**
- Game board: Hiển thị đồng hồ cho cả hai người chơi, tính từ server-time offset.
- Opponent offline indicator: Hiển thị "Đối thủ offline — chờ 60 giây để yêu cầu thắng."
- Time expired: Thông báo rõ ràng "Hết giờ — bạn thua."
- Reconnect: Modal "Đang khôi phục kết nối..." với retry button.

**QA:**
- Unit test: Clock countdown, increment, timeout detection.
- Integration test: Move rejection khi hết giờ.
- Scenario test: Disconnect → reconnect (40s, 70s), concurrent move + timeout.
- Load test: Multiple games, clock accuracy, no race conditions.

## Tài liệu liên quan

- `docs/spec/v1.0/05_ADR_Decisions_Open_Questions.md` — Q-003
- `docs/spec/v1.0/03_Technical_Architecture.md` — section 6.3

## Người duyệt

Chưa duyệt — chờ xác nhận trước M7
