'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { GetPuzzlesResponse } from '@xq/shared-contracts';
import ErrorState from '@/src/components/states/ErrorState';
import LoadingState from '@/src/components/states/LoadingState';
import { useSession } from '@/src/features/session/use-session';
import { apiClient } from '@/src/lib/api-client';

export default function PuzzlesPage() {
  const { user, status } = useSession();
  const [puzzles, setPuzzles] = useState<GetPuzzlesResponse | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (status !== 'ready' || !user) return;
    let active = true;
    void apiClient.getPuzzles().then((loaded) => {
      if (active) setPuzzles(loaded);
    }).catch(() => {
      if (active) setLoadError(true);
    });
    return () => { active = false; };
  }, [status, user?.id]);

  if (status === 'loading' || (status === 'ready' && user && puzzles === null && !loadError)) {
    return <main className="mx-auto flex min-h-screen w-full max-w-3xl px-4 py-10"><LoadingState message="Đang tải danh sách câu đố..." /></main>;
  }
  if (status === 'error' || !user || loadError) {
    return <main className="mx-auto flex min-h-screen w-full max-w-3xl px-4 py-10"><ErrorState message="Không thể tải danh sách câu đố." /></main>;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold">Câu đố cờ tướng</h1>
      {puzzles?.length === 0 ? <p>Hiện chưa có câu đố nào.</p> : (
        <ul className="flex flex-col gap-3">
          {puzzles?.map((puzzle) => (
            <li key={puzzle.id}>
              <Link className="flex items-center justify-between gap-3 rounded-md border border-border p-4 hover:bg-muted" href={`/puzzles/${puzzle.id}`}>
                <span className="font-semibold">{puzzle.title}</span>
                <span aria-label={`Độ khó ${puzzle.difficulty}`} className="text-sm">Độ khó: {puzzle.difficulty}/5</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
