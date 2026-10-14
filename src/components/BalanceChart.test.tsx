import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BalanceChart } from './BalanceChart'

const income = { label: '収入', value: 200000, color: 'bg-income' }
const outflows = [
  { label: '固定費', value: 100000, color: 'bg-fixed' },
  { label: '貯蓄', value: 50000, color: 'bg-savings' },
  { label: '出費', value: 0, color: 'bg-expense' },
]

// 柱（ボタン内の span）の下端・高さ（%）を取り出す
function barOf(name: RegExp) {
  const bar = screen.getByRole('button', { name }).querySelector('span') as HTMLElement
  return { bottom: parseFloat(bar.style.bottom), height: parseFloat(bar.style.height) }
}

describe('BalanceChart', () => {
  it('収入・各項目・収支の順に柱を並べ、収支は収入から全項目を引いた額になる', () => {
    render(<BalanceChart income={income} outflows={outflows} balanceColor="bg-ink" />)
    const names = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))
    expect(names).toEqual([
      '収入 ¥200,000',
      '固定費 ¥100,000',
      '貯蓄 ¥50,000',
      '出費 ¥0',
      '収支 ¥50,000',
    ])
  })

  it('差し引く項目の柱は、直前までの残高から引いた分だけ浮いて描かれる', () => {
    render(<BalanceChart income={income} outflows={outflows} balanceColor="bg-ink" />)
    expect(barOf(/^収入/)).toEqual({ bottom: 0, height: 100 })
    expect(barOf(/^固定費/)).toEqual({ bottom: 50, height: 50 })
    expect(barOf(/^貯蓄/)).toEqual({ bottom: 25, height: 25 })
    expect(barOf(/^収支/)).toEqual({ bottom: 0, height: 25 })
  })

  it('赤字のときは収支の柱が 0 の線より下に伸びる', () => {
    render(
      <BalanceChart
        income={{ ...income, value: 100000 }}
        outflows={[{ label: '固定費', value: 150000, color: 'bg-fixed' }]}
        balanceColor="bg-ink"
      />
    )
    // 目盛りは -50,000〜100,000 なので、0 の線は下から 1/3 の位置
    const balance = barOf(/^収支/)
    expect(balance.bottom).toBe(0)
    expect(balance.height).toBeCloseTo(100 / 3)
    expect(screen.getByRole('button', { name: '収支 ¥-50,000' })).toBeInTheDocument()
  })

  it('収入も支出も0円のときは何も表示しない', () => {
    const { container } = render(
      <BalanceChart
        income={{ ...income, value: 0 }}
        outflows={outflows.map((s) => ({ ...s, value: 0 }))}
        balanceColor="bg-ink"
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('柱を押すと金額と収入に占める割合を表示し、もう一度押すと閉じる', () => {
    render(<BalanceChart income={income} outflows={outflows} balanceColor="bg-ink" />)
    const fixed = screen.getByRole('button', { name: /^固定費/ })
    fireEvent.click(fixed)
    expect(screen.getByRole('tooltip')).toHaveTextContent('固定費¥100,000収入の50%')
    fireEvent.click(fixed)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
