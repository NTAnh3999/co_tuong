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
