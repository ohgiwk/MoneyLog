export default function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <svg width="48" height="48" viewBox="0 0 48 48" className="animate-spin" style={{ animationDuration: '0.9s', animationTimingFunction: 'steps(12, end)' }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <rect
            key={i}
            x="21.5" y="3" width="5" height="13" rx="2.5"
            fill="#475569"
            opacity={Math.max(0.15, 1 - i / 12)}
            transform={`rotate(${i * 30} 24 24)`}
          />
        ))}
      </svg>
    </div>
  )
}
