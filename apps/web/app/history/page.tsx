'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { GetMyGamesResponse } from '@xq/shared-contracts';
import ErrorState from '@/src/components/states/ErrorState';
import LoadingState from '@/src/components/states/LoadingState';
import { resultText } from '@/src/features/game/components/result-text';
import { useSession } from '@/src/features/session/use-session';
import { apiClient } from '@/src/lib/api-client';

export default function HistoryPage() {
  const { user, status } = useSession();
  const [games, setGames] = useState<GetMyGamesResponse['games'] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (status !== 'ready' || !user) return;
    let active = true;
    void apiClient.getMyGames().then(({ games: loadedGames }) => {
      if (active) setGames(loadedGames);
    }).catch(() => {
      if (active) setLoadError(true);
    });
    return () => { active = false; };
  }, [status, user?.id]);

  if (status === 'loading' || (status === 'ready' && games === null && !loadError)) {
    return <main className="mx-auto flex min-h-screen w-full max-w-3xl px-4 py-10"><LoadingState message="Đang tải lịch sử ván cờ..." /></main>;
  }
  if (status === 'error' || !user || loadError) {
    return <main className="mx-auto flex min-h-screen w-full max-w-3xl px-4 py-10"><ErrorState message="Không thể tải lịch sử ván cờ." /></main>;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-bold">Lịch sử ván cờ</h1>
      {games?.length === 0 ? <p>Bạn chưa có ván cờ nào.</p> : (
        <ul className="flex flex-col gap-3">
          {games?.map((game) => (
            <li key={game.gameId}>
              <Link className="flex flex-col gap-1 rounded-md border border-border p-4 hover:bg-muted" href={`/history/${game.gameId}`}>
                <span className="font-semibold">Đối thủ: {game.opponent?.nickname ?? 'Máy'}</span>
                <span>Trạng thái: {game.status === 'FINISHED' ? 'Đã kết thúc' : game.status === 'ACTIVE' ? 'Đang diễn ra' : game.status === 'ABORTED' ? 'Đã hủy' : 'Đang chờ'}</span>
                {game.result && <span>Kết quả: {resultText(game.result)}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
