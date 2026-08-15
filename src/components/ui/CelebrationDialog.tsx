import { useEffect, useRef } from 'react'

interface Props {
  savingsMonthly: number
  savingsYearly: number
  itemName: string
  onClose: () => void
}

const COLORS = ['#f87171', '#fb923c', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6']

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a)
}

export default function CelebrationDialog({
  savingsMonthly,
  savingsYearly,
  itemName,
  onClose,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const pieces = Array.from({ length: 120 }, () => ({
      x: randomBetween(0, canvas.width),
      y: randomBetween(-canvas.height * 0.5, -10),
      w: randomBetween(6, 12),
      h: randomBetween(10, 18),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      speed: randomBetween(2.5, 6),
      angle: randomBetween(0, Math.PI * 2),
      spin: randomBetween(-0.08, 0.08),
      drift: randomBetween(-1, 1),
    }))

    let animId: number
    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of pieces) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
        p.y += p.speed
        p.x += p.drift
        p.angle += p.spin
        if (p.y > canvas.height + 20) {
          p.y = -20
          p.x = randomBetween(0, canvas.width)
        }
      }
      animId = requestAnimationFrame(draw)
    }
    draw()

    const timer = setTimeout(() => {
      cancelAnimationFrame(animId)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }, 4000)

    return () => {
      cancelAnimationFrame(animId)
      clearTimeout(timer)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* バックドロップ */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* 紙吹雪キャンバス */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />
      {/* ダイアログ本体 */}
      <div
        className="relative z-10 bg-surface rounded-3xl shadow-2xl mx-6 p-7 text-center max-w-sm w-full"
        style={{ animation: 'celebrationPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="text-xl font-bold text-ink mb-1">おめでとうございます！</h2>
        <p className="text-sm text-ink-muted mb-5">
          <span className="font-semibold text-ink">「{itemName}」</span> を解約しました
        </p>

        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 space-y-1">
          <p className="text-xs text-green-600 font-medium">削減できる金額</p>
          <p className="text-2xl font-bold text-green-700">月 ¥{savingsMonthly.toLocaleString()}</p>
          <p className="text-sm text-green-600">年間 ¥{savingsYearly.toLocaleString()} の節約！</p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-primary-500 text-white font-semibold text-sm active:bg-primary-600"
        >
          やった！
        </button>
      </div>

      <style>{`
        @keyframes celebrationPop {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
