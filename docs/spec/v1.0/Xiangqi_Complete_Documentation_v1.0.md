# XIANGQI LEARN & PLAY

## Product & Technical Documentation · Baseline v1.0.0

**Ngày cập nhật:** 24/10/2026  
**Phạm vi:** Product Vision · Features · UX · Website Architecture · Rules Engine · Realtime · AI · 3D Roadmap · QA · ADR  
**Định hướng xác nhận:** Web-first, Mobile-later; học cờ và chơi cùng bạn bè; 2D MVP, 3D sau MVP.

> Đây là **tài liệu nền tảng để đối chiếu**, không phải chứng nhận hệ thống đã được triển khai. Những nội dung ghi **ĐỀ XUẤT** hoặc **CHƯA CHỐT** cần được xử lý trước milestone liên quan.

## Danh mục tài liệu

| Mã | Tài liệu | Công dụng |
|---|---|---|
| 00 | README / Decision baseline | Tổng quan và cách sử dụng |
| 01 | Product Requirements | Mục tiêu và feature list theo P0/P1/P2 |
| 02 | UX & User Flows | Cấu trúc trang, luồng và mobile responsive |
| 03 | Technical Architecture | Next.js, Xiangqi Core, NestJS, AI, multiplayer, 3D |
| 04 | MVP Roadmap & QA | Milestones, tiêu chí nghiệm thu, rủi ro |
| 05 | ADR & Open Questions | Quyết định chốt, giả định và blocker |
| 06 | References & Changelog | Nguồn tham khảo, lịch sử thay đổi |

---



---

# XIANGQI LEARN & PLAY — Bộ tài liệu nền tảng

**Phiên bản:** 1.0.0  
**Ngày chốt baseline:** 24/10/2026  
**Trạng thái:** Baseline để phát triển và đối chiếu, chưa phải hồ sơ kỹ thuật đã được kiểm chứng bằng triển khai.  
**Định hướng:** Web-first, Mobile-later; học cờ + chơi cùng bạn bè; 3D sau MVP.

## 1. Mục đích

Bộ tài liệu này ghi lại **những điều đã thống nhất**, những **đề xuất thiết kế**, và những **vấn đề còn mở** từ quá trình thảo luận. Dùng làm căn cứ cho backlog, thiết kế, code review, QA, quản lý thay đổi và so sánh các phiên bản hệ thống.

## 2. Cấu trúc bộ tài liệu

| File | Phạm vi |
|---|---|
| `01_PRD_Product.md` | Product vision, đối tượng, tính năng, phạm vi P0/P1/P2, tiêu chí sản phẩm |
| `02_UX_Flows_Sitemap.md` | Sơ đồ màn hình, hành trình người dùng, UI, trải nghiệm responsive, chuẩn bị 3D |
| `03_Technical_Architecture.md` | Tech stack, modular monolith, frontend, Xiangqi Core, backend, dữ liệu, multiplayer, AI, render 2D/3D |
| `04_MVP_Roadmap_QA.md` | MVP, milestone, acceptance criteria, kiểm thử, rủi ro, release checklist |
| `05_ADR_Decisions_Open_Questions.md` | Decision log (ADR-lite), trạng thái chốt, các quyết định đang mở, change request |
| `06_References_Changelog.md` | Nguồn kỹ thuật tham khảo, lịch sử sửa đổi, cách bảo trì tài liệu |

## 3. Cách đọc nhãn quyết định

- **ĐÃ THỐNG NHẤT:** Ý định/định hướng mà người dùng đã xác nhận trong trao đổi.
- **ĐỀ XUẤT:** Phương án khuyến nghị, cần xác nhận trước khi coi là hợp đồng kỹ thuật.
- **CHƯA CHỐT:** Phải quyết định, nghiên cứu hoặc thử nghiệm thêm.
- **SAU MVP:** Không nằm trong bản phát hành đầu tiên, nhưng có điểm nối kiến trúc cần chuẩn bị.

Các mức độ tính năng:

- **P0:** Thiết yếu cho MVP beta.
- **P1:** Nâng cấp gần sau MVP.
- **P2:** Mở rộng dài hạn, đồ họa nâng cao và cộng đồng.

## 4. Quyết định nền tảng

