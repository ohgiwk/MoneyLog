import { useEffect, useRef } from 'react'
import { animate, motion, useInView, useMotionValue, useTransform } from 'motion/react'
import { EASE_SOFT } from '../../lib/motion'

interface Props {
  value: number
  // 表示用の整形（既定はそのままの整数）
  format?: (n: number) => string
  className?: string
}

// 整数を 0 からカウントアップして表示する。画面内に入った時に数え始め、値が変わるとそこから続きを数える
export default function CountUp({ value, format = String, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const count = useMotionValue(0)
  // 0 へ向かう負の端数は Math.round で -0 になり「-0」と表示されるため + 0 で正規化する
  const text = useTransform(count, (v) => format(Math.round(v) + 0))

  useEffect(() => {
    if (!inView) return
    const controls = animate(count, value, {
      duration: 0.6,
      ease: EASE_SOFT,
      delay: 0.1,
    })
    return () => controls.stop()
  }, [count, value, inView])

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  )
}
