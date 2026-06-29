import { useRef, useState } from 'react'
import { profileService } from '../lib/services/profileService'
import { wishlistService } from '../lib/services/wishlistService'

interface Props {
  userId: string
  onComplete: () => void
}

const TOTAL_PAGES = 4

export default function OnboardingScreen({ userId, onComplete }: Props) {
  const [page, setPage] = useState(0)
  const [wishName, setWishName] = useState('')
  const [wishPrice, setWishPrice] = useState('')
  const [income, setIncome] = useState('')
  const [saving, setSaving] = useState(false)

  const touchStartX = useRef<number | null>(null)

  const goNext = () => setPage((p) => Math.min(p + 1, TOTAL_PAGES - 1))
  const goPrev = () => setPage((p) => Math.max(p - 1, 0))

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (diff > 50) goNext()
    else if (diff < -50) goPrev()
    touchStartX.current = null
  }

  const saveAndNext = async () => {
    setSaving(true)
    try {
      if (page === 1) {
        const price = Number(wishPrice) || 0
        localStorage.setItem('moneylog_wishlist', JSON.stringify({ name: wishName, price }))
        const existing = await wishlistService.fetchByUser(userId)
        await wishlistService.insert({
          user_id: userId,
          name: wishName,
          target_amount: price,
          priority: existing.length + 1,
          purchased_at: null,
          notes: null,
        })
      } else if (page === 2) {
        await profileService.update(userId, { monthly_income: Number(income) || null })
      }
      goNext()
    } finally {
      setSaving(false)
    }
  }

  const canProceed = () => {
    if (page === 1) return wishName.trim() !== '' && wishPrice !== ''
    if (page === 2) return income !== ''
    return true
  }

  return (
    <div
      className="h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col max-w-md mx-auto"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ドットインジケーター */}
      <div className="flex justify-center gap-2 pt-10 pb-2">
        {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
          <span
            key={i}
            className={`block rounded-full transition-all duration-300 ${
              i === page ? 'w-6 h-2 bg-emerald-500' : 'w-2 h-2 bg-slate-300'
            }`}
          />
        ))}
      </div>

      {/* カルーセルコンテンツ */}
      <div className="flex-1 overflow-hidden min-h-0">
        <div
          className="flex h-full transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${page * (100 / TOTAL_PAGES)}%)`, width: `${TOTAL_PAGES * 100}%` }}
        >
          {/* Page 1: Welcome */}
          <div className="flex flex-col items-center justify-center px-8 text-center h-full" style={{ width: `${100 / TOTAL_PAGES}%` }} {...(page !== 0 ? { inert: '' } : {})}>
            <div className="text-6xl mb-6">🌱</div>
            <h1 className="text-2xl font-bold text-slate-800 mb-4">
              マネログへようこそ！
            </h1>
            <p className="text-slate-600 leading-relaxed mb-4">
              このアプリは、<span className="text-emerald-600 font-semibold">節約</span>に特化した家計管理アプリです。
            </p>
            <p className="text-slate-500 text-sm leading-relaxed mb-4">
              むずかしい操作は一切なし。毎月の支出を記録するだけで、どこを削れるか一目でわかるようになります。
            </p>
            <p className="text-slate-500 text-sm leading-relaxed">
              まずは簡単な初期設定をいっしょにやってみましょう 😊
            </p>
          </div>

          {/* Page 2: 今一番欲しいもの */}
          <div className="flex flex-col justify-center px-8 h-full" style={{ width: `${100 / TOTAL_PAGES}%` }} {...(page !== 1 ? { inert: '' } : {})}>
            <div className="text-5xl mb-4 text-center">🎁</div>
            <h2 className="text-xl font-bold text-slate-800 mb-2 text-center">
              今いちばん欲しいものは？
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6 text-center">
              目標があると節約のモチベーションが上がります！
              気軽に入力してみてください ✨
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">商品名</label>
                <input
                  type="text"
                  value={wishName}
                  onChange={(e) => setWishName(e.target.value)}
                  placeholder="例：新しいスニーカー"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">金額（円）</label>
                <input
                  type="number"
                  value={wishPrice}
                  onChange={(e) => setWishPrice(e.target.value)}
                  placeholder="例：12000"
                  inputMode="numeric"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Page 3: 先月の収入 */}
          <div className="flex flex-col justify-center px-8 h-full" style={{ width: `${100 / TOTAL_PAGES}%` }} {...(page !== 2 ? { inert: '' } : {})}>
            <div className="text-5xl mb-4 text-center">💼</div>
            <h2 className="text-xl font-bold text-slate-800 mb-2 text-center">
              先月の収入を教えてください
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6 text-center">
              収入をもとに、無理のない節約プランを考えていきます。
              だいたいの金額で大丈夫ですよ 🙂
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">先月の手取り収入（円）</label>
              <input
                type="number"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="例：250000"
                inputMode="numeric"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              />
            </div>
          </div>

          {/* Page 4: 固定費の重要性 */}
          <div className="flex flex-col justify-center px-8 text-center h-full" style={{ width: `${100 / TOTAL_PAGES}%` }} {...(page !== 3 ? { inert: '' } : {})}>
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              節約は「固定費」から始めよう
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-4">
              毎月かならず出ていく固定費（家賃・通信費・サブスクなど）を見直すと、
              一度の手間で毎月ずっと節約できます。
            </p>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              まずは固定費を登録して、削減できるものを一緒に探しましょう 💪
            </p>
            <button
              onClick={onComplete}
              className="w-full bg-emerald-500 active:bg-emerald-600 text-white font-semibold py-4 rounded-xl text-base transition-colors"
            >
              固定費を設定する →
            </button>
          </div>
        </div>
      </div>

      {/* ナビゲーションボタン（最終ページは非表示） */}
      <div className="px-8 pb-10 pt-4">
        {page < TOTAL_PAGES - 1 && (
          <>
            <button
              onClick={saveAndNext}
              disabled={!canProceed() || saving}
              className="w-full bg-emerald-500 active:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-4 rounded-xl text-base transition-colors"
            >
              {saving ? '保存中...' : '次へ →'}
            </button>
            {page > 0 && (
              <button
                onClick={goPrev}
                className="w-full mt-3 text-slate-400 text-sm py-2 active:text-slate-600"
              >
                ← 戻る
              </button>
            )}
          </>
        )}
        {page === 0 && (
          <button
            onClick={onComplete}
            className="w-full mt-3 text-slate-400 text-sm py-2 active:text-slate-600"
          >
            スキップ
          </button>
        )}
      </div>
    </div>
  )
}
