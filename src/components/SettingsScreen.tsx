import { useEffect, useState } from 'react'
import {
  MONTH_START_DAY_MIN,
  MONTH_START_DAY_MAX,
  SAVE_SUCCESS_DISPLAY_MS,
} from '../constants'
import { profileService } from '../lib/services/profileService'
import { cacheInvalidateTable } from '../lib/cache'
import ScreenHeader from './ui/ScreenHeader'

interface Props {
  userId: string
  onCategoryEdit: () => void
  onExchangeRate: () => void
  onPaymentMethods: () => void
  onBack: () => void
}

export default function SettingsScreen({ userId, onCategoryEdit, onExchangeRate, onPaymentMethods, onBack }: Props) {
  const [monthStartDay, setMonthStartDay] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  useEffect(() => {
    profileService.fetchById(userId).then((p) => {
      if (p) {
        setMonthStartDay(p.month_start_day ?? 1)
      }
    })
  }, [userId])

  async function saveMonthStartDay(value: number) {
    setSaving(true)
    await profileService.update(userId, { month_start_day: value })
    // 集計期間の起点が変わるため、キャッシュ済みの出費データを無効化する
    cacheInvalidateTable('transactions')
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), SAVE_SUCCESS_DISPLAY_MS)
  }

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-slate-50 flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100">
        <ScreenHeader title="設定" onBack={onBack} />
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {/* 家計の設定 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              家計
            </span>
          </div>
          <div className="px-4 py-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-700">月の開始日</div>
                <div className="text-xs text-slate-400">
                  ホーム画面の累計・記録タブの集計期間の起点に使用
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const v = Math.max(MONTH_START_DAY_MIN, monthStartDay - 1)
                    setMonthStartDay(v)
                    saveMonthStartDay(v)
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold active:bg-slate-200"
                >
                  −
                </button>
                <span className="text-lg font-semibold text-slate-700 w-6 text-center">
                  {monthStartDay}
                </span>
                <button
                  onClick={() => {
                    const v = Math.min(MONTH_START_DAY_MAX, monthStartDay + 1)
                    setMonthStartDay(v)
                    saveMonthStartDay(v)
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold active:bg-slate-200"
                >
                  ＋
                </button>
              </div>
            </div>
            {(saving || saved) && (
              <div className="text-xs text-emerald-500 text-right">
                {saving ? '保存中...' : '保存しました'}
              </div>
            )}
          </div>
        </div>

        {/* カスタマイズ */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              カスタマイズ
            </span>
          </div>
          <button
            onClick={onCategoryEdit}
            className="w-full flex items-center gap-3 px-4 py-4 active:bg-slate-50 border-b border-slate-50"
          >
            <span className="text-xl">🏷️</span>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-slate-700">カテゴリ編集</div>
              <div className="text-xs text-slate-400">支出・収入・固定費のカテゴリを編集</div>
            </div>
            <span className="text-slate-300 text-lg">›</span>
          </button>
          <button
            onClick={onExchangeRate}
            className="w-full flex items-center gap-3 px-4 py-4 active:bg-slate-50 border-b border-slate-50"
          >
            <span className="text-xl">💱</span>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-slate-700">為替レート設定</div>
              <div className="text-xs text-slate-400">USD/JPY レートを設定（固定費のドル入力に使用）</div>
            </div>
            <span className="text-slate-300 text-lg">›</span>
          </button>
          <button
            onClick={onPaymentMethods}
            className="w-full flex items-center gap-3 px-4 py-4 active:bg-slate-50"
          >
            <span className="text-xl">💳</span>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-slate-700">支払い方法</div>
              <div className="text-xs text-slate-400">クレジットカード・電子マネー・QR決済の登録とデフォルト設定</div>
            </div>
            <span className="text-slate-300 text-lg">›</span>
          </button>
        </div>
      </div>
    </div>
  )
}
