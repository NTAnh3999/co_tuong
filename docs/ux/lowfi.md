# Low-Fi UX Wireframes

Tài liệu này mô tả layout đơn giản (text wireframe + component inventory) cho ba routes chính của MVP, để unblock M2 component development.

## 1. `/play/local` — Local 2-Player Setup

**Route:** `/play/local`  
**Mục tiêu:** Người chơi chọn cấu hình (màu, cài đặt) rồi bắt đầu ván 2 người trên cùng máy.

### Component Inventory

| Thành phần | Dữ liệu | Hành động |
|---|---|---|
| Header | Breadcrumb "Play > Local" | Back to /play |
| Title | "Chơi 2 người trên cùng máy" | — |
| Color picker | "Người chơi 1: [Đỏ ▼] Người chơi 2: [Đen]" (radio/select) | Pick color, auto-swap if needed |
| Time control selector | Buttons: "Không giới hạn | 5+3 | 10+5 (default) | 15+10" | Select preset |
| Player names (optional) | Text input "Tên người chơi 1/2" | Enter nickname or skip |
| Start button | Primary CTA "Bắt đầu trận" | Validate, navigate to GameBoard state |
| Info box | "Nước Đỏ đi trước. Nhấp vào quân rồi ô đích." | — |

### Text Wireframe

```
┌─────────────────────────────────────┐
│ ◀ Chơi > Local                      │
├─────────────────────────────────────┤
│                                     │
│   Chơi 2 người trên cùng máy       │
│                                     │
│   Chọn cấu hình                     │
│   ┌─────────────────────────────┐  │
│   │ Người chơi 1: [Đỏ ▼]        │  │
│   │ Người chơi 2: [Đen]         │  │
│   └─────────────────────────────┘  │
│                                     │
│   Thời gian:                        │
│   [Không giới hạn] [5+3] [10+5*]   │
│   [15+10]                           │
│                                     │
│   Tên người chơi (tùy chọn)        │
│   [Người chơi 1: ____]              │
│   [Người chơi 2: ____]              │
│                                     │
│        [Bắt đầu trận]              │
│                                     │
│   💡 Nước Đỏ đi trước.             │
│      Nhấp vào quân rồi ô đích.     │
│                                     │
└─────────────────────────────────────┘
```

### Notes

- Desktop: Full-width column layout, responsive.
- Mobile: Stack các controls dọc, button full-width.
- Validation: Cảnh báo nếu chưa chọn thời gian.
- Persist: Optional lưu cấu hình cuối cùng (localStorage).

---

## 2. `/game/[id]` — Online Game Board

**Route:** `/game/[id]`  
**Mục tiêu:** Màn hình chơi online với bàn cờ, đồng hồ, lịch sử nước đi, hành động.

### Component Inventory

#### Desktop Layout (≥768px)

| Thành phần | Dữ liệu | Hành động |
|---|---|---|
| **Header** | Room code, opponent name, game status | Back to room, copy link |
| **Left panel** | Move history, scrollable list | Click move → jump to ply |
| **Center** | Board 2D (SVG), responsive square | Click piece, drag optional |
| **Right panel (collapsible)** | Opponent clock, own clock, player names, actions | See below |
| **Actions section** | Resign, Draw offer, Chat (V2) | Submit, cancel pending offers |

#### Mobile Layout (<768px)

| Thành phần | Dữ liệu | Hành động |
|---|---|---|
| **Header** | Opponent name, clock countdown | Collapse/expand menu |
| **Main** | Board 2D, full-width | Click/tap piece |
| **Action bar** | Resign, Draw, Menu button | Quick access |
| **Bottom sheet** | Move history, collapsible drawer | Swipe up/down, scroll |

### Text Wireframe — Desktop

```
┌────────────────────────────────────────────────────────────────┐
│ ◀ Game #xyz | Code: abc123 | vs. Alice                         │
├──────────────┬──────────────────────┬──────────────────────────┤
│              │                      │ Đen (Alice) 14:32        │
│ Move history │                      ├──────────────────────────┤
│              │                      │     [  Bàn cờ 2D SVG  ]  │
│ 1. h2-e2  ▸ │   [  Bàn cờ 2D   ]  │     [                  ]  │
│ 2. c9-e7  ▸ │   [  SVG Canvas  ]  │     [  Responsive box  ]  │
│ 3. h9-h0  ▸ │   [  resize       ]  │     [                  ]  │
│            │   [              ]  │                          │
│ (scroll)   │   [              ]  │ Đỏ (Bạn) 14:55         │
│            │                      ├──────────────────────────┤
│            │                      │ Hành động:               │
│            │                      │ □ Đề nghị hòa           │
│            │                      │ □ Đầu hàng              │
│            │                      │                        │
│            │                      │ Status: Chờ nước của Đen│
│            │                      │                        │
│            │                      │ [⋯ Thêm]               │
│            │                      │                        │
└──────────────┴──────────────────────┴──────────────────────────┘
```

### Text Wireframe — Mobile

```
┌────────────────────────────┐
│ Alice ⏱️ 14:32 | ☰ Menu    │
├────────────────────────────┤
│                            │
│  [   Bàn cờ 2D SVG   ]    │
│  [   Responsive      ]    │
│  [   Full width      ]    │
│                            │
├────────────────────────────┤
│ ⏱️ Bạn 14:55                │
│ ◼️ Nước của Đen            │
├────────────────────────────┤
│  [Đề nghị hòa]  [Đầu hàng]│
├────────────────────────────┤
│ ▲ Lịch sử nước (bottom    │
│   sheet, swipe up)        │
│                            │
│   1. h2-e2               │
│   2. c9-e7               │
│   3. h9-h0               │
│   (scroll)               │
└────────────────────────────┘
```

### Data needs per region