| ID | Quyết định | Trạng thái |
|---|---|---|
| D-001 | Web-first; mobile-native là giai đoạn sau | ĐÃ THỐNG NHẤT |
| D-002 | Một sản phẩm kết hợp học cờ và chơi với bạn bè | ĐÃ THỐNG NHẤT |
| D-003 | MVP sử dụng bàn cờ 2D; sau MVP có khả năng bổ sung 3D | ĐÃ THỐNG NHẤT |
| D-004 | Tách `xiangqi-core` khỏi UI, server và AI | ĐÃ THỐNG NHẤT về hướng kiến trúc |
| D-005 | Next.js + TypeScript, NestJS + Socket.IO, PostgreSQL | ĐÃ THỐNG NHẤT ở mức stack định hướng |
| D-006 | React + SVG làm renderer 2D; Three.js + React Three Fiber cho 3D | ĐỀ XUẤT |
| D-007 | Pikafish cho đấu máy/phân tích, tuân thủ giấy phép | ĐỀ XUẤT có điều kiện |
| D-008 | Bộ luật xử lý lặp thế/chiếu đuổi và quy tắc đồng hồ chính thức | CHƯA CHỐT |

## 5. Nguyên tắc thay đổi

1. Khi thay đổi phạm vi, ghi rõ **ID**, ngày, lý do, tác động lên kiến trúc/UI/QA và trạng thái phê duyệt.
2. Sửa tài liệu nguồn Markdown trước, sau đó phát hành bản Word/PDF tương ứng.
3. Không coi các chỉ số KPI, thời lượng sprint, số lượng lesson hay chi phí hạ tầng là cam kết khi chúng được ghi là **đề xuất/giả định**.
4. Nếu phát hiện xung đột, ưu tiên theo thứ tự: quyết định mới được chốt > ADR hiện hành > PRD > mô tả khảo sát/ý tưởng.
5. Bản phát hành có tag phiên bản theo `MAJOR.MINOR.PATCH`; lập baseline mới khi thay đổi phạm vi hoặc hợp đồng hệ thống.



---

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



---

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



---

# 03. TECHNICAL ARCHITECTURE

## 1. Quyết định stack và ranh giới hệ thống

**Kiến trúc:** pnpm workspace + Turborepo, Web-first, modular monolith ở NestJS, engine AI chạy worker độc lập. Không chọn Microservices cho MVP.

| Lớp | Tech stack | Quyết định |
|---|---|---|
| Web | Next.js App Router + React + TypeScript | Hướng đã thống nhất |
| UI | Tailwind CSS + shadcn/ui | Đề xuất |
| Chess 2D | React + SVG; Pointer Events, Motion | Đề xuất |
| State UI | Zustand | Đề xuất |
| API cache | TanStack Query | Đề xuất |
| Server | NestJS REST + Socket.IO | Hướng đã thống nhất |
| DB | PostgreSQL + Prisma | Hướng đã thống nhất |
| Auth | Guest sessions trước; provider đăng nhập cần chốt | Guest-first đã thống nhất; provider chưa chốt |
| Chess core | Pure TypeScript, independent package | Hướng đã thống nhất |
| AI | Pikafish UCI qua worker process | Đề xuất có rà soát GPLv3 |
| Deploy | Docker Compose trên VPS, reverse proxy HTTPS | Đề xuất MVP |
| 3D future | Three.js + React Three Fiber (stable) + GLB/glTF | Đề xuất SAU MVP |
| Analytics/ops | Logs + Sentry/OpenTelemetry tùy chọn | Đề xuất |

**Lý do dùng hai ứng dụng Next.js/NestJS:** Website có nhu cầu SEO và UI tương tác; backend cần xử lý socket dài hạn, game room, đồng hồ, AI worker, bảo mật và quyền phiên. Dù tách runtime, hệ thống vẫn là modular monolith, không phải mạng nhiều microservice.

## 2. Sơ đồ logic

```text
Desktop browser / Mobile browser / PWA (future)
            |
  Next.js Web Application
  - Home/Learn/Puzzle/Game UI
  - GameController + BoardRenderer(2D/3D)
  - Xiangqi Core (validate for UX)
            |
      REST + Socket.IO
            |
       NestJS API
  - Auth/Guest   - Rooms/Games
  - Clock        - Learning
  - Xiangqi Core (authoritative)
            |                 \
       PostgreSQL        Pikafish Worker
     (persistent log)    (UCI subprocess)

Note: online state is authoritative in NestJS, not browser.
```

