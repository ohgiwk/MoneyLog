import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { authService } from '../lib/services/authService'
import { useAppContext } from '../contexts/AppContext'
import ScreenHeader from './ui/ScreenHeader'

interface Props {
  userId: string
}

export default function MyPageScreen({ userId }: Props) {
  const navigate = useNavigate()
  const { user, signOut } = useAppContext()

  const [recordDays, setRecordDays] = useState<number | null>(null)
  const [recordCount, setRecordCount] = useState<number | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // パスワード変更
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  // 退会
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    async function fetchStats() {
      const { data } = await supabase
        .from('transactions')
        .select('date')
        .eq('user_id', userId)
      if (data) {
        setRecordCount(data.length)
        setRecordDays(new Set(data.map((t) => t.date)).size)
      }
      setStatsLoading(false)
    }
    fetchStats()
  }, [userId])

  async function handlePasswordChange() {
    setPasswordError('')
    if (newPassword.length < 6) {
      setPasswordError('パスワードは6文字以上で入力してください')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('パスワードが一致しません')
      return
    }
    setPasswordLoading(true)
    const { error } = await authService.updatePassword(newPassword)
    setPasswordLoading(false)
    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true)
    setDeleteError('')
    const { error } = await authService.deleteAccount()
    if (error) {
      setDeleteError('退会に失敗しました。しばらくしてから再度お試しください。')
      setDeleteLoading(false)
    } else {
      await signOut()
    }
  }

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-subtle flex flex-col overflow-hidden">
      <ScreenHeader title="マイページ" onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">
        {/* 累計記録 */}
        <div className="bg-surface rounded-xl p-4 shadow-sm">
          <div className="text-sm font-semibold text-ink mb-3">累計記録</div>
          {statsLoading ? (
            <div className="text-sm text-ink-muted">読み込み中...</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-subtle rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary-500">{recordDays ?? 0}</div>
                <div className="text-xs text-ink-muted mt-0.5">記録日数</div>
              </div>
              <div className="bg-surface-subtle rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary-500">{recordCount ?? 0}</div>
                <div className="text-xs text-ink-muted mt-0.5">記録回数</div>
              </div>
            </div>
          )}
        </div>

        {/* 分析 */}
        <div className="bg-surface rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => navigate('/analytics')}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm text-ink active:bg-surface-subtle"
          >
            <span className="flex items-center gap-2">
              <span>📊</span>
              分析
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* パスワード変更 */}
        <div className="bg-surface rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => { setShowPasswordForm(f => !f); setPasswordSuccess(false); setPasswordError('') }}
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm text-ink active:bg-surface-subtle"
          >
            <span className="flex items-center gap-2">
              <span>🔑</span>
              パスワードを変更
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-ink-muted transition-transform ${showPasswordForm ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showPasswordForm && (
            <div className="px-4 pb-4 space-y-3 border-t border-line-subtle">
              {passwordSuccess && (
                <div className="text-xs text-income-600 pt-3">パスワードを変更しました</div>
              )}
              <div className="pt-3">
                <label className="text-xs text-ink-muted">新しいパスワード</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="6文字以上"
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-line bg-surface-subtle text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <div>
                <label className="text-xs text-ink-muted">新しいパスワード（確認）</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="もう一度入力"
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-line bg-surface-subtle text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
              {passwordError && (
                <div className="text-xs text-danger-500">{passwordError}</div>
              )}
              <button
                onClick={handlePasswordChange}
                disabled={passwordLoading || !newPassword}
                className="w-full py-2.5 rounded-lg bg-primary-500 text-white text-sm font-semibold active:bg-primary-600 disabled:opacity-50"
              >
                {passwordLoading ? '変更中...' : '変更する'}
              </button>
            </div>
          )}
        </div>

        {/* 退会 */}
        <div className="bg-surface rounded-xl shadow-sm overflow-hidden">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center gap-2 px-4 py-3.5 text-sm text-danger-500 active:bg-danger-50"
            >
              <span>🗑️</span>
              アカウントを退会する
            </button>
          ) : (
            <div className="p-4 space-y-3">
              <div className="text-sm font-semibold text-ink">本当に退会しますか？</div>
              <div className="text-xs text-ink-muted">すべてのデータが削除され、元に戻すことはできません。</div>
              {deleteError && (
                <div className="text-xs text-danger-500">{deleteError}</div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteError('') }}
                  className="flex-1 py-2.5 rounded-lg border border-line text-sm text-ink active:bg-surface-subtle"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex-1 py-2.5 rounded-lg bg-danger-500 text-white text-sm font-semibold active:bg-danger-600 disabled:opacity-50"
                >
                  {deleteLoading ? '処理中...' : '退会する'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
