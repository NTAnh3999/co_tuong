'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { GetPuzzleResponse, GetPuzzlesResponse } from '@xq/shared-contracts';
import type { PuzzleController, PuzzleControllerState } from '@/src/features/puzzle/controller/puzzle-controller';
import { createPuzzleController } from '@/src/features/puzzle/controller/puzzle-controller';
import ErrorState from '@/src/components/states/ErrorState';
import LoadingState from '@/src/components/states/LoadingState';
import { Board2D } from '@/src/features/game/board/Board2D';
import { useSession } from '@/src/features/session/use-session';
import { apiClient } from '@/src/lib/api-client';

const noopSubscribe = () => () => {};
const emptyState = (): PuzzleControllerState | null => null;

export default function PuzzleDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { user, status: sessionStatus } = useSession();
  const [puzzle, setPuzzle] = useState<GetPuzzleResponse | null>(null);
  const [controller, setController] = useState<PuzzleController | null>(null);
  const [puzzles, setPuzzles] = useState<GetPuzzlesResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  const recordedForSolve = useRef(false);
  const state = useSyncExternalStore(
    controller?.subscribe ?? noopSubscribe,
    controller?.getState ?? emptyState,
    controller?.getState ?? emptyState,
  );

  useEffect(() => {
    if (sessionStatus !== 'ready' || !user) return;
    let active = true;
    void Promise.all([apiClient.getPuzzle(id), apiClient.getPuzzles()]).then(([loadedPuzzle, loadedPuzzles]) => {
      if (!active) return;
      setPuzzle(loadedPuzzle);
      setController(createPuzzleController(loadedPuzzle));
      setPuzzles(loadedPuzzles);
    }).catch(() => {
      if (active) setLoadError(true);
    });
    return () => { active = false; };
  }, [id, sessionStatus, user?.id]);

  useEffect(() => {
    if (state?.status !== 'solved' || !puzzle || recordedForSolve.current) {
      if (state?.status !== 'solved') recordedForSolve.current = false;
      return;
    }
    recordedForSolve.current = true;
    void apiClient.recordPuzzleAttempt(id, { completed: true, hintsUsed: state.hintsRevealed }).catch(() => {
      // Puzzle completion remains visible even if progress recording is temporarily unavailable.
    });
  }, [id, puzzle, state]);

  if (sessionStatus === 'error' || !user || loadError) return <main className="mx-auto flex min-h-screen w-full max-w-3xl px-4 py-10"><ErrorState message="Không thể tải câu đố." /></main>;
  if (!puzzle || !controller || !state) return <main className="mx-auto flex min-h-screen w-full max-w-3xl px-4 py-10"><LoadingState message="Đang tải câu đố..." /></main>;

  const index = puzzles?.findIndex((item) => item.id === id) ?? -1;
  const nextPuzzle = index >= 0 ? puzzles?.[index + 1] : undefined;
  const lastMove = state.history[state.history.length - 1] ?? null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-5 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <Link href="/puzzles" className="inline-flex min-h-11 items-center text-sm underline">‹ Câu đố</Link>
        <span className="text-sm">Độ khó: {puzzle.difficulty}/5</span>
      </header>
      <h1 className="text-2xl font-bold">{puzzle.title}</h1>
      <section className="rounded-md border border-border p-4" aria-label="Mục tiêu">
        <h2 className="font-semibold">Mục tiêu</h2>
        <p className="mt-1 whitespace-pre-wrap">{puzzle.objective}</p>
      </section>

      <div className="mx-auto w-full max-w-[620px] overflow-x-auto">
        <Board2D
          position={state.position}
          orientation={puzzle.sideToMove}
          selectedSquare={state.selectedSquare}
          legalTargets={state.legalTargets}
          lastMove={lastMove}
          interactive={state.status === 'in_progress'}
          onSquareClick={controller.selectSquare}
          onMove={(move) => { controller.selectSquare(move.from); controller.selectSquare(move.to); }}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="min-h-11 rounded-md border border-border px-4 py-2 disabled:opacity-50" disabled={state.hintsRevealed >= puzzle.hints.length || state.status === 'solved'} onClick={controller.requestHint}>
          Gợi ý (còn {puzzle.hints.length - state.hintsRevealed} lượt)
        </button>
        <button className="min-h-11 rounded-md border border-border px-4 py-2" onClick={controller.retry}>Thử lại</button>
      </div>
      {state.hintsRevealed > 0 && <ol aria-label="Gợi ý đã mở" className="list-inside list-decimal space-y-1">{puzzle.hints.slice(0, state.hintsRevealed).map((hint, hintIndex) => <li key={hintIndex}>{hint}</li>)}</ol>}
      <p role="status" aria-live="polite">
        {state.status === 'solved' ? '✓ Đúng! Bạn giải được.' : state.lastMoveWasWrong ? 'Sai nước. Thử lại.' : 'Đang giải câu đố.'}
      </p>
      {nextPuzzle && (
        <div className="flex justify-end">
          <button className="min-h-11 rounded-md border border-border px-4 py-2 disabled:opacity-50" disabled={state.status !== 'solved'} onClick={() => router.push(`/puzzles/${nextPuzzle.id}`)}>
            Puzzle tiếp theo →
          </button>
        </div>
      )}
      <footer className="border-t border-border pt-4 text-sm text-muted-foreground">Nguồn / tác giả: {puzzle.source}</footer>
    </main>
  );
}
