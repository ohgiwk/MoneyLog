interface Props {
  ratio: number
  color?: string
}

export default function ProgressBar({ ratio, color = '#10b981' }: Props) {
  const pct = Math.min(ratio * 100, 100)
  const isOver = ratio > 1
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: isOver ? '#ef4444' : color }}
      />
    </div>
  )
}
