import { useContext } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { InViewContext } from './inViewContext'
import { EASE_SOFT } from '../../lib/motion'

interface Props {
  // バーの長さ（0〜100）
  pct: number
  // 何番目のバーか。先頭から順に少しずつ遅らせて伸ばす
  index: number
  // x: 横棒（幅が伸びる） / y: 縦棒（高さが伸びる）
  axis: 'x' | 'y'
  className: string
}

// グラフのバー。画面内に入った時に 0 から伸び、値が変わると新しい長さへ動く
export function GrowBar({ pct, index, axis, className }: Props) {
  const size = axis === 'x' ? 'width' : 'height'
  const inView = useContext(InViewContext)
  return (
    // 画面遷移用の AnimatePresence initial={false} が配下の初期アニメーションを止めるため、
    // 専用の AnimatePresence で包んでバーが必ず 0 から伸びるようにする
    <AnimatePresence>
      <motion.div
        key="bar"
        className={className}
        initial={{ [size]: 0 }}
        animate={{ [size]: inView ? `${pct}%` : 0 }}
        transition={{
          duration: 0.6,
          ease: EASE_SOFT,
          // 縦棒は本数が多い（最大で1か月の日数）ので、ずらす間隔を短くする
          delay: 0.1 + index * (axis === 'x' ? 0.06 : 0.015),
        }}
      />
    </AnimatePresence>
  )
}
