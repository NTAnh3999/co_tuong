'use client';

import type { GameResult } from '@xq/xiangqi-core';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { resultText } from './result-text';

export interface ResultDialogProps {
  /** Dialog is open iff this is non-null. */
  readonly result: GameResult | null;
  readonly onRematch?: () => void;
  readonly onClose: () => void;
}

export function ResultDialog({ result, onRematch, onClose }: ResultDialogProps) {
  return (
    <Dialog
      open={result !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogTitle>Ván cờ kết thúc</DialogTitle>
        <DialogDescription>{result ? resultText(result) : ''}</DialogDescription>
        <DialogFooter>
          {onRematch && <Button onClick={onRematch}>Chơi lại</Button>}
          <Button variant="outline" onClick={onClose}>Xem bàn cờ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