## 3. Monorepo đề xuất

```text
xiangqi-platform/
  apps/
    web/                  # Next.js App Router
    api/                  # NestJS
  packages/
    xiangqi-core/         # chess rules + notation + FEN
    shared-contracts/     # types + runtime schemas
    api-client/           # fetch/socket clients
  services/
    pikafish-worker/      # isolated engine management
  infrastructure/
    docker/
    scripts/
  docs/                   # documentation versioned in git
  pnpm-workspace.yaml
  turbo.json
```

Dự án mobile-native sau này thêm `apps/mobile/` (React Native) dùng lại core, contracts và API-client nhưng **không giả định tái sử dụng trực tiếp web renderer**.

## 4. Xiangqi Core — cách biểu diễn

### 4.1. Bàn cờ và tọa độ

- Bàn cờ **9 cột × 10 hàng = 90 giao điểm**. Mảng 90 phần tử là lựa chọn cho MVP; sau này có thể tối ưu mà giữ nguyên public API.
- **Quy ước do dự án định nghĩa:** Góc trái dưới bên Đỏ là `a0`, góc phải trên là `i9`, Red ở dưới trong orientation chuẩn; tọa độ logic không đổi khi xoay bàn cờ.
- Mảng có thể map `index = rank * 9 + file` với rank 0 tại phía Đỏ, hoặc một kiểu Position cấu trúc khác; tất cả phải có round-trip tests.
- Chuỗi nước đi tọa độ, ví dụ `b0c2`, **chỉ được coi là hợp lệ sau khi test tương thích với adapter UCI của engine**; FEN và chuyển chiều cũng phải có kiểm thử integration.
- Không lưu tọa độ pixel/SVG/3D vào GameState.

### 4.2. Domain contracts (đề xuất)

```ts
type Color = 'red' | 'black';
type PieceType = 'GENERAL' | 'ADVISOR' | 'ELEPHANT' |
  'HORSE' | 'CHARIOT' | 'CANNON' | 'SOLDIER';
type Square = string;  // validated at runtime: /^[a-i][0-9]$/
interface Piece { color: Color; type: PieceType }
interface Move { from: Square; to: Square }
interface Position {
  board: readonly (Piece | null)[]; // length 90
  turn: Color;
}
interface GameRecord {
  initialPosition: Position;
  moves: readonly Move[];
  ruleSetVersion: string;
}
```

`Square` không chỉ là chuỗi tự do: dùng schema validator hoặc value object trước khi chuyển sang index. `Position` **không đủ** để xử lý lặp thế/đuổi quân và đồng hồ; phải giữ **game history + time state + ruleset** ở tầng phiên game.

### 4.3. API core bắt buộc

- `createInitialPosition()`
- `getLegalMoves(position, square)`
- `isLegalMove(position, move)`
- `applyMove(position, move): Position` — pure function
- `isInCheck(position, color)`
- `evaluateGame(gameRecord, clocks, ruleSet): GameResult`
- `toFen(position)` / `fromFen(fen)` — có kiểm tra round-trip
- `encodeMove(move)` / `decodeMove(text)` — định dạng tọa độ đã thống nhất

Nguyên tắc: không import UI, DOM, networking, database hay Pikafish vào package `xiangqi-core`. Unit tests độc lập, không cần chạy web/server.

### 4.4. Tình huống luật cờ cần kiểm thử

- Pháo đi không ăn như Xe nhưng ăn quân phải nhảy qua **đúng một** quân.
- Mã bị cản chân; Tượng bị cản mắt và không qua sông; Tướng và Sĩ ở trong cung.
- Tốt đi thẳng một bước trước khi qua sông; sau sông đi ngang được nhưng không đi lùi.
- Tướng không được đối mặt nhau trên cùng cột khi không có quân chắn.
- Không được để Tướng của mình bị chiếu sau nước đi; không được bỏ chiếu mà không hóa giải.
- Không có nước đi hợp lệ: **bên đến lượt thua**, kể cả không bị chiếu (khác với stalemate trong cờ vua quốc tế).
- Phân loại lặp thế, chiếu liên tục, đuổi quân, hòa theo **RuleSet** đã chốt. Đây là bài toán độc lập, phức tạp, không đánh đồng với kiểm tra 3-fold của cờ vua.

