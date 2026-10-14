// アプリ共通のアニメーション設定

// 出だしが速く、終わりがゆっくりなイージング（iOS の画面遷移に近い動き）
export const EASE_SOFT: [number, number, number, number] = [0.32, 0.72, 0, 1]

// ３点メニューなど、右上を起点に開くポップアップの開閉。
// 使う側で style={{ transformOrigin: 'top right' }} を指定する
export const MENU_POP = {
  initial: { opacity: 0, scale: 0.92, y: -6 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.92, y: -6 },
  transition: { duration: 0.15, ease: [0.2, 0, 0, 1] as [number, number, number, number] },
}
