'use client';

import { Suspense, use, useEffect, useState } from 'react';
import type { LessonDetail } from '@xq/shared-contracts';
import { fromFen } from '@xq/xiangqi-core';
import type { Square } from '@xq/xiangqi-core';
import { Board2D } from '@/src/features/game/board/Board2D';
import ErrorState from '@/src/components/states/ErrorState';
import LoadingState from '@/src/components/states/LoadingState';
import { useSession } from '@/src/features/session/use-session';
import { apiClient } from '@/src/lib/api-client';

type LessonPageProps = { params: Promise<{ slug: string }> };

export default function LessonPage({ params }: LessonPageProps) {
  return (
    <Suspense fallback={<main className="mx-auto flex min-h-screen w-full max-w-xl px-4 py-10"><LoadingState message="Đang tải bài học..." /></main>}>
      <ResolvedLessonPage params={params} />
    </Suspense>
  );
}

function ResolvedLessonPage({ params }: LessonPageProps) {
  const { slug } = use(params);
  return <Lesson key={slug} slug={slug} />;
}

function Lesson({ slug }: { slug: string }) {
  const { user, status } = useSession();
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (status !== 'ready' || !user) return;
    let active = true;
    void apiClient.getLesson(slug).then((loadedLesson) => {
      if (active) setLesson(loadedLesson);
    }).catch(() => {
      if (active) setLoadError(true);
    });
    return () => { active = false; };
  }, [slug, status, user?.id]);

  if (status === 'loading' || (status === 'ready' && user && lesson === null && !loadError)) {
    return <main className="mx-auto flex min-h-screen w-full max-w-xl px-4 py-10"><LoadingState message="Đang tải bài học..." /></main>;
  }
  if (status === 'error' || !user || loadError || !lesson || lesson.steps.length === 0) {
    return <main className="mx-auto flex min-h-screen w-full max-w-xl px-4 py-10"><ErrorState message="Không thể tải bài học này." /></main>;
  }

  const stepIndex = Math.min(currentStep, lesson.steps.length - 1);
  const step = lesson.steps[stepIndex]!;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 px-4 py-8 lg:flex-row lg:items-start">
      <section className="w-full max-w-xl" aria-label="Bàn cờ bài học">
        <Board2D
          position={fromFen(step.fen)}
          orientation="red"
          selectedSquare={null}
          legalTargets={step.highlightSquares as Square[]}
          lastMove={null}
          interactive={false}
          onSquareClick={() => undefined}
          onMove={() => undefined}
        />
      </section>
      <aside className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-2xl font-bold">{lesson.title}</h1>
        <p aria-live="polite" className="text-sm text-muted-foreground">Bước {stepIndex + 1} / {lesson.steps.length}</p>
        <p className="rounded-md border border-border p-4">{step.caption}</p>
        <div className="flex gap-2">
          <button type="button" className="rounded-md border px-4 py-2" onClick={() => setCurrentStep((value) => Math.max(0, value - 1))} disabled={stepIndex === 0}>Trước</button>
          <button type="button" className="rounded-md border px-4 py-2" onClick={() => setCurrentStep((value) => Math.min(lesson.steps.length - 1, value + 1))} disabled={stepIndex === lesson.steps.length - 1}>Tiếp</button>
        </div>
        <ol aria-label="Các bước bài học" className="flex flex-wrap gap-2">
          {lesson.steps.map((lessonStep, index) => (
            <li key={`${index}-${lessonStep.fen}`}>
              <button
                type="button"
                className="rounded-md border px-3 py-2"
                aria-current={stepIndex === index ? 'step' : undefined}
                onClick={() => setCurrentStep(index)}
              >
                {index + 1}
              </button>
            </li>
          ))}
        </ol>
      </aside>
    </main>
  );
}
