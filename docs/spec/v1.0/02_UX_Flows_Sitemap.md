# 02. UX, SITEMAP VÀ USER FLOWS

## 1. Navigation tổng thể

Định hướng giao diện: 4 mục điều hướng chính: **Trang chủ – Chơi – Học – Cá nhân**. Các màn hình bàn cờ, phòng chờ, puzzle và replay nằm sâu trong từng luồng; không tạo tab riêng cho mọi tính năng.

| Route | Màn hình | MVP |
|---|---|---|
| `/` | Landing/dashboard, lối tắt chơi và học | Có |
| `/play` | Chọn chế độ: local, AI, online | Có |
| `/play/local` | Thiết lập và chơi 2 người trên một máy | Có |
| `/play/ai` | Chọn độ khó AI và chơi | Có |
| `/play/online` | Tạo phòng / nhập mã phòng | Có |
| `/room/[code]` | Phòng chờ, cài đặt, copy link, trạng thái sẵn sàng | Có |
| `/game/[id]` | Bàn cờ online, đồng hồ, tác vụ trận đấu | Có |
| `/learn` | Danh sách bài học | Có |
| `/learn/[slug]` | Bài học tương tác với bàn cờ | Có |
| `/puzzles` | Danh mục puzzle | Có |
| `/puzzles/[id]` | Giải thế cờ | Có |
| `/history` | Các ván đã lưu | Có |
| `/history/[id]` | Replay, thanh nước đi, kết quả | Có |
| `/profile` | Nickname, thống kê cơ bản, cài đặt | Có |
| `/analysis/[id]` | Engine review, thử lại từ lỗi | P1 |
| `/friends`, `/ranking`, `/tournaments` | Bạn bè, xếp hạng, giải | P1/P2 |

## 2. Mô hình màn hình

### 2.1. Trang chủ

Thành phần: logo, nút **Chơi ngay**, nút **Chơi với bạn**, nút **Đấu AI**, tiếp tục ván đang lưu, gợi ý bài học, trận gần nhất, trạng thái guest/tài khoản. Trên màn hình nhỏ ưu tiên CTA và giảm thẻ phụ.

### 2.2. Trang Play

Ba chế độ nổi bật: **Bạn bè**, **AI**, **Local**. Online có form tạo phòng và nút tham gia bằng mã. Chưa có Elo trong MVP nên không có “ranked queue”.

### 2.3. Game room

Cho phép chọn thiết lập: bên Đỏ/Đen/ngẫu nhiên; đồng hồ **5/10/15 phút hoặc không giới hạn** (giá trị mặc định và luật timeout: CHƯA CHỐT); hiển thị mã phòng, copy link, trạng thái sẵn sàng. Token tham gia không đồng nhất với mã phòng hiển thị, tránh truy cập trái phép.

### 2.4. Game board

- Desktop: khu vực trung tâm cho bàn cờ; cột bên phải gồm lịch sử nước đi, đồng hồ, người chơi, tác vụ; cột bổ trợ có thể thu gọn.
- Mobile: header đối thủ và đồng hồ → bàn cờ → thanh thao tác bản thân → nước đi dạng bottom sheet hoặc panel kéo lên.
- Bàn cờ hỗ trợ click-click/tap-tap; drag-and-drop chỉ là lựa chọn bổ sung.
- Chỉ hiển thị nước hợp lệ khi cho phép; trận cạnh tranh không hiển thị “best move” và không gọi AI gợi ý.
- Trong replay, thay đồng hồ và hành động thi đấu bằng timeline, next/back, jump, reset.

### 2.5. Learning/Puzzle

Nội dung bài học có hướng dẫn từng bước, mục tiêu, bàn cờ tương tác, nút gợi ý và nút thử lại. Puzzle lưu `initialFen`, `sideToMove`, `solutionLines`, `allowedAlternatives`, độ khó, tác giả/nguồn.

## 3. User journeys

### F-01: Khách chơi online với bạn

