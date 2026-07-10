import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'

export type NavDirection = 'forward' | 'back'

// forward: 新しい画面が手前（zIndex 1）、戻る: 今の画面が手前のまま右へ抜け、
// 前の画面は奥（zIndex 0）から現れる。DOM の描画順だけに頼ると、戻る時に
// 前の画面が一瞬手前に飛び出して見える（チラつき）ため、方向ごとに重なり順を明示する。
const variants = {
  enter: (direction: NavDirection) => ({
    x: direction === 'forward' ? '100%' : '-30%',
    zIndex: direction === 'forward' ? 1 : 0,
  }),
  center: (direction: NavDirection) => ({
    x: 0,
    zIndex: direction === 'forward' ? 1 : 0,
  }),
  exit: (direction: NavDirection) => ({
    x: direction === 'forward' ? '-30%' : '100%',
    zIndex: direction === 'forward' ? 0 : 1,
  }),
}

interface Props {
  pageKey: string
  direction: NavDirection
  children: ReactNode
  className?: string
  fillHeight?: boolean
}

// iOS 風の画面遷移: 進む時は次の画面が右から重なるようにスライドし、
// 戻る時は現在の画面が右へスライドして下から前の画面が現れる
// grid-area を全アイテムで重ねることで、絶対配置と違いコンテナが最大の子要素に合わせて自然に高さを持つ
//
// fillHeight: true の場合、motion.div の高さを常にコンテナいっぱい（=ビューポート）に固定する。
// これにより、中身が position: fixed な要素（ヘッダー・ボトムナビ等）を含んでいても、
// transform を持つ motion.div が containing block になった際に高さがコンテンツ量で伸縮せず、
// fixed 要素が本来のビューポート位置からズレない。アニメーションと一緒に fixed 要素も動かしたい
// 画面（アプリ全体のシェル）で使う。
export default function PageTransition({ pageKey, direction, children, className, fillHeight }: Props) {
  return (
    <div
      className={'relative overflow-hidden grid' + (className ? ' ' + className : '')}
      style={{ gridTemplateRows: fillHeight ? '100%' : undefined }}
    >
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={pageKey}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.32 },
            zIndex: { duration: 0 },
          }}
          style={{ gridArea: '1 / 1', minHeight: 0, height: fillHeight ? '100%' : undefined }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
