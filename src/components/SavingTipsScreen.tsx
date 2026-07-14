import Card from './ui/Card'
import ScreenHeader from './ui/ScreenHeader'

interface Props {
  onBack: () => void
}

const TIPS: string[] = [
  '買い物前に必要なものをリストアップし、リストにないものは買わないようにしましょう',
  '空腹時のスーパーでの買い物は避け、衝動買いを防ぎましょう',
  '固定費（サブスク・保険・通信費）を年に一度は見直しましょう',
  '使っていないサブスクリプションは解約しましょう',
  'クレジットカードの明細を毎月チェックし、不要な支払いに気づけるようにしましょう',
  '先取り貯蓄で毎月一定額を自動的に貯金用口座に移しましょう',
  '電気・ガス・水道の使用量を定期的に確認し、無駄を減らしましょう',
  '外食の回数を週に1〜2回に決めて自炊を増やしましょう',
  'まとめ買いより必要な分だけ買い、食品ロスを減らしましょう',
  'プライベートブランド（PB）商品を積極的に活用しましょう',
  'ポイント還元率の高いキャッシュレス決済を1つに絞って使いましょう',
  '格安SIMへの乗り換えで通信費を見直しましょう',
  '電力会社やプロバイダの乗り換えキャンペーンを活用しましょう',
  '「欲しいもの」は即決せず、1週間寝かせてから判断しましょう',
  '賞味期限の近いものから使い切る「先入れ先出し」を徹底しましょう',
  '飲み物は水筒を持参し、コンビニでの購入を減らしましょう',
  'コンビニではなくスーパーで日用品をまとめて買いましょう',
  '週に一度、冷蔵庫の中身を確認してから買い物リストを作りましょう',
  '不要になったものはフリマアプリで売って現金化しましょう',
  '家計簿を毎日つけて、支出を「見える化」しましょう',
  '月ごとの予算を決め、カテゴリ別に使いすぎをチェックしましょう',
  '銀行口座を「生活費用」「貯蓄用」「特別費用」に分けましょう',
  'セール品でも本当に必要かどうかを一度立ち止まって考えましょう',
  '自動販売機やコンビニでの少額出費を意識して減らしましょう',
  '定期購入（消耗品）は単価を比較してコスパの良いものを選びましょう',
  '美容院やジムなどは頻度を見直し、無理のない範囲に調整しましょう',
  '光熱費が上がる季節前に節電・節水グッズを準備しましょう',
  '車を使う頻度が低いならカーシェアやレンタカーへの切り替えを検討しましょう',
  '友人との外出は割り勘アプリで管理し、立て替えを溜め込まないようにしましょう',
  '大きな買い物は「1ヶ月以内に3回検討する」ルールを設けて衝動買いを防ぎましょう',
]

export default function SavingTipsScreen({ onBack }: Props) {
  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-subtle flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 bg-surface border-b border-line-subtle">
        <ScreenHeader title="節約のコツ" onBack={onBack} />
      </div>

      <div className="flex-1 p-4 overflow-y-auto pb-8">
        <Card>
          {TIPS.map((tip, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-line-subtle' : ''}`}
            >
              <span className="shrink-0 w-6 h-6 rounded-full bg-primary-50 text-primary-600 text-xs font-semibold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-ink leading-relaxed">{tip}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
