import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsdJpyRate, setUsdJpyRate } from '../lib/exchangeRate'
import { SAVE_SUCCESS_DISPLAY_MS } from '../constants'
import ScreenHeader from './ui/ScreenHeader'
import Input from './ui/Input'
import Button from './ui/Button'
import ErrorText from './ui/ErrorText'

export default function ExchangeRateScreen() {
  const navigate = useNavigate()
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
        <ScreenHeader title="為替レート設定" onBack={() => navigate(-1)} />
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
              <Input
                type="number"
                inputMode="decimal"
                value={rate}
                onChange={(e) => {
                  setRate(e.target.value)
                  setError(null)
                }}
                placeholder="150"
                error={!!error}
                className="flex-1 w-auto"
              />
              <span className="text-sm text-ink-muted shrink-0">円</span>
            </div>
            <ErrorText>{error}</ErrorText>
          </div>

          <Button fullWidth size="sm" onClick={save} disabled={saved}>
            {saved ? '保存しました ✓' : '保存する'}
          </Button>
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
