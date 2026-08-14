import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ScreenHeader from './ui/ScreenHeader'
import Card from './ui/Card'

const sections = [
  {
    title: '1. はじめに',
    content: 'キンカク手帖（以下「本アプリ」）は、ユーザーのプライバシーを尊重し、個人情報を適切に管理することをお約束します。本ポリシーは、本アプリが収集する情報、その利用方法、およびユーザーの権利について説明します。',
  },
  {
    title: '2. 収集する情報',
    content: '本アプリは以下の情報を収集します。',
    items: [
      'メールアドレス（アカウント登録・認証に使用）',
      'ユーザーが入力した家計データ（支出・収入・固定費・予算など）',
      'アプリ設定情報（テーマ・月の開始日など）',
    ],
  },
  {
    title: '3. 情報の利用目的',
    content: '収集した情報は以下の目的にのみ使用します。',
    items: [
      'アカウントの作成・認証・管理',
      '家計データの保存・同期・表示',
      'アプリ機能の提供および改善',
    ],
  },
  {
    title: '4. 第三者への提供',
    content: '本アプリは、法令に基づく場合を除き、ユーザーの個人情報を第三者に販売・貸与・開示しません。なお、本アプリはバックエンドとして Supabase を利用しており、データはそのサービス上に保存されます。',
  },
  {
    title: '5. データの保存と安全性',
    content: 'ユーザーデータは Supabase のセキュアなクラウド環境に保存されます。Row Level Security（行レベルセキュリティ）により、各ユーザーは自分のデータにのみアクセスできます。',
  },
  {
    title: '6. データの削除',
    content: 'アカウントおよびすべての関連データの削除をご希望の場合は、マイページの「アカウントを削除する」からお手続きいただけます。',
  },
  {
    title: '7. ポリシーの変更',
    content: '本ポリシーは必要に応じて改定することがあります。重要な変更がある場合はアプリ内でお知らせします。',
  },
  {
    title: '8. お問い合わせ',
    content: 'プライバシーに関するご質問は、マイページのお問い合わせフォームよりご連絡ください。',
  },
]

export default function PrivacyPolicyScreen() {
  const navigate = useNavigate()
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-subtle flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 bg-surface border-b border-line-subtle">
        <ScreenHeader title="プライバシーポリシー" onBack={() => navigate(-1)} />
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
