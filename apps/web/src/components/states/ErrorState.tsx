import { Button } from "@/components/ui/button"

type ErrorStateProps = {
  message: string
  actionLabel?: string
  onAction?: () => void
}

export default function ErrorState({ message, actionLabel, onAction }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center" role="alert">
      <p className="text-sm text-destructive">{message}</p>
      {actionLabel && onAction ? (
        <Button onClick={onAction} variant="outline">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
