# 01. PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Tên làm việc:** Xiangqi Learn & Play.  
**Sứ mệnh:** Giúp người chơi cờ tướng học luật, chơi cùng bạn bè và tiến bộ thông qua các ván cờ thực tế.  
**Nền tảng ưu tiên:** Web responsive trên desktop, tablet và mobile browser.

## 1. Vision và nguyên tắc sản phẩm

Trải nghiệm cốt lõi là **Play → Review → Learn → Rematch**. Vào chơi dễ, học hiệu quả, lưu được thành quả. Trải nghiệm dùng thử không bị ngăn bởi biểu mẫu đăng ký.

**ĐÃ THỐNG NHẤT:** Website trước, ứng dụng native sau; kết hợp học và chơi với bạn bè; 3D là tầm nhìn sau MVP.

**ĐỀ XUẤT:** Tập trung phân khúc người mới đến trung cấp, đồng thời cung cấp chế độ luyện với AI và bài tập cho nhóm chơi lâu năm.

## 2. Nhóm người dùng mục tiêu

| Nhóm | Nhu cầu cốt lõi | Luồng chính |
|---|---|---|
| Người mới | Hiểu quân cờ, luật, chơi không sợ sai | Học luật → chơi AI dễ → puzzle |
| Nhóm bạn | Gửi link, chơi ngay, theo dõi đối đầu | Tạo phòng → mời bạn → chơi → đấu lại |
| Người muốn tiến bộ | Xem lại nước sai, luyện thế cờ | Chơi → replay → review → luyện lại (V2) |
| Người dùng mobile web | Bàn cờ rõ, thao tác chạm dễ | Mở link → chơi/ học trên màn hình nhỏ |

## 3. Các nguyên tắc UX và product

1. **Guest-first:** Cho phép tạo/tham gia phòng dưới danh tính khách hợp lệ; yêu cầu đăng nhập chỉ cho chức năng đồng bộ lâu dài và tài khoản.
2. **Fast-to-play:** Từ trang chủ tối đa vài thao tác để tạo phòng hoặc mở bàn cờ.
3. **One source of truth:** Trong online, server là nguồn trạng thái chính thức; client chỉ hiển thị dự đoán/đề nghị nước đi.
4. **Learning tied to play:** Không ép người chơi học trước khi chơi; học tập có thể diễn ra sau mỗi trận.
5. **2D by default:** 2D là phương án dễ đọc và hỗ trợ mọi thiết bị; 3D là lựa chọn giao diện, không thay đổi luật chơi.
6. **Accessible:** Responsive, màu sắc và ký hiệu quân dễ phân biệt, hỗ trợ phím/chạm nơi phù hợp.

## 4. Feature list theo module

### 4.1. Core Chess — P0

- Bàn cờ 9 cột × 10 hàng, vị trí chuẩn 32 quân, hai bên Đỏ/Đen.
- Chọn quân và hiển thị nước đi hợp lệ; ăn quân; chiếu Tướng; hết nước hợp lệ; xác định kết thúc.
- Quy tắc Tướng/Sĩ/Tượng/Mã/Xe/Pháo/Tốt; không cho phép tự đưa Tướng vào thế bị chiếu; ngăn hai Tướng đối mặt.
- Quy tắc lặp thế/chiếu liên tục/đuổi quân theo **RuleSet được chốt**, không được âm thầm dùng luật cờ vua.
- Bản ghi nước đi và replay; undo trong local và học, không mặc định hỗ trợ undo trong trận online.

**P1:** giao diện đa chủ đề, âm thanh, xoay bàn cờ tự động, công cụ đánh dấu mũi tên.  
**P2:** cờ úp và biến thể.

### 4.2. Play & Multiplayer

**P0:** chơi local 2 người, đấu AI ba cấp độ, tạo phòng và vào phòng bằng mã/link, tùy chọn thời gian đơn giản, đồng hồ server, đầu hàng/xin hòa, yêu cầu đấu lại, reconnect và đồng bộ sau mất mạng.

**P1:** danh sách bạn bè, mời trực tiếp, ghép cặp ngẫu nhiên, Elo, lịch sử đối đầu, xem trận và chat cơ bản có kiểm soát.

**P2:** giải đấu nội bộ, câu lạc bộ, bảng xếp hạng mùa giải, live spectating quy mô lớn.

### 4.3. Learning Academy

**P0:** học cách di chuyển của bảy quân, bài học chiếu/né chiếu, hướng dẫn thao tác; bộ thế cờ ban đầu **20–30 bài (mục tiêu biên tập, chưa phải cam kết)**, có kiểm tra đúng/sai và gợi ý theo từng bước.

**P1:** khai cuộc, trung cuộc, tàn cuộc, bài tập theo chủ đề, bài tập hằng ngày, học theo điểm yếu cá nhân.

