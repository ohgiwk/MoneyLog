import Card from './ui/Card'
import { useEffect, useState } from 'react'
import {
  MONTH_START_DAY_MIN,
  MONTH_START_DAY_MAX,
  SAVE_SUCCESS_DISPLAY_MS,
} from '../constants'
import { useProfileQuery, useProfileMutation } from '../hooks/queries/useProfileQuery'
import { useQueryClient } from '@tanstack/react-query'
import ScreenHeader from './ui/ScreenHeader'
import { TabGroup } from './ui/TabGroup'
import type { ThemeMode } from '../hooks/useTheme'

interface Props {
  userId: string
  themeMode: ThemeMode
  onThemeModeChange: (mode: ThemeMode) => void
  onCategoryEdit: () => void
  onExchangeRate: () => void
  onPaymentMethods: () => void
  onBack: () => void
}

export default function SettingsScreen({
  userId,
  themeMode,
  onThemeModeChange,
  onCategoryEdit,
  onExchangeRate,
  onPaymentMethods,
  onBack,
}: Props) {
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  const { data: profile } = useProfileQuery(userId)
  const monthStartDay = profile?.month_start_day ?? 1
  const profileMutation = useProfileMutation(userId)

  async function saveMonthStartDay(value: number) {
    setSaving(true)
    await profileMutation.mutateAsync({ month_start_day: value })
    // 集計期間の起点が変わるため、transactions キャッシュを無効化する
    void queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
    void queryClient.invalidateQueries({ queryKey: ['availableMonths', userId] })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), SAVE_SUCCESS_DISPLAY_MS)
  }

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-subtle flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 bg-surface border-b border-line-subtle">
        <ScreenHeader title="設定" onBack={onBack} />
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {/* 家計の設定 */}
        <Card>
          <div className="px-4 py-3 border-b border-line-subtle">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
              家計
            </span>
          </div>
          <div className="px-4 py-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-ink">月の開始日</div>
                <div className="text-xs text-ink-muted">
                  ホーム画面の累計・記録タブの集計期間の起点に使用
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => saveMonthStartDay(Math.max(MONTH_START_DAY_MIN, monthStartDay - 1))}
                  className="w-8 h-8 rounded-full bg-surface-hover text-ink font-bold active:bg-surface-muted"
                >
                  −
                </button>
                <span className="text-lg font-semibold text-ink w-6 text-center">
                  {monthStartDay}
                </span>
                <button
                  onClick={() => saveMonthStartDay(Math.min(MONTH_START_DAY_MAX, monthStartDay + 1))}
                  className="w-8 h-8 rounded-full bg-surface-hover text-ink font-bold active:bg-surface-muted"
                >
                  ＋
                </button>
              </div>
            </div>
            {(saving || saved) && (
              <div className="text-xs text-primary-500 text-right">
                {saving ? '保存中...' : '保存しました'}
              </div>
            )}
          </div>
        </Card>

        {/* 表示設定 */}
        <Card>
          <div className="px-4 py-3 border-b border-line-subtle">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
              表示設定
            </span>
          </div>
          <div className="px-4 py-4 flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-ink">テーマ</div>
            <div className="w-56">
              <TabGroup
                tabs={[
                  { key: 'light', label: 'ライト' },
                  { key: 'dark', label: 'ダーク' },
                  { key: 'system', label: '端末設定' },
                ]}
                active={themeMode}
                onChange={onThemeModeChange}
                size="sm"
              />
            </div>
          </div>
        </Card>

        {/* カスタマイズ */}
        <Card>
          <div className="px-4 py-3 border-b border-line-subtle">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
              カスタマイズ
            </span>
          </div>
          <button
            onClick={onCategoryEdit}
            className="w-full flex items-center gap-3 px-4 py-4 active:bg-surface-subtle border-b border-line-subtle"
          >
            <span className="text-xl">🏷️</span>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-ink">カテゴリ編集</div>
              <div className="text-xs text-ink-muted">支出・収入・固定費のカテゴリを編集</div>
            </div>
            <span className="text-ink-subtle text-lg">›</span>
          </button>
          <button
            onClick={onExchangeRate}
            className="w-full flex items-center gap-3 px-4 py-4 active:bg-surface-subtle border-b border-line-subtle"
          >
            <span className="text-xl">💱</span>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-ink">為替レート設定</div>
              <div className="text-xs text-ink-muted">USD/JPY レートを設定（固定費のドル入力に使用）</div>
            </div>
            <span className="text-ink-subtle text-lg">›</span>
          </button>
          <button
            onClick={onPaymentMethods}
            className="w-full flex items-center gap-3 px-4 py-4 active:bg-surface-subtle"
          >
            <span className="text-xl">💳</span>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-ink">支払い方法</div>
              <div className="text-xs text-ink-muted">クレジットカード・電子マネー・QR決済の登録とデフォルト設定</div>
            </div>
            <span className="text-ink-subtle text-lg">›</span>
          </button>
        </Card>
      </div>
    </div>
  )
}
