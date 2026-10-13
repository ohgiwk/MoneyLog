import { useEffect, useRef } from 'react'
import { animate, motion, useInView, useMotionValue, useTransform } from 'motion/react'

interface Props {
  value: number
  className?: string
}

// 整数を 0 からカウントアップして表示する。画面内に入った時に数え始め、値が変わるとそこから続きを数える
export default function CountUp({ value, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const count = useMotionValue(0)
  const text = useTransform(count, (v) => String(Math.round(v)))

  useEffect(() => {
    if (!inView) return
    const controls = animate(count, value, {
      duration: 0.6,
      ease: [0.32, 0.72, 0, 1],
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
