'use client';

import { useEffect, useState } from 'react';
import { ABANDONMENT_THRESHOLD_MS } from '@xq/shared-contracts';
import { Button } from '@/components/ui/button';

export interface OpponentPresenceBannerProps {
  /** Timestamp (ms since epoch) the opponent's socket disconnected, per the server's clock. */
  readonly disconnectedAt: number;
  readonly onClaimWin: () => void;
}

export function OpponentPresenceBanner({ disconnectedAt, onClaimWin }: OpponentPresenceBannerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const remainingMs = disconnectedAt + ABANDONMENT_THRESHOLD_MS - now;
  const canClaim = remainingMs <= 0;

  return (
    <div role="status" className="flex w-full flex-col items-center gap-2 rounded-md bg-amber-100 px-4 py-3 text-center text-sm text-amber-950">
      {canClaim ? (
        <>
          <p>Đối phương đã mất kết nối quá lâu. Bạn có thể chờ thêm hoặc tuyên bố thắng.</p>
          <Button size="sm" variant="destructive" onClick={onClaimWin}>Tuyên bố thắng</Button>
        </>
      ) : (
        <p>Đối phương bị mất kết nối. Đang chờ kết nối lại... ({Math.ceil(remainingMs / 1000)}s)</p>
      )}
    </div>
  );
}
