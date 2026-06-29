import { useEffect, useState } from 'react'
import { getUsdJpyRate, setUsdJpyRate } from '../lib/exchangeRate'
import { SAVE_SUCCESS_DISPLAY_MS } from '../constants'

interface Props {
  onBack: () => void
}

export default function ExchangeRateScreen({ onBack }: Props) {
  const [rate, setRate] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRate(getUsdJpyRate().toString())
  }, [])

  function save() {
    const v = parseFloat(rate)
    if (isNaN(v) || v <= 0) {
      setError('正しい為替レートを入力してください')
      return
    }
    setError(null)
    setUsdJpyRate(v)
    setSaved(true)
    setTimeout(() => setSaved(false), SAVE_SUCCESS_DISPLAY_MS)
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 active:text-slate-600 text-xl px-1">
            ←
          </button>
          <span className="font-bold text-lg text-slate-800">為替レート設定</span>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <div>
            <div className="text-sm font-medium text-slate-700 mb-1">USD / JPY レート</div>
            <div className="text-xs text-slate-400 mb-3">
              固定費をドル（USD）で入力した際に円換算に使用されます
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 shrink-0">1 USD =</span>
              <input
                type="number"
                inputMode="decimal"
                value={rate}
                onChange={(e) => { setRate(e.target.value); setError(null) }}
                placeholder="150"
                className={`flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 ${error ? 'border-rose-300' : 'border-slate-200'}`}
              />
              <span className="text-sm text-slate-500 shrink-0">円</span>
            </div>
            {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
          </div>

          <button
            onClick={save}
            className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold active:bg-emerald-600"
          >
            {saved ? '保存しました ✓' : '保存'}
          </button>
        </div>

        <div className="bg-amber-50 rounded-2xl p-4">
          <div className="text-xs text-amber-700 leading-relaxed">
            <span className="font-semibold">ご注意：</span>
            レートを変更しても、既に登録済みの円換算額は自動更新されません。
            変更後は各固定費を再保存してください。
          </div>
        </div>
      </div>
    </div>
  )
}
