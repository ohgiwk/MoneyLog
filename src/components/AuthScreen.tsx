import { type FormEvent, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function AuthScreen() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fn = mode === 'signin' ? signInWithEmail : signUpWithEmail
    const { error } = await fn(email, password)
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-surface-subtle flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💰</div>
          <h1 className="text-2xl font-bold text-ink-strong">マネログ</h1>
          <p className="text-xs text-ink-muted">MoneyLog</p>
          <p className="text-sm text-ink-muted mt-1 font-medium">本気の節約家計簿</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm p-6 space-y-4">
          {/* モード切り替え */}
          <div className="flex rounded-xl bg-surface-hover p-1" role="tablist" aria-label="認証モード">
            <button
              role="tab"
              aria-selected={mode === 'signin'}
              onClick={() => setMode('signin')}
              className={
                'flex-1 py-2 rounded-lg text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary-300 ' +
                (mode === 'signin' ? 'bg-surface shadow text-ink-strong' : 'text-ink-muted')
              }
            >
              ログイン
            </button>
            <button
              role="tab"
              aria-selected={mode === 'signup'}
              onClick={() => setMode('signup')}
              className={
                'flex-1 py-2 rounded-lg text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary-300 ' +
                (mode === 'signup' ? 'bg-surface shadow text-ink-strong' : 'text-ink-muted')
              }
            >
              新規登録
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="email" className="sr-only">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                placeholder="メールアドレス"
                aria-label="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                placeholder="パスワード"
                aria-label="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-line rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                required
              />
            </div>
            {error && <p className="text-xs text-danger-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1"
            >
              {loading ? '...' : mode === 'signin' ? 'ログイン' : 'アカウントを作成'}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-surface-hover" />
            <span className="text-xs text-ink-muted">または</span>
            <div className="flex-1 h-px bg-surface-hover" />
          </div>

          <button
            onClick={() => signInWithGoogle()}
            className="w-full py-3 rounded-xl border border-line text-sm font-semibold text-ink flex items-center justify-center gap-2 active:bg-surface-subtle focus:outline-none focus:ring-2 focus:ring-primary-300"
          >
            <span aria-hidden="true">G</span> Googleでログイン
          </button>
        </div>
      </div>
    </div>
  )
}
