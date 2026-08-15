interface Props {
  year: string
  onPrev: () => void
  onNext: () => void
}

export default function YearSwitcher({ year, onPrev, onNext }: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-line-subtle">
      <button
        onClick={onPrev}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-hover text-ink-muted active:bg-surface-muted text-xl"
      >
        ‹
      </button>
      <span className="text-sm font-semibold text-ink-strong">{year}年</span>
      <button
        onClick={onNext}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-hover text-ink-muted active:bg-surface-muted text-xl"
      >
        ›
      </button>
    </div>
  )
}