**P2:** huấn luyện viên AI giải thích bằng tiếng Việt, lộ trình học cá nhân hóa và nhiệm vụ dài hạn.

### 4.4. Review & Analysis

**P0:** lưu metadata ván đấu, chuỗi nước đi và thời gian; phát lại từ đầu/cuối, nhảy đến nước bất kỳ, khôi phục tình huống lịch sử.

**P1:** engine phân tích sau trận, đánh giá ưu/nhược thế, nước bỏ lỡ, thử lại từ nước sai; hiển thị phương án thay thế.

**P2:** nhận xét chiến thuật bằng ngôn ngữ tự nhiên, phân tích theo cá nhân/nhóm, import vị trí bằng ảnh.

### 4.5. Identity, Social & Engagement

**P0:** danh tính khách, nickname, token phiên giới hạn, hồ sơ tối thiểu; lịch sử local/online; cài đặt hiển thị, không bắt buộc đăng ký mới được chơi.

**P1:** đăng nhập Apple/Google hoặc email (phải chốt provider), bạn bè, thống kê và bảng xếp hạng; thông báo mời chơi.

**P2:** câu lạc bộ, vật phẩm trang trí không ảnh hưởng luật, mùa giải, chương trình cộng đồng.

### 4.6. Platform & Operations

**P0:** kiểm tra nước đi server-side, tính giờ server-side, chống gửi trùng nước đi, quản lý quyền trong phòng, ghi log cơ bản, crash monitoring, lưu trạng thái nhất quán và khôi phục sau restart.

**P1:** CMS nội dung học tập, chống gian lận xếp hạng, job analysis, rate-limit theo lớp, quản trị người dùng.

**P2:** hệ thống vận hành nhiều region, anti-cheat nâng cao, orchestration theo số người dùng.

## 5. MVP: phải có và không làm

**Tập trung phát hành đầu:** Bàn cờ 2D responsive; core đúng luật; local 2 người; AI cơ bản; private-room online; đồng hồ và kết thúc; guest access; học luật + puzzle cơ bản; lịch sử và replay.

**Không làm trong MVP:** matchmaking xếp hạng, Elo công khai, giải đấu, cờ úp, chat phong phú, AI Coach bằng LLM, phân tích chuyên sâu sau trận, 3D đầy đủ, mobile-native và offline PWA hoàn chỉnh.

**Ranh giới chất lượng:** Nếu quy tắc lặp/chiếu đuổi chưa được triển khai đúng theo RuleSet công bố, không phát hành dưới mô tả “luật thi đấu chính thức” và không mở xếp hạng có thưởng.

## 6. Yêu cầu phi chức năng

| NFR | Yêu cầu |
|---|---|
| Correctness | Không có nước đi trái luật được server chấp nhận; có fixtures và regression suite |
| Consistency | Sau reconnect, hai client hội tụ về cùng `gameVersion`, lượt, đồng hồ, kết quả |
| Security | Phòng riêng có token/quyền hợp lệ; rate limit; chống giả mạo color, turn, result |
| Reliability | Move acceptance có tính idempotent; kết quả trận lưu bền vững |
| Responsiveness | Bàn cờ dùng tốt trên mobile browser và desktop; thao tác chạm và click |
| Extensibility | Renderer 2D/3D thay thế được; core độc lập; API có version |
| Observability | Log có requestId/gameId, đo reconnect, tỷ lệ hoàn thành ván, lỗi server |
| Legal | Kiểm tra giấy phép engine và asset trước khi phân phối |

## 7. KPI beta (đề xuất, chưa chốt mục tiêu số)

- Tỷ lệ vào phòng từ link thành công (`room_join_success_rate`).
- Tỷ lệ trận kết thúc bình thường (`game_completion_rate`) so với ngắt bất thường.
- Tỷ lệ mở replay sau khi kết thúc (`replay_open_rate`).
- Tỷ lệ hoàn thành bài học/thế cờ (`lesson_completion_rate`).
- Tỷ lệ người chơi quay lại tuần kế tiếp (`weekly_return_rate`).
- Tỷ lệ mất đồng bộ hoặc game state không thể phục hồi (`state_sync_incident_rate`).

## 8. Các tiêu chí chấp nhận ở mức sản phẩm

1. Người chưa đăng ký có thể mở site, tạo mã phòng, mời bạn và chơi.
2. Local, AI và Online dùng cùng một kết quả bộ luật; chỉ khác cơ chế điều phối và quyền tương tác.
3. Người dùng có thể phát lại các ván đã được lưu với cùng thứ tự nước đi và trạng thái kết thúc.
4. Không có chức năng gợi ý/engine analysis can thiệp vào trận online có tính cạnh tranh.
5. Bàn cờ hỗ trợ chuột và cảm ứng, kể cả trường hợp người dùng không kéo thả.
6. Có hợp đồng renderer độc lập để tương lai bật 3D mà không thay đổi move protocol.