**Board area:**
- `position: Position` (current state)
- `legalMoves: Move[]` (highlight valid squares)
- `lastMove: Move | null` (animate/highlight)
- `selectedSquare: Square | null` (selection state)
- `history: Move[]` (for jump-on-click)

**Clocks:**
- `clocks: {red: ms, black: ms}`
- `activeColor: Color` (which clock is running)
- `timeControl: {base, increment}`

**Player info:**
- `players: {red: {name, session}, black: {name, session}}`
- `status: 'ACTIVE' | 'FINISHED'`
- `result?: {reason, winner}`

**Actions:**
- `canResign: boolean`
- `offerPendingFrom?: Color` (draw offer pending)
- `canDrawOffer: boolean` (rate limit)

### Notes

- **Desktop:** Drag-and-drop optional; click-click primary.
- **Mobile:** Tap-tap only; no drag initially.
- **Reconnect modal:** If socket lost >3s, show "Reconnecting..." and lock interactions.
- **Time update:** Use server-time offset, not setInterval (prevents drift).
- **Move animation:** Smooth piece slide, <300ms, doesn't block game logic.

---

## 3. `/puzzles/[id]` — Puzzle Board

**Route:** `/puzzles/[id]`  
**Mục tiêu:** Giải thế cờ với objective, gợi ý, thử lại.

### Component Inventory

| Thành phần | Dữ liệu | Hành động |
|---|---|---|
| **Header** | Puzzle title, difficulty badge, source/author | Back to /puzzles |
| **Objective box** | "Mục tiêu: Chiếu tướng Đen trong 3 nước" | Collapse/expand |
| **Hint button** | "Gợi ý (bạn có 3 gợi ý)" | Click → show hint, decrement |
| **Retry button** | "Thử lại" | Reset board to initial position |
| **Solution indicator** | "✓ Đúng! Bạn giải được." or "✗ Sai. Thử lại." | Show after each attempt |
| **Move entry** | Click quân + ô đích (tương tự GameBoard) | Validate vs. solution |
| **Next puzzle button** | "Puzzle tiếp theo →" (inactive if current unsolved) | Navigate |

### Text Wireframe

```
┌────────────────────────────────────┐
│ ◀ Puzzle > #42                     │
├────────────────────────────────────┤
│                                    │
│ Chiến thuật giành lợi thế         │
│ ⭐⭐ Trung bình                    │
│                                    │
│ ┌─ Mục tiêu ────────────────────┐ │
│ │ Chiếu tướng Đen trong 3 nước  │ │
│ │ (Mã-Tượng exchange tốt)      │ │
│ └────────────────────────────────┘ │
│                                    │
│     [  Bàn cờ Puzzle 2D  ]       │
│     [  SVG + Responsive ]       │
│     [                      ]       │
│                                    │
│ [Gợi ý (3 còn lại)] [Thử lại]   │
│                                    │
│ Status: ⏳ Đang giải              │
│ (hoặc)                             │
│ Status: ✓ Đúng! Bạn giải được!  │
│                                    │
│            [Puzzle tiếp theo →]   │
│                                    │
│ ──────────────────────────────────│
│ Nguồn: Kiến thức cơ bản           │
│ Tác giả: Coach Minh                │
│                                    │
└────────────────────────────────────┘
```

### Data needs

| Field | Type | Purpose |
|---|---|---|
| `puzzle.id` | UUID | Unique ID |
| `puzzle.title` | String | Display |
| `puzzle.objective` | String (Markdown) | Instruction |
| `puzzle.difficulty` | 1–5 | Badge |
| `puzzle.initialFen` | String | Setup |
| `puzzle.sideToMove` | 'red' \| 'black' | First player |
| `puzzle.solutionLines` | Move[][] | Valid solutions |
| `puzzle.allowedAlternatives` | Move[][] | Other acceptable moves |
| `puzzle.hints` | String[] | Up to 3 hints |
| `puzzle.source` | String | Author/book |
| `puzzleAttempt.moves` | Move[] | Player's moves so far |
| `puzzleAttempt.hintUsed` | number | Hint count |
| `puzzleAttempt.completed` | boolean | Solved? |

### Logic flow

```
1. Load puzzle.initialFen → render board
2. Puzzle state: IN_PROGRESS | SOLVED | HINT_REQUESTED
3. User click piece → show legal moves (from solutionLines + allowedAlternatives)
4. User move:
   - If matches solutionLines[0..N][move] → advance state
   - Else if matches allowedAlternatives → advance state (msg "Cách khác cũng được")
   - Else → show "Sai nước. Thử lại." (don't reset board, let them continue)
5. Detect end-of-puzzle:
   - If all moves in solutionLines played → SOLVED
   - Show "✓ Đúng!" + save progress
6. Hint: Show next hint in solutionLines[depth], decrement counter
7. Retry: Reset to initialFen, clear moves, clear hints used (partial reset)
```

### Notes

- **Solution check:** Position-based, not move-by-move string matching (allow transpositions if position equivalent).
- **Alternatives:** Some puzzles have multiple solutions; allow non-unique moves if in `allowedAlternatives`.
- **Hint system:** Up to 3 hints, each reveals next move in canonical solution line.
- **Retry:** Reset board but keep hint counter (teaches persistence).
- **Mobile:** Same layout as local game, full-width board.
- **Responsive:** On small screens, stack objective + hint box vertically.

---

## Summary

These three routes form the core UX loop for MVP:
1. **Local 2P:** Quick setup for tutorial/warm-up.
2. **Game board:** Main online experience, desktop/mobile-optimized.
3. **Puzzle:** Learning tool, integrated into same board renderer.

All use the same `Board2D` component for consistency. Data flows from controller → board props; board emits only UX interactions (clicks, drags), never game logic.