**CHƯA CHỐT / blocker trước phát hành:** Lựa chọn bộ luật (ví dụ tài liệu Asian Xiangqi Federation), mức bao phủ chiếu-đuổi, cách xử lý trường hợp lặp chưa giải quyết được. Có thể beta casual với quy định giản lược được thông báo rõ, nhưng không được quảng cáo là luật thi đấu chuẩn nếu thiếu kiểm thử.

## 5. GameController và Multi-renderer

Tách three layers:

1. **Core:** Vị trí, nước đi hợp lệ, kết quả, tuần tự lịch sử.
2. **Game Controller:** Chuyển đổi hành động thành command, quản lý phiên local/AI/online, optimistic visual state nếu cần.
3. **Board Renderer:** Vẽ và nhận tương tác để phát command, không ra quyết định luật.

```ts
interface BoardRendererProps {
  position: Position;
  orientation: Color;
  selectedSquare: Square | null;
  legalMoves: readonly Move[];
  lastMove: Move | null;
  onSquareClick(square: Square): void;
  onMove(move: Move): void;
}
```

Implement `Board2D` trước; sau MVP, `Board3D` dùng lại interface. Đổi renderer không làm thay đổi state, đồng hồ, kết quả, lịch sử hoặc protocol. Các animation chỉ phản ánh state đã chấp nhận; không là nguồn tính toán thời gian.

**2D:** React SVG, responsive theo tỷ lệ bàn cờ, Pointer Events để chạm-chạm/kéo thả, animation không block luật.  
**3D:** Three.js + React Three Fiber stable, Three Canvas chỉ chạy Client Component; model GLB/glTF từ Blender; raycasting map đối tượng → Square; lazy loading scene, fallback 2D, giảm texture/lighting và hỗ trợ reduced motion.

## 6. Multiplayer: hợp đồng tính nhất quán

### 6.1. Server-authoritative move lifecycle

1. Client phát command `{gameId, moveId, expectedVersion, move}`.
2. Server xác thực session, quyền/người chơi/màu, trạng thái game, lượt đi, giới hạn thời gian.
3. Server gọi core để xác định hợp lệ.
4. Trong một transaction/critical section theo `gameId`, ghi nước đi và tăng `gameVersion`.
5. Sau commit, phát `game:move:accepted` và `game:state` hoặc incremental event; client reconcile.
6. Reject nếu sai phiên bản, sai lượt, trái luật hoặc trận kết thúc; gửi state mới nếu cần.

**Idempotency:** `moveId` là khóa chống gửi trùng. `expectedVersion` chống ghi đè khi nhiều request cùng tới. Không đặt độ tin cậy vào `socket.id` vì socket ID có thể đổi khi reconnect.

### 6.2. WebSocket events P0

| Event | Chiều | Payload tối thiểu |
|---|---|---|
| `room:join` | C→S | `roomId/joinToken` |
| `room:state` | S→C | members, settings, status |
| `game:join` | C→S | `gameId/session` |
| `game:move` | C→S | `moveId`, `expectedVersion`, `move` |
| `game:move:accepted` | S→C | acceptedMove, gameVersion, clocks |
| `game:move:rejected` | S→C | reasonCode, authoritativeVersion |
| `game:state` | S→C | snapshot, gameVersion, clocks, status |
| `game:finished` | S→C | result, reason, finalVersion |

**Reconnect:** client gọi `GET /games/:id` hoặc `game:sync` để nhận full authoritative snapshot, bất kể Socket.IO state recovery có thành công hay không. Có phương án xử lý tab background và clock.

### 6.3. Đồng hồ

Clock server-side là nguồn duy nhất; lưu `remainingMs` từng bên, `activeColor`, `lastTickAt`/`turnStartedAt`, cơ chế timeout trên server. Định nghĩa rõ pause hay không khi mất kết nối, chính sách vắng mặt và luật xử thua hết giờ **trước khi lập trình**.

## 7. REST API P0

