'use client';

import { Suspense, use, useEffect, useState, useSyncExternalStore } from 'react';
import type { ReplayController } from '@/src/features/replay/controller/replay-controller';
import { createReplayController } from '@/src/features/replay/controller/replay-controller';
import { Board2D } from '@/src/features/game/board/Board2D';
import ErrorState from '@/src/components/states/ErrorState';
import LoadingState from '@/src/components/states/LoadingState';
import { resultText } from '@/src/features/game/components/result-text';
import { apiClient } from '@/src/lib/api-client';

type ReplayPageProps = { params: Promise<{ id: string }> };

export default function ReplayPage({ params }: ReplayPageProps) {
  return <Suspense fallback={<main className="mx-auto flex min-h-screen w-full max-w-xl px-4 py-10"><LoadingState message="Đang tải ván cờ..." /></main>}><ResolvedReplayPage params={params} /></Suspense>;
}

function ResolvedReplayPage({ params }: ReplayPageProps) {
  const { id } = use(params);
  return <ReplayGame key={id} gameId={id} />;
}

function ReplayGame({ gameId }: { gameId: string }) {
  const [controller, setController] = useState<ReplayController | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    void apiClient.getGame(gameId).then((snapshot) => {
      if (active) setController(createReplayController(snapshot));
    }).catch(() => {
      if (active) setLoadError(true);
    });
    return () => { active = false; };
  }, [gameId]);

  if (loadError) return <main className="mx-auto flex min-h-screen w-full max-w-xl px-4 py-10"><ErrorState message="Không thể tải thông tin ván cờ." /></main>;
  if (!controller) return <main className="mx-auto flex min-h-screen w-full max-w-xl px-4 py-10"><LoadingState message="Đang tải ván cờ..." /></main>;
  return <ReplayBoard controller={controller} />;
}

function ReplayBoard({ controller }: { controller: ReplayController }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
  const step = state.steps[state.currentPly]!;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 px-4 py-8 lg:flex-row lg:items-start">
      <section className="w-full max-w-xl">
        <Board2D
          position={step.position}
          orientation="red"
          selectedSquare={null}
          legalTargets={[]}
          lastMove={step.lastMove}
          interactive={false}
          onSquareClick={() => undefined}
          onMove={() => undefined}
        />
      </section>
      <aside className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-2xl font-bold">Xem lại ván cờ</h1>
        {state.result && <p role="status" className="rounded-md border border-border p-3">Kết quả: {resultText(state.result)}</p>}
        <p aria-live="polite">Nước đi: {state.currentPly} / {state.steps.length - 1}</p>
        <input
          aria-label="Chọn nước đi"
          type="range"
          min={0}
          max={state.steps.length - 1}
          step={1}
          value={state.currentPly}
          onChange={(event) => controller.goToPly(Number(event.currentTarget.value))}
        />
        <div className="flex gap-2">
          <button type="button" className="rounded-md border px-4 py-2" onClick={controller.previous} disabled={state.currentPly === 0}>Trước</button>
          <button type="button" className="rounded-md border px-4 py-2" onClick={controller.next} disabled={state.currentPly === state.steps.length - 1}>Tiếp</button>
        </div>
      </aside>
    </main>
  );
}