1. Người A mở `/play/online`, tạo phòng cấu hình hợp lệ.
2. Backend tạo `roomCode`, `roomId`, session guest và join token cho chủ phòng.
3. A chia sẻ link bằng copy/share của trình duyệt.
4. Người B mở link, chọn nickname, nhận guest session và tham gia.
5. Phòng hiển thị đúng hai chỗ, kiểm tra quyền và trạng thái ready.
6. Backend khởi tạo GameSession; người đỏ đi trước; server cấp `gameVersion`.
7. Mỗi nước đi được gửi với `moveId` và `expectedVersion`, phản hồi accepted/rejected.
8. Khi kết thúc: kết quả, mời đấu lại, xem lịch sử và replay.

**Ngoại lệ:** phòng đầy, link hết hạn, B vào bằng tab khác, hai người cùng gửi nước, A rớt mạng, server restart, hết giờ trong lúc mất kết nối.

### F-02: Học và giải thế cờ

1. Chọn khóa học/bài học.
2. Nhận `Position` và mục tiêu.
3. Chọn quân, thực hiện nước đi, so khớp với một hoặc nhiều nhánh lời giải.
4. Sai: giải thích ngắn, reset hoặc gợi ý; đúng: chuyển bước.
5. Hoàn thành: ghi tiến độ nếu có user identity; guest lưu tạm cục bộ.

### F-03: Xem lại ván

1. Vào lịch sử hoặc từ màn hình kết quả.
2. Tải metadata + initial position + immutable move list.
3. Replay dựng lại trạng thái bằng `xiangqi-core`; timeline cập nhật theo `ply`.
4. Tua nhanh, lùi, về đầu/cuối; trong V2 chọn nước sai rồi thử lại.
5. Phân tích từ engine chỉ ở chế độ review, không chuyển dữ liệu phân tích vào trận online đang diễn ra.

### F-04: Chuyển renderer 2D/3D (sau MVP)

1. Người chơi bật tùy chọn 3D khi thiết bị hỗ trợ.
2. Tải lazily tài nguyên R3F/GLB và hiển thị scene 3D từ cùng `Position`.
3. Đọc/ghi tương tác thông qua cùng GameController và `Square` coordinate.
4. Nếu thiết bị yếu/không hỗ trợ WebGL hoặc asset lỗi: trở về renderer 2D mà không mất game state.
5. Animation có thể thay đổi nhưng nước đi được xác nhận và thời điểm tính giờ không phụ thuộc animation.

## 4. UX states bắt buộc

| State | Hành vi |
|---|---|
| Loading | Skeleton đơn giản; khi đợi server trả kết quả hiển thị đang kết nối |
| Opponent offline | Hiển thị đếm thời gian/chính sách đợi; không tự suy đoán đối thủ bỏ cuộc |
| Reconnecting | Khóa tương tác gửi mới; đồng bộ lại state theo server |
| Move rejected | Hoàn tác hình ảnh optimistic nếu có; hiện lý do, đồng bộ version |
| Game finished | Khóa đi quân, hiện kết quả và CTA replay/rematch |
| AI thinking | Dùng indicator ngắn; có giới hạn thời gian suy nghĩ |
| Unsupported 3D | Fallback 2D và thông báo nhẹ (V2) |

## 5. Checklist responsive/a11y

- Mọi tương tác khả dụng bằng thao tác chạm; không phụ thuộc hover.
- Bàn cờ giữ tỷ lệ hợp lý, không bắt người dùng cuộn ngang để đi cờ.
- Có dấu/biểu tượng phân biệt hai màu quân, không chỉ dựa vào màu nền.
- Các nút quan trọng có vùng chạm đủ lớn; âm thanh và animation có thể tắt/giảm.
- Thao tác lùi/tiến replay dùng bàn phím trên desktop; tương tác trên canvas/SVG có nhãn hỗ trợ tiếp cận ở mức hợp lý.
- Hỗ trợ trạng thái mất mạng, tab background và chế độ giảm chuyển động.

## 6. 3D art direction — trạng thái CHƯA CHỐT

- **3D v1 đề xuất:** Bàn cờ gỗ truyền thống, quân dạng tròn có chữ Hán, ánh sáng thực tế, camera góc nghiêng có kiểm soát.
- **3D v2:** Chất liệu, skin, hiệu ứng ăn quân/chiếu, camera điện ảnh.
- **3D v3:** Quân hóa thành mô hình tướng sĩ/kỵ binh/pháo; animation nhân vật; phạm vi và chi phí lớn.
- Duy trì luôn chế độ 2D và không dùng 3D làm điều kiện bắt buộc tham gia online.
