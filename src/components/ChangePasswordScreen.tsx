import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../lib/services/authService'
import ScreenHeader from './ui/ScreenHeader'

export default function ChangePasswordScreen() {
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }
    setLoading(true)
    const { error: apiError } = await authService.updatePassword(newPassword)
    setLoading(false)
    if (apiError) {
      setError(apiError.message)
    } else {
      setSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-subtle flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 bg-surface border-b border-line-subtle">
        <ScreenHeader title="パスワード変更" onBack={() => navigate(-1)} />
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          {success && (
            <div className="bg-income-50 dark:bg-income-950/30 border border-income-200 dark:border-income-800 rounded-xl px-4 py-3 text-sm text-income-700 dark:text-income-400">
              パスワードを変更しました
            </div>
          )}

          <div className="bg-surface rounded-xl shadow-sm p-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-ink-muted">新しいパスワード</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="6文字以上"
                className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-lg border border-line bg-surface-subtle text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-muted">新しいパスワード（確認）</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="もう一度入力"
                className="mt-1.5 w-full px-3 py-2.5 text-sm rounded-lg border border-line bg-surface-subtle text-ink placeholder-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            {error && <div className="text-xs text-danger-500">{error}</div>}
          </div>

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full py-3.5 rounded-2xl bg-primary-500 text-white text-sm font-semibold active:bg-primary-600 disabled:opacity-50 shadow-sm"
          >
            {loading ? '変更中...' : '変更する'}
          </button>
        </form>
      </div>
    </div>
  )
}
