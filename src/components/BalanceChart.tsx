import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { EASE_SOFT } from '../lib/motion'
import { formatYen } from '../utils'

export interface BalanceSegment {
  label: string
  value: number
  // 柱の塗り（Tailwind の bg-* クラス）
  color: string
}

interface Props {
  income: BalanceSegment
  // 収入から順に差し引く項目。並び順がそのまま柱の順になる
  outflows: BalanceSegment[]
  // 最後の「収支」の柱の塗り。黒字・赤字は 0 の線の上下で表すので色は固定
  balanceColor: string
}

interface Step {
  label: string
  value: number
  color: string
  // 柱の上端・下端の金額
  top: number
  bottom: number
  // 柱が伸びる向き。差し引く項目は上から下へ落ちるように伸ばす
  grow: 'up' | 'down'
}

function buildSteps(income: BalanceSegment, outflows: BalanceSegment[], balanceColor: string) {
  const steps: Step[] = [
    { ...income, top: Math.max(0, income.value), bottom: Math.min(0, income.value), grow: 'up' },
  ]
  let running = income.value
  for (const s of outflows) {
    const next = running - s.value
    steps.push({
      ...s,
      top: Math.max(running, next),
      bottom: Math.min(running, next),
      grow: 'down',
    })
    running = next
  }
  steps.push({
    label: '収支',
    value: running,
    color: balanceColor,
    top: Math.max(0, running),
    bottom: Math.min(0, running),
    grow: running >= 0 ? 'up' : 'down',
  })
  return steps
}

// 収入から固定費・貯蓄・出費を順に差し引き、最後に残る収支までを柱でたどるウォーターフォール
export function BalanceChart({ income, outflows, balanceColor }: Props) {
  const [active, setActive] = useState<string | null>(null)
  const steps = buildSteps(income, outflows, balanceColor)
  const max = Math.max(0, ...steps.map((s) => s.top))
  const min = Math.min(0, ...steps.map((s) => s.bottom))
  const range = max - min
  if (range <= 0) return null

  // 金額 → 描画領域の下端からの位置（%）
  const pos = (v: number) => ((v - min) / range) * 100
  const activeIndex = steps.findIndex((s) => s.label === active)
  const activeStep = activeIndex >= 0 ? steps[activeIndex] : undefined
  // ツールチップは押した柱の真上に出す。端の柱ではカードからはみ出さないよう端に寄せる
  const tooltipPosition =
    activeIndex === 0
      ? { left: 0 }
      : activeIndex === steps.length - 1
        ? { right: 0 }
        : { left: `${((activeIndex + 0.5) / steps.length) * 100}%`, transform: 'translateX(-50%)' }

  return (
    <div className="pt-1">
      <div className="relative h-32">
        {/* 0 の線。赤字で柱が下にはみ出したときの基準になる */}
        <div
          aria-hidden
          className="absolute inset-x-0 h-px bg-line"
          style={{ bottom: `${pos(0)}%` }}
        />
        <div className="absolute inset-0 flex">
          {steps.map((s, i) => {
            const height = pos(s.top) - pos(s.bottom)
            return (
              <button
                key={s.label}
                type="button"
                className="relative flex-1 h-full"
                onMouseEnter={() => setActive(s.label)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setActive(active === s.label ? null : s.label)}
                aria-label={`${s.label} ${formatYen(Math.round(s.value))}`}
              >
                <AnimatePresence>
                  <motion.span
                    key="bar"
                    className={
                      'absolute inset-x-[22%] min-h-[2px] rounded transition-opacity ' +
                      s.color +
                      (s.grow === 'down' ? ' origin-top' : ' origin-bottom') +
                      (active && active !== s.label ? ' opacity-40' : '')
                    }
                    style={{ bottom: `${pos(s.bottom)}%`, height: `${height}%` }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.5, ease: EASE_SOFT, delay: 0.1 + i * 0.12 }}
                  />
                </AnimatePresence>
              </button>
            )
          })}
        </div>
        {activeStep && (
          <div
            role="tooltip"
            style={tooltipPosition}
            className="absolute bottom-full mb-1 z-10 px-2.5 py-1 rounded-lg bg-surface border border-line shadow-md text-xs whitespace-nowrap pointer-events-none"
          >
            <span className="text-ink-muted">{activeStep.label}</span>
            <span className="ml-2 font-semibold text-ink-strong">
              {formatYen(Math.round(activeStep.value))}
            </span>
            {activeStep.label !== income.label && income.value > 0 && (
              <span className="ml-1.5 text-ink-muted">
                収入の{Math.round((activeStep.value / income.value) * 100)}%
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex mt-1.5">
        {steps.map((s) => (
          <span key={s.label} className="flex-1 text-center text-[11px] text-ink-muted">
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}
