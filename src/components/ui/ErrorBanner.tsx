interface ErrorBannerProps {
  message: string | null | undefined
  className?: string
}

export default function ErrorBanner({ message, className = '' }: ErrorBannerProps) {
  if (!message) return null
  return (
    <div
      className={`bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600${className ? ` ${className}` : ''}`}
    >
      {message}
    </div>
  )
}
