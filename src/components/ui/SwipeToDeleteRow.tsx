import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'

interface Props {
  onDelete: () => void | Promise<void>
  deleteLabel?: string
  children: React.ReactNode
}

const ACTION_WIDTH = 72
const OPEN_VELOCITY = 300
// 行幅に対してこの割合を超えてスライドして離すと、ボタンを押さなくても削除する
const DELETE_THRESHOLD_RATIO = 0.5
const SPRING = { type: 'spring', stiffness: 500, damping: 40 } as const

export default function SwipeToDeleteRow({ onDelete, deleteLabel = '削除', children }: Props) {
  const [open, setOpen] = useState(false)
  const [willDelete, setWillDelete] = useState(false)
  const [removing, setRemoving] = useState(false)
  const x = useMotionValue(0)
  const actionWidth = useTransform(x, (v) => Math.max(ACTION_WIDTH, -v))
  // スライド量に応じてゴミ箱ボタンが拡大しながら現れる
  const iconScale = useTransform(x, [-ACTION_WIDTH, -12], [1, 0.4], { clamp: true })
  const iconOpacity = useTransform(x, [-ACTION_WIDTH * 0.6, -12], [1, 0], { clamp: true })
  // スライド中だけ行の右端を角丸にして影を付け、めくれている印象にする
  const edgeRadius = useTransform(x, [-20, 0], [14, 0], { clamp: true })
  const edgeShadow = useTransform(
    x,
    [-20, 0],
    ['4px 0 14px rgba(0, 0, 0, 0.14)', '4px 0 14px rgba(0, 0, 0, 0)'],
    { clamp: true }
  )
  const containerRef = useRef<HTMLDivElement>(null)
  // ドラッグ終了直後に発火する click で行のタップ処理が走らないようにする
  const draggedRef = useRef(false)

  function settle(nextOpen: boolean) {
    setOpen(nextOpen)
    void animate(x, nextOpen ? -ACTION_WIDTH : 0, SPRING)
  }

  function isPastDeleteThreshold() {
    const width = containerRef.current?.offsetWidth ?? 0
    return width > 0 && x.get() < -width * DELETE_THRESHOLD_RATIO
  }

  async function runDelete(slideOut: boolean) {
    try {
      if (slideOut) {
        setOpen(false)
        await animate(x, -(containerRef.current?.offsetWidth ?? 0), {
          duration: 0.18,
          ease: 'easeOut',
        })
        setRemoving(true)
      }
      await onDelete()
    } catch {
      // 削除に失敗したら行を元の位置に戻す
      setRemoving(false)
      setWillDelete(false)
      settle(false)
    }
  }

  useEffect(() => {
    if (!open) return
    function handleOutside(e: PointerEvent) {
      if (containerRef.current?.contains(e.target as Node)) return
      setOpen(false)
      void animate(x, 0, SPRING)
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [open, x])

  return (
    <motion.div
      ref={containerRef}
      initial={false}
      animate={{ height: removing ? 0 : 'auto' }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-danger-500/10" />
      {/* 閾値を超えたら、ボタンの位置から赤が広がって全面を塗る */}
      <div
        className="absolute inset-0 bg-danger-500 transition-[clip-path] duration-300 ease-out"
        style={{
          clipPath: `circle(${willDelete ? 150 : 0}% at calc(100% - ${ACTION_WIDTH / 2}px) 50%)`,
        }}
      />
      <motion.button
        onClick={() => void runDelete(false)}
        tabIndex={open ? 0 : -1}
        aria-label={deleteLabel}
        style={{ width: actionWidth }}
        className="group absolute inset-y-0 right-0 flex items-center justify-end"
      >
        <motion.span
          style={{ width: ACTION_WIDTH, scale: iconScale, opacity: iconOpacity }}
          className="flex items-center justify-center"
        >
          <motion.span
            initial={false}
            animate={{ scale: willDelete ? 1.15 : 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 18 }}
            className={
              'w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-colors duration-200 group-active:brightness-90 ' +
              (willDelete ? 'bg-white text-danger-500' : 'bg-danger-500 text-white')
            }
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </motion.span>
        </motion.span>
      </motion.button>
      <motion.div
        drag={removing ? false : 'x'}
        dragDirectionLock
        dragConstraints={{ right: 0 }}
        dragElastic={0}
        dragMomentum={false}
        style={{
          x,
          borderTopRightRadius: edgeRadius,
          borderBottomRightRadius: edgeRadius,
          boxShadow: edgeShadow,
        }}
        onDragStart={() => {
          draggedRef.current = true
        }}
        onDrag={() => setWillDelete(isPastDeleteThreshold())}
        onDragEnd={(_, info) => {
          // click は pointerup の直後に同期的に来るので、その後にフラグを戻す
          setTimeout(() => {
            draggedRef.current = false
          }, 0)
          if (isPastDeleteThreshold()) {
            void runDelete(true)
            return
          }
          setWillDelete(false)
          const shouldOpen =
            info.velocity.x < -OPEN_VELOCITY ||
            (info.velocity.x <= OPEN_VELOCITY && x.get() < -ACTION_WIDTH / 2)
          settle(shouldOpen)
        }}
        onClickCapture={(e) => {
          if (draggedRef.current) {
            e.stopPropagation()
            return
          }
          if (open) {
            e.stopPropagation()
            settle(false)
          }
        }}
        className="relative bg-surface overflow-hidden"
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
