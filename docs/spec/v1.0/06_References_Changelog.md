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
