# ADR-021: Data Retention

**ADR-ID:** ADR-021  
**Ngày:** 2026-10-24  
**Trạng thái:** Proposed  

## Vấn đề

Cần xác định các chính sách lưu trữ dữ liệu cho phiên khách, lịch sử trò chơi, và server logs để cân bằng giữa bảo mật, quyền riêng tư, yêu cầu pháp lý và khả năng sử dụng.

## Bối cảnh

MVP là casual play-first, không yêu cầu lưu trữ lâu dài lịch sử người chơi. Tuy nhiên, cần một chính sách rõ ràng để:
- Xóa dữ liệu cũ để tuân thủ GDPR/privacy.
- Giữ server logs cho debug và phát hiện lạm dụng.
- Không lưu thông tin cá nhân quá mức cần thiết.

## Các lựa chọn

1. **Không xóa:** Lưu mọi thứ vĩnh viễn — đơn giản nhưng vi phạm quyền riêng tư.
2. **Xóa tất cả sau 7 ngày:** Quá ngắn, mất dữ liệu người chơi có ích.
3. **Chính sách phân cấp:** Xóa phiên sau 90 ngày, trò chơi sau 180 ngày, logs sau 14 ngày — cân bằng.

## Quyết định

Chọn **chính sách phân cấp**:

- **Guest sessions:** Phiên khách không hoạt động ≥ 90 ngày bị xóa hoàn toàn (bao gồm tất cả trò chơi liên kết).
- **Finished games:** Các trò chơi đã kết thúc được lưu 180 ngày; sau đó xóa (trừ metadata thống kê nếu cần).
- **Server logs:** Logs (request, error, socket event) được lưu 14 ngày; sau đó xóa hoặc archive.
- **Personal data in logs:** Logs chỉ được phép chứa nickname do người chơi chọn và IP address (cho điều tra lạm dụng); không lưu trữ token, password, email, hoặc thông tin sinh trắc học.

## Lý do

- **Quyền riêng tư:** Xóa dữ liệu khách không hoạt động giảm bộ dung lượng lưu trữ cá nhân không cần thiết.
- **Tính thực tiễn:** 180 ngày đủ để người chơi quay lại và xem lịch sử, nhưng không quá lâu để gây gánh nặng lưu trữ.
- **Debug:** 14 ngày logs đủ cho điều tra, rotate log cũ để tiết kiệm không gian.
- **Tuân thủ:** Loại bỏ personal data khỏi logs giảm rủi ro nếu logs bị phơi bày.

## Hệ quả / trade-offs

**Lợi ích:**
- Giảm bộ dung lượng database theo thời gian (dọn dẹp định kỳ).
- Bảo vệ quyền riêng tư: không lưu dữ liệu cũ không cần thiết.
- Tuân thủ GDPR (xóa dữ liệu cá nhân khi không hoạt động).

**Tradeoff:**
- Lịch sử dài hạn bị mất sau 180 ngày (người chơi quay lại sau 6 tháng mất hết tủ sách).
- Phải xây dựng job xóa dữ liệu định kỳ (cron/task scheduler).

## Phạm vi thay đổi code/UX/QA

**Code:**
- Tạo job scheduler (cron hoặc NestJS schedule) để:
  - Mỗi đêm: xóa `guest_sessions` với `expiresAt < now - 90 days`.
  - Mỗi tuần: xóa finished games với `finishedAt < now - 180 days`.
  - Mỗi ngày: archive/xóa logs với `createdAt < now - 14 days`.
- Logging: Đảm bảo nickname và IP đã được hashed/masked nếu cần, không log tokens/secrets.
- Database: Soft-delete option hoặc hard-delete (chọn hard-delete cho anonymity).

**UX:**
- Privacy page: Nêu rõ chính sách (90 ngày guest session, 180 ngày game history, 14 ngày logs).

**QA:**
- Test job cleanup: tạo guest session hết hạn, chạy job, kiểm tra xóa.
- Test log scrubbing: không có token trong logs.

## Tài liệu liên quan

- `docs/spec/v1.0/05_ADR_Decisions_Open_Questions.md` — Q-005
- GDPR Article 17 (right to be forgotten)

## Người duyệt

Chưa duyệt — chờ xác nhận trước M7
