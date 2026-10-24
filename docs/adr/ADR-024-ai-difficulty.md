# ADR-024: AI Difficulty Levels

**ADR-ID:** ADR-024  
**Ngày:** 2026-10-24  
**Trạng thái:** Proposed  

## Vấn đề

Cần xác định cách triển khai ba mức độ khó AI (Dễ, Vừa, Khó) sao cho:
- Không phải weakening engine bằng cách làm "ngu" nó.
- Các máy khác nhau có thể chạy mà không quá chậm.
- Cân bằng hợp lý giữa cường độ và thời gian phản ứng.

## Bối cảnh

Xiangqi engines (như Pikafish) có thể điều chỉnh độ khó thông qua:
1. **Search depth / time limit:** Đưa ra quyết định cụ thể, càng lâu = càng mạnh.
2. **MultiPV (multiple principal variations):** Liệt kê N nước hàng đầu, cho phép pick không phải lúc nào cũng tốt nhất.
3. **Random selection:** Chọn từ top candidates thay vì lúc nào cũng best move.

Kết hợp các kỹ thuật này cho phép tạo opponent đa dạng mà không cần multiple engine versions.

## Các lựa chọn

1. **Engine pruning (weakening):** Loại bỏ pieces, handicap material → trực quan nhưng không phải best practice.
2. **Time/depth control + MultiPV random:** Standard approach, cho phép smooth difficulty curve.
3. **Multiple binaries:** Pikafish versions khác nhau → overengineered, không cần.

## Quyết định

Chọn **time/depth control + MultiPV + weighted random selection**.

### Ba mức độ

**Dễ (Easy):**
- Thời gian suy nghĩ: **50ms per move**
- MultiPV: **5** (liệt kê 5 nước hàng đầu)
- Selection: Chọn **uniformly at random** từ tất cả nước trong vùng **±300 centipawns** từ best move
- Hiệu ứng: Tương đương ~800–1000 ELO, sai lầm thường xuyên nhưng không tồi tệ

**Vừa (Medium):**
- Thời gian suy nghĩ: **200ms per move**
- MultiPV: **3** (liệt kê 3 nước hàng đầu)
- Selection: **Weighted random** từ tất cả nước trong vùng **±80 centipawns** từ best move
  - Best move: 50% chance
  - 2nd best trong vùng: 35% chance
  - 3rd+ trong vùng: 15% chance
- Hiệu ứng: Tương đương ~1400–1600 ELO, chơi tốt nhưng còn ghi lỗi

**Khó (Hard):**
- Thời gian suy nghĩ: **1000ms per move**
- MultiPV: **1** (chỉ best move)
- Selection: **Luôn best move**
- Hiệu ứng: Tương đương ~2000–2200 ELO hoặc cao hơn, rất mạnh

### Worker pool

- **Pool size:** 2 concurrent engine instances (giới hạn CPU/memory).
- **Queue cap:** Tối đa 20 pending requests (ngoài đó = reject với error, user thấy "Engine busy").
- **Hard timeout:** Nếu engine không trả lời trong `movetime + 1.5s` → fallback default move (hoặc move ngẫu nhiên hợp lệ).

### Weighted random algorithm

```
candidates = engine.multiPV(k)  // k = 5, 3, or 1
filtered = candidates.filter(c => c.score >= best.score - threshold)

if difficulty == EASY:
  pick = random.choice(filtered)
elif difficulty == MEDIUM:
  weights = [0.5 if i==0 else (0.35 if i==1 else 0.15) for i in range(len(filtered))]
  pick = random.choices(filtered, weights=weights, k=1)
elif difficulty == HARD:
  pick = filtered[0]

return pick.move
```

## Lý do

- **Không weakening:** Engine vẫn engine, chỉ được "hạn chế suy nghĩ" hoặc "cho phép nước yếu."
- **Smooth curve:** Đủ ba mức để casual/intermediate/advanced.
- **Benchmark-friendly:** 50ms/200ms/1000ms là values điển hình, dễ tìm reference.
- **Pool limiting:** Ngăn server overload với request engine nhiều.
- **Fallback graceful:** Timeout không để hang game.

## Hệ quả / trade-offs

**Lợi ích:**
- Mức "Khó" thực sự mạnh, không fake.
- Mức "Dễ" cơ bản nhưng vẫn chơi theo luật.
- Responsive, không lag.

**Tradeoff:**
- Mức "Dễ" vẫn có thể chơi tốt một số nước (người chơi mới có thể vẫn thua). Có thể điều chỉnh nếu feedback.
- 1000ms per move là lâu trên mobile; có thể cần tối ưu hoặc giảm xuống 500ms nếu cần.
- Hard timeout fallback có thể gây surprise disconnect; cần UI feedback rõ.

## Phạm vi thay đổi code/UX/QA

**Code:**
- Pikafish worker: Implement UCI `go movetime X` command, parse MultiPV output.
- AI service: Difficulty enum, weighted random selection.
- Queue/pool: Job queue với concurrency control.
- Timeout handler: Fallback move logic.

**UX:**
- AI mode picker: 3 buttons Dễ/Vừa/Khó, ví dụ ELO ở cạnh.
- Game board: Indicator "AI thinking..." khi đợi move (timeout warning sau 5s ví dụ).

**QA:**
- Benchmark: Đo time per move ở các mức (desktop & mobile).
- Difficulty test: Play series vs. Easy/Medium/Hard, verify move selection distribution.
- Timeout test: Trigger timeout, fallback moves hợp lệ.
- Concurrency test: N concurrent requests, pool không crash, queue không overflow.

## Tài liệu liên quan

- `docs/spec/v1.0/05_ADR_Decisions_Open_Questions.md` — Q-008
- UCI/UCCI spec (MultiPV parameter)
- Pikafish documentation

## Người duyệt

Chưa duyệt — chờ xác nhận trước M7
