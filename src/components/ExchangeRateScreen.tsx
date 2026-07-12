import { useState } from 'react'
import { getUsdJpyRate, setUsdJpyRate } from '../lib/exchangeRate'
import { SAVE_SUCCESS_DISPLAY_MS } from '../constants'
import ScreenHeader from './ui/ScreenHeader'

interface Props {
  onBack: () => void
}

export default function ExchangeRateScreen({ onBack }: Props) {
  const [rate, setRate] = useState(() => getUsdJpyRate().toString())
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-subtle flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 bg-surface border-b border-line-subtle">
        <ScreenHeader title="為替レート設定" onBack={onBack} />
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="bg-surface rounded-2xl shadow-sm p-4 space-y-4">
          <div>
            <div className="text-sm font-medium text-ink mb-1">USD / JPY レート</div>
            <div className="text-xs text-ink-muted mb-3">
              固定費をドル（USD）で入力した際に円換算に使用されます
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-muted shrink-0">1 USD =</span>
              <input
                type="number"
                inputMode="decimal"
                value={rate}
                onChange={(e) => { setRate(e.target.value); setError(null) }}
                placeholder="150"
                className={`flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 ${error ? 'border-danger-300' : 'border-line'}`}
              />
              <span className="text-sm text-ink-muted shrink-0">円</span>
            </div>
            {error && <p className="text-xs text-danger-500 mt-1">{error}</p>}
          </div>

          <button
            onClick={save}
            className="w-full py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold active:bg-primary-600"
          >
            {saved ? '保存しました ✓' : '保存'}
          </button>
        </div>

        <div className="bg-warning-50 rounded-2xl p-4">
          <div className="text-xs text-warning-700 leading-relaxed">
            <span className="font-semibold">ご注意：</span>
            レートを変更しても、既に登録済みの円換算額は自動更新されません。
            変更後は各固定費を再保存してください。
          </div>
        </div>
      </div>
    </div>
  )
}
