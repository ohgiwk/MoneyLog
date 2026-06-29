import { useEffect, useState } from 'react'
import { HOUSEHOLD_MEMBERS_MIN, HOUSEHOLD_MEMBERS_MAX, SAVE_SUCCESS_DISPLAY_MS } from '../constants'
import { profileService } from '../lib/services/profileService'

interface Props {
  userId: string
  onCategoryEdit: () => void
  onExchangeRate: () => void
  onBack: () => void
}

export default function SettingsScreen({ userId, onCategoryEdit, onExchangeRate, onBack }: Props) {
  const [householdMembers, setHouseholdMembers] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  useEffect(() => {
    profileService.fetchById(userId).then((p) => {
      if (p) setHouseholdMembers(p.household_members ?? 1)
    })
  }, [userId])

  async function saveHouseholdMembers(value: number) {
    setSaving(true)
    await profileService.update(userId, { household_members: value })
    setSaving(false)
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
          <span className="font-bold text-lg text-slate-800">設定</span>
        </div>
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {/* 定期購入の設定 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              定期購入
            </span>
          </div>
          <div className="px-4 py-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-700">同居人数</div>
                <div className="text-xs text-slate-400">定期購入の消費サイクル計算に使用</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const v = Math.max(HOUSEHOLD_MEMBERS_MIN, householdMembers - 1)
                    setHouseholdMembers(v)
                    saveHouseholdMembers(v)
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold active:bg-slate-200"
                >
                  −
                </button>
                <span className="text-lg font-semibold text-slate-700 w-6 text-center">
                  {householdMembers}
                </span>
                <button
                  onClick={() => {
                    const v = Math.min(HOUSEHOLD_MEMBERS_MAX, householdMembers + 1)
                    setHouseholdMembers(v)
                    saveHouseholdMembers(v)
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
            className="w-full flex items-center gap-3 px-4 py-4 active:bg-slate-50"
          >
            <span className="text-xl">💱</span>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-slate-700">為替レート設定</div>
              <div className="text-xs text-slate-400">USD/JPY レートを設定（固定費のドル入力に使用）</div>
            </div>
            <span className="text-slate-300 text-lg">›</span>
          </button>
        </div>
      </div>
    </div>
  )
}
