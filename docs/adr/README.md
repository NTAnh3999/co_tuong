# Architecture Decision Records (ADRs)

Tài liệu này chỉ dẫn tất cả quyết định kiến trúc đã được Proposed hay Accepted cho dự án Xiangqi Learn & Play.

## Danh sách ADRs

| ADR | Tiêu đề | Trạng thái | Phần lý do giải quyết |
|---|---|---|---|
| [ADR-017](ADR-017-ruleset-casual-v1.md) | RuleSet `xq-casual-1.0.0` | Proposed | Q-001 |
| [ADR-018](ADR-018-coordinates-fen-uci.md) | Coordinates, FEN, UCI | Proposed | Q-002 |
| [ADR-019](ADR-019-clock-disconnect-policy.md) | Clock và chính sách mất kết nối | Proposed | Q-003 |
| [ADR-020](ADR-020-guest-sessions.md) | Guest Sessions | Proposed | Q-004 |
| [ADR-021](ADR-021-data-retention.md) | Data Retention | Proposed | Q-005 |
| [ADR-022](ADR-022-rematch.md) | Rematch | Proposed | Q-006 |
| [ADR-023](ADR-023-pikafish-license.md) | Pikafish GPLv3 License Handling | Proposed | Q-007 |
| [ADR-024](ADR-024-ai-difficulty.md) | AI Difficulty Levels | Proposed | Q-008 |
| [ADR-025](ADR-025-tooling-conventions.md) | Tooling Conventions | Proposed | — |

## Ghi chú

Tất cả 9 ADRs trên (ADR-017 through ADR-025) hiện ở trạng thái **Proposed**, chờ xác nhận từ người dùng trước M7 release gate.

Các ADRs này giải quyết các open questions (Q-001 through Q-008) được liệt kê trong `docs/spec/v1.0/05_ADR_Decisions_Open_Questions.md`, cho phép tiếp tục development ở M1–M5 mà không bị chặn bởi các quyết định vẫn chưa hoàn thiện.

Xem thêm:
- [Spec v1.0](../spec/v1.0/) — Baseline specification và open questions.
- [AGENTS.md](../../AGENTS.md) — Project conventions.