| Method | Path | Chức năng |
|---|---|---|
| `POST` | `/api/v1/rooms` | Tạo phòng riêng |
| `POST` | `/api/v1/rooms/:id/join` | Join phòng bằng quyền hợp lệ |
| `GET` | `/api/v1/rooms/:id` | Snapshot phòng |
| `GET` | `/api/v1/games/:id` | Snapshot trận, clock, version |
| `GET` | `/api/v1/games/:id/moves` | Move history có phân trang (nếu cần) |
| `POST` | `/api/v1/games/:id/resign` | Đầu hàng |
| `POST` | `/api/v1/games/:id/draw-offer` | Đề nghị hòa |
| `GET` | `/api/v1/lessons` | Catalog bài học |
| `GET` | `/api/v1/puzzles` | Catalog puzzle |
| `POST` | `/api/v1/puzzles/:id/attempts` | Ghi kết quả puzzle |

Auth và authorization server-side; bảo vệ room code khỏi brute-force, rate limit endpoints nhạy cảm, phân quyền game read vs control, CSRF/CORS/cookie phù hợp triển khai thực tế.

## 8. Dữ liệu cốt lõi (logical schema)

| Entity | Trường tối thiểu |
|---|---|
| `users` | id, nickname, type(guest/registered), createdAt |
| `rooms` | id, publicCode, hostId, settingsJson, status, expiresAt |
| `room_members` | roomId, playerId, role, joinedAt |
| `games` | id, roomId?, mode, redId, blackId, initialFen, ruleSetVersion, status, result, gameVersion, createdAt |
| `game_moves` | id, gameId, moveNumber, moveId(unique), from, to, playerId, clockAfterMs, acceptedAt |
| `game_snapshots` | gameId, ply, fen, clocksJson, version, createdAt |
| `lessons` | id, slug, title, level, contentVersion, bodyJson |
| `puzzles` | id, initialFen, sideToMove, solutionJson, difficulty, contentVersion |
| `learning_progress` | userId, contentId, status, attempts, completedAt |
| `game_analysis` | gameId, engineVersion, paramsJson, resultJson, createdAt — P1 |

**Quan trọng:** Initial FEN + move log + RuleSet là dữ liệu chuẩn của ván; snapshot là cache để khôi phục nhanh. FEN không chứa đủ đồng hồ và lịch sử lặp, nên không thể là nguồn dữ liệu duy nhất. Lưu event log bền, backup và có kiểm thử khôi phục.

## 9. Pikafish integration

- Adapter nói chuyện với engine qua UCI; worker process độc lập với NestJS request loop.
- Giới hạn CPU/time per move, số worker đồng thời, timeout, kill/restart nếu treo.
- Tránh để một trận đấu AI sinh process không giới hạn; có queue/concurrency limit.
- Engine chỉ đề nghị nước đi; trước khi trả người chơi, server/core xác thực tính hợp lệ và version.
- Không cung cấp API phân tích nước tối ưu trong ván online cạnh tranh.
- **Rà soát giấy phép GPLv3 và các điều khoản của model/asset** trước khi phân phối, đặc biệt nếu embed engine trên client hoặc phân phối WASM.
- Sau MVP mới thử nghiệm Pikafish WASM trên browser; benchmark thiết bị tầm trung, thời gian tải, tính tương thích, build maintenance và license.

## 10. Vận hành MVP

- Docker Compose gồm `web`, `api`, `postgres`, `pikafish-worker`, reverse proxy HTTPS; secrets qua environment/secret store, không commit.
- Một VPS là giả định giai đoạn đầu; tách worker/database khi quá tải. **Redis/BullMQ không bắt buộc trong MVP**; chỉ thêm khi cần distributed rooms, queue hoặc đa instance.
- Logging có `gameId`, `moveId`, `requestId`; metric cho move latency, socket reconnect, inconsistent state, AI timeout, room join.
- Backup DB, thử restore, migration rollback hoặc kế hoạch forward-fix trước beta.
- Frontend có chính sách lazy-load 3D (sau MVP) và hỗ trợ fallback WebGL.

## 11. Định hướng mở rộng 3D

**ĐÃ THỐNG NHẤT về tầm nhìn:** Sau MVP hỗ trợ 3D. **CHƯA CHỐT:** mỹ thuật cuối, ngân sách asset, chất lượng tối thiểu và giới hạn thiết bị.

