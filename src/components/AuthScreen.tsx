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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💰</div>
          <h1 className="text-2xl font-bold text-slate-800">マネログ</h1>
          <p className="text-xs text-slate-400">MoneyLog</p>
          <p className="text-sm text-slate-500 mt-1 font-medium">本気の節約家計簿</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setMode('signin')}
              className={
                'flex-1 py-2 rounded-lg text-sm font-semibold transition ' +
                (mode === 'signin' ? 'bg-white shadow text-slate-800' : 'text-slate-400')
              }
            >
              ログイン
            </button>
            <button
              onClick={() => setMode('signup')}
              className={
                'flex-1 py-2 rounded-lg text-sm font-semibold transition ' +
                (mode === 'signup' ? 'bg-white shadow text-slate-800' : 'text-slate-400')
              }
            >
              新規登録
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              required
            />
            <input
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              required
            />
            {error && <p className="text-xs text-rose-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm disabled:opacity-50"
            >
              {loading ? '...' : mode === 'signin' ? 'ログイン' : 'アカウントを作成'}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400">または</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <button
            onClick={() => signInWithGoogle()}
            className="w-full py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 flex items-center justify-center gap-2 active:bg-slate-50"
          >
            <span>G</span> Googleでログイン
          </button>
        </div>
      </div>
    </div>
  )
}
