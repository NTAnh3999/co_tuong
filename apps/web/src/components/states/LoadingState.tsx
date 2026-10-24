type LoadingStateProps = {
  message?: string
}

export default function LoadingState({ message = "Đang tải..." }: LoadingStateProps) {
  return (
    <div aria-live="polite" className="flex items-center gap-3 py-4 text-sm text-muted-foreground" role="status">
      <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      <span>{message}</span>
    </div>
  )
}
