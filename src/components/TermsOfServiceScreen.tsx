import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ScreenHeader from './ui/ScreenHeader'
import Card from './ui/Card'

const sections = [
  {
    title: '1. 総則',
    content: '本利用規約（以下「本規約」）は、キンカク手帖（以下「本アプリ」）の利用条件を定めるものです。ユーザーは本規約に同意した上で本アプリをご利用ください。',
  },
  {
    title: '2. 利用資格',
    content: '本アプリは、有効なメールアドレスを持ち、本規約に同意したユーザーがご利用いただけます。13歳未満の方のご利用はお断りしております。',
  },
  {
    title: '3. アカウント',
    content: 'ユーザーはアカウントの認証情報を安全に管理する責任を負います。アカウントの不正使用が発覚した場合は、速やかにご連絡ください。',
  },
  {
    title: '4. 禁止事項',
    content: '以下の行為を禁止します。',
    items: [
      '本アプリの逆コンパイル・リバースエンジニアリング',
      '他のユーザーのデータへの不正アクセス',
      '本アプリのサーバーやネットワークへの過度な負荷をかける行為',
      '法令または公序良俗に反する行為',
    ],
  },
  {
    title: '5. データの取り扱い',
    content: 'ユーザーが本アプリに入力したデータはユーザー本人に帰属します。本アプリの利用を通じて生じたデータの損失について、開発者は責任を負いません。定期的なエクスポート等によるバックアップを推奨します。',
  },
  {
    title: '6. 免責事項',
    content: '本アプリは家計管理の補助ツールであり、提供する情報は参考目的に限ります。本アプリの利用に起因して生じた損害について、開発者は一切の責任を負いません。',
  },
  {
    title: '7. サービスの変更・終了',
    content: '開発者は予告なく本アプリの機能変更・サービス終了を行う場合があります。重大な変更がある場合はアプリ内でお知らせします。',
  },
  {
    title: '8. 規約の変更',
    content: '本規約は必要に応じて改定することがあります。改定後も本アプリをご利用いただいた場合、新しい規約に同意したものとみなします。',
  },
  {
    title: '9. 準拠法',
    content: '本規約は日本法を準拠法とし、本アプリに関する紛争は日本の裁判所を専属的合意管轄とします。',
  },
]

export default function TermsOfServiceScreen() {
  const navigate = useNavigate()
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-subtle flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 bg-surface border-b border-line-subtle">
        <ScreenHeader title="利用規約" onBack={() => navigate(-1)} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <p className="text-xs text-ink-muted px-1">最終更新日：2025年8月14日</p>
        <Card>
          <div className="px-4 py-4 space-y-5">
            {sections.map((section) => (
              <div key={section.title} className="space-y-1.5">
                <h2 className="text-sm font-semibold text-ink-strong">{section.title}</h2>
                <p className="text-sm text-ink leading-relaxed">{section.content}</p>
                {section.items && (
                  <ul className="space-y-1 pt-0.5">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-ink-muted leading-relaxed">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-ink-muted/50 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>
        <div className="pb-8" />
      </div>
    </div>
  )
}