Giai đoạn 3D v1: quân gỗ 3D, board 3D, camera cố định/góc nghiêng, click/raycast, animation dịch quân. 3D v2: skin/effect/lighting. 3D v3: chiến trường nhân vật hóa đòi hỏi pipeline rigging, animation, VFX lớn.

NFR của 3D: 2D luôn khả dụng; đổi renderer không restart trận; không truyền các trạng thái đồ họa qua server; model tối ưu theo thiết bị; hiệu năng **30 FPS mobile tầm trung/60 FPS desktop là mục tiêu thử nghiệm, không phải SLA cam kết**.



---

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



---

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



---

# 06. THAM KHẢO VÀ CHANGELOG

## 1. Nguồn tham khảo kỹ thuật (kiểm tra ngày 24/10/2026)

Các URL dưới đây dùng để nghiên cứu khi bắt đầu triển khai; không thay thế việc kiểm tra phiên bản package/giấy phép tại ngày build thực tế.

1. Next.js — Server/Client Components: https://nextjs.org/docs/app/getting-started/server-and-client-components
2. Next.js — Deployment Docker và Node.js: https://nextjs.org/docs/app/getting-started/deploying
3. Socket.IO — Connection state recovery và giới hạn: https://socket.io/docs/v4/connection-state-recovery
4. Socket.IO — Server API, socket.id và reconnect: https://socket.io/docs/v4/server-api/
5. Pikafish — mã nguồn và giấy phép GPLv3: https://github.com/official-pikafish/Pikafish
6. React Three Fiber — tài liệu stable: https://r3f.docs.pmnd.rs/getting-started/introduction
7. React Three Fiber — nhánh next/alpha, không ưu tiên cho MVP: https://r3f.docs.pmnd.rs/next/getting-started/introduction
8. Three.js — tài liệu WebGL renderer: https://threejs.org/docs/#api/en/renderers/WebGLRenderer
9. Asian Xiangqi Federation — luật cờ tướng: https://www.asianxiangqi.org/English/AXF_rules_Eng.pdf
10. GNU XBoard — luật cờ tướng và stalemate: https://www.gnu.org/software/xboard/whats_new/rules/Xiangqi.html
11. Club Xiangqi — trình bày luật châu Á và các thế chiếu/đuổi: https://www.clubxiangqi.com/rules/asiarule.htm

**Lưu ý:** Định dạng tọa độ, kiểm tra luật chiếu/đuổi và tương thích UCI/FEN cần được chứng minh qua test, không chỉ dựa vào ví dụ trong tài liệu.

## 2. Baseline 1.0.0 — 24/10/2026

- Hợp nhất vision và feature list từ các phiên trao đổi.
- Chốt định hướng Web-first, Mobile-later và học cờ + chơi cùng bạn bè.
- Chọn kiến trúc định hướng Next.js, NestJS, Socket.IO, PostgreSQL, TypeScript Xiangqi Core.
- Làm rõ AI Pikafish tách khỏi rules engine, giới hạn tài nguyên worker.
- Bổ sung khái niệm server-authoritative, idempotent move, replay và clock policy.
- Ghi nhận yêu cầu 3D sau MVP: multi-renderer 2D/3D, Three.js/R3F + GLB, lazy load và 2D fallback.
- Tách riêng ADR và các điểm chưa chốt để tránh hiểu nhầm đề xuất là quyết định đã được phê duyệt.

## 3. Mẫu ghi thay đổi tiếp theo

| Version | Date | Change | Files affected | ADR |
|---|---|---|---|---|
| 1.0.0 | 2026-10-24 | Initial consolidated baseline | All | ADR-001 → ADR-016 |
| 1.1.0 | TBD | Chốt RuleSet, hoàn thiện API contracts và schema | PRD, Architecture, QA, ADR | TBD |

## 4. Quy tắc dùng tài liệu cho đối chiếu

- Mỗi milestone ghi `implementation-version` và `docs-baseline` tham chiếu.
- Mọi task lớn liên kết requirement ID/acceptance ID như `CORE-01`, `ROOM-02`.
- Trước release tạo bảng **Designed / Implemented / Tested / Deviations** để không nhầm tính năng thiết kế với tính năng đã hoàn thiện.
- Những chi tiết lấy từ xu hướng công nghệ thị trường (library, licensing, framework versions) phải kiểm tra lại khi triển khai.

