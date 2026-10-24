'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { LessonSummary } from '@xq/shared-contracts';
import ErrorState from '@/src/components/states/ErrorState';
import LoadingState from '@/src/components/states/LoadingState';
import { useSession } from '@/src/features/session/use-session';
import { apiClient } from '@/src/lib/api-client';

const LEVEL_LABELS = {
  beginner: 'Cơ bản',
  intermediate: 'Trung bình',
  advanced: 'Nâng cao',
} as const;

const LEVEL_ORDER: LessonSummary['level'][] = ['beginner', 'intermediate', 'advanced'];

export default function LearnPage() {
  const { user, status } = useSession();
  const [lessons, setLessons] = useState<LessonSummary[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (status !== 'ready' || !user) return;
    let active = true;
    void apiClient.getLessons().then((loadedLessons) => {
      if (active) setLessons(loadedLessons);
    }).catch(() => {
      if (active) setLoadError(true);
    });
    return () => { active = false; };
  }, [status, user?.id]);

  if (status === 'loading' || (status === 'ready' && user && lessons === null && !loadError)) {
    return <main className="mx-auto flex min-h-screen w-full max-w-3xl px-4 py-10"><LoadingState message="Đang tải bài học..." /></main>;
  }
  if (status === 'error' || !user || loadError) {
    return <main className="mx-auto flex min-h-screen w-full max-w-3xl px-4 py-10"><ErrorState message="Không thể tải danh sách bài học." /></main>;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold">Bài học cờ tướng</h1>
      {lessons?.length === 0 ? <p>Hiện chưa có bài học nào.</p> : (
        <div className="flex flex-col gap-6">
          {LEVEL_ORDER.map((level) => {
            const levelLessons = lessons?.filter((lesson) => lesson.level === level) ?? [];
            if (levelLessons.length === 0) return null;
            return (
              <section key={level} aria-labelledby={`level-${level}`} className="flex flex-col gap-3">
                <h2 id={`level-${level}`} className="text-xl font-semibold">{LEVEL_LABELS[level]}</h2>
                <ul className="flex flex-col gap-3">
                  {levelLessons.map((lesson) => (
                    <li key={lesson.slug}>
                      <Link className="block rounded-md border border-border p-4 font-medium hover:bg-muted" href={`/learn/${lesson.slug}`}>
                        {lesson.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
