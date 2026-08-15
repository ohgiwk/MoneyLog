import Card from './ui/Card'
import Input from './ui/Input'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PAYMENT_TYPES, type PaymentType } from '../constants'
import { usePaymentMethods } from '../hooks/usePaymentMethods'
import ScreenHeader from './ui/ScreenHeader'

const MANAGED_TYPES = PAYMENT_TYPES.filter((t) => t.type !== 'cash')

export default function PaymentMethodsScreen() {
  const navigate = useNavigate()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const { methods, defaultPayment, addMethod, removeMethod, setDefaultPayment } =
    usePaymentMethods()
  const [newNames, setNewNames] = useState<Record<PaymentType, string>>({
    cash: '',
    credit_card: '',
    emoney: '',
    qr: '',
  })

  function handleAdd(type: PaymentType) {
    const name = newNames[type]
    if (!name.trim()) return
    addMethod(type, name)
    setNewNames((prev) => ({ ...prev, [type]: '' }))
  }

  function isDefault(type: PaymentType, name: string | null) {
    return defaultPayment.type === type && defaultPayment.name === name
  }

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-subtle flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 bg-surface border-b border-line-subtle">
        <ScreenHeader title="支払い方法" onBack={() => navigate(-1)} />
      </div>

      <div className="flex-1 p-4 space-y-3 overflow-y-auto pb-8">
        {/* デフォルトの支払い方法 */}
        <Card>
          <div className="px-4 py-3 border-b border-line-subtle">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
              デフォルトの支払い方法
            </span>
          </div>
          <div className="p-3 space-y-1.5">
            <button
              onClick={() => setDefaultPayment({ type: 'cash', name: null })}
              className={
                'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left border ' +
                (isDefault('cash', null)
                  ? 'border-primary-400 bg-primary-50 text-primary-700'
                  : 'border-line-subtle bg-surface-subtle text-ink')
              }
            >
              <span className="text-lg">💵</span>
              <span className="flex-1">現金</span>
              {isDefault('cash', null) && (
                <span className="text-primary-500 text-xs font-semibold">✓</span>
              )}
            </button>
            {methods.length === 0 ? (
              <p className="text-xs text-ink-muted px-3 py-2">
                クレジットカード・電子マネー・QRコード決済の支払い方法を下から登録できます
              </p>
            ) : (
              methods.map((m) => {
                const typeInfo = PAYMENT_TYPES.find((t) => t.type === m.type)
                return (
                  <button
                    key={m.id}
                    onClick={() => setDefaultPayment({ type: m.type, name: m.name })}
                    className={
                      'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left border ' +
                      (isDefault(m.type, m.name)
                        ? 'border-primary-400 bg-primary-50 text-primary-700'
                        : 'border-line-subtle bg-surface-subtle text-ink')
                    }
                  >
                    <span className="text-lg">{typeInfo?.icon}</span>
                    <span className="flex-1">{m.name}</span>
                    <span className="text-xs text-ink-muted">{typeInfo?.name}</span>
                    {isDefault(m.type, m.name) && (
                      <span className="text-primary-500 text-xs font-semibold">✓</span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </Card>

        {/* 種別ごとの管理 */}
        {MANAGED_TYPES.map((t) => {
          const list = methods.filter((m) => m.type === t.type)
          return (
            <Card key={t.type}>
              <div className="px-4 py-3 border-b border-line-subtle flex items-center gap-2">
                <span className="text-lg">{t.icon}</span>
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
                  {t.name}
                </span>
              </div>
              <div className="p-3 space-y-1.5">
                {list.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-subtle text-sm text-ink"
                  >
                    <span className="flex-1">{m.name}</span>
                    <button
                      onClick={() => removeMethod(m.id)}
                      className="text-ink-muted active:text-danger-500 text-xs px-1"
                      aria-label={`${m.name}を削除`}
                    >
                      削除
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newNames[t.type]}
                    onChange={(e) => setNewNames((prev) => ({ ...prev, [t.type]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAdd(t.type)
                    }}
                    placeholder={`例: ${t.type === 'credit_card' ? '楽天カード' : t.type === 'emoney' ? 'Suica' : 'PayPay'}`}
                    className="flex-1"
                  />
                  <button
                    onClick={() => handleAdd(t.type)}
                    disabled={!newNames[t.type].trim()}
                    className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium active:bg-primary-600 disabled:opacity-40"
                  >
                    追加
                  </button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
