import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { shiftMonth, todayStr } from '../utils'
import { formatYen } from '../utils'
import { type Period, useAnalyticsData } from '../hooks/useAnalyticsData'
import MonthSwitcher from './ui/MonthSwitcher'
import YearSwitcher from './ui/YearSwitcher'
import { TabGroup } from './ui/TabGroup'
import ScreenHeader from './ui/ScreenHeader'
import { CollapsiblePanel } from './analytics/CollapsiblePanel'
import { ExpenseBarChart } from './analytics/ExpenseBarChart'
import { BreakdownBars } from './analytics/BreakdownBars'
import { StoreBars } from './analytics/StoreBars'
import { PaymentBars } from './analytics/PaymentBars'
import { FoodTable } from './analytics/FoodTable'

interface Props {
  userId: string
}

export default function AnalyticsScreen({ userId }: Props) {
  const navigate = useNavigate()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const [month, setMonth] = useState(todayStr().slice(0, 7))
  const [period, setPeriod] = useState<Period>('monthly')
  const year = month.slice(0, 4)

  const {
    fetchError,
    storeTypes,
    FOOD_MEAL_COLS,
    dailyExpenses,
    periodStats,
    storeCounts,
    storeAmounts,
    paymentCounts,
    paymentAmounts,
    monthlyExpenses,
    yearByCat,
    yearExpenseTotal,
    allByCat,
    allExpenseTotal,
    yearlyExpenses,
    dailyFoodByMeal,
    yearlyFoodByMeal,
    oneTimeExpense,
    totalFixed,
    totalSaved,
    oneTimeByCat,
    fixedByCat,
    hasBreakdown,
  } = useAnalyticsData({ userId, month, period })

  const today = todayStr()
  const todayDay = parseInt(today.slice(8))
  const todayYM = today.slice(0, 7)
  const todayY = today.slice(0, 4)
  const foodFutureFrom =
    period === 'monthly'
      ? month < todayYM
        ? Infinity
        : month > todayYM
          ? 0
          : todayDay
      : year < todayY
        ? Infinity
        : year > todayY
          ? 0
          : parseInt(today.slice(5, 7))

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-subtle flex flex-col overflow-hidden">
      <div className="bg-surface border-b border-line-subtle">
        <ScreenHeader title="分析" onBack={() => navigate(-1)} />
        <div className="px-4 pt-3 pb-3">
          <TabGroup
            tabs={
              [
                { key: 'monthly', label: '月間' },
                { key: 'yearly', label: '年間' },
                { key: 'all', label: '全期間' },
              ] as { key: Period; label: string }[]
            }
            active={period}
            onChange={setPeriod}
          />
        </div>
      </div>

      {period === 'monthly' && <MonthSwitcher month={month} setMonth={setMonth} compact />}
      {period === 'yearly' && (
        <YearSwitcher
          year={year}
          onPrev={() => setMonth(shiftMonth(month, -12))}
          onNext={() => setMonth(shiftMonth(month, 12))}
        />
      )}

      {fetchError && (
        <div className="mx-4 mt-3 bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
          {fetchError}
        </div>
      )}

      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-8">
        {/* 累計記録 */}
        <CollapsiblePanel title="累計記録">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-subtle rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-primary-500">{periodStats.recordDays}</div>
              <div className="text-xs text-ink-muted mt-0.5">記録日数</div>
            </div>
            <div className="bg-surface-subtle rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-primary-500">{periodStats.recordCount}</div>
              <div className="text-xs text-ink-muted mt-0.5">記録回数</div>
            </div>
          </div>
        </CollapsiblePanel>

        {/* 節約進捗 */}
        {totalSaved > 0 && (
          <CollapsiblePanel title="固定費の節約効果">
            <div className="text-2xl font-bold text-income-600 mb-1">
              -{formatYen(Math.round(totalSaved))}
              <span className="text-sm font-normal text-ink-muted">/月</span>
            </div>
            <div className="text-xs text-ink-muted">
              累計節約 {formatYen(Math.round(totalSaved * 12))}/年換算
            </div>
          </CollapsiblePanel>
        )}

        {/* カテゴリ別内訳 */}
        <CollapsiblePanel title="カテゴリ別内訳">
          {period === 'monthly' ? (
            hasBreakdown ? (
              <div className="space-y-3">
                {fixedByCat.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-ink-muted">固定費</div>
                    <BreakdownBars
                      entries={fixedByCat}
                      total={Math.round(totalFixed)}
                      barColor="bg-surface-muted"
                      valueColor="text-ink"
                    />
                  </div>
                )}
                {oneTimeByCat.length > 0 && (
                  <div className="space-y-2">
                    {fixedByCat.length > 0 && <div className="h-px bg-surface-hover" />}
                    <div className="text-xs font-semibold text-ink-muted">出費</div>
                    <BreakdownBars
                      entries={oneTimeByCat}
                      total={oneTimeExpense}
                      barColor="bg-warning-400"
                      valueColor="text-warning-600"
                      onItemClick={(cat) =>
                        navigate('/expense-filter', { state: { categoryFilter: cat } })
                      }
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-ink-muted text-center">この月のデータがありません</div>
            )
          ) : period === 'yearly' ? (
            yearByCat.length > 0 ? (
              <BreakdownBars
                entries={yearByCat}
                total={yearExpenseTotal}
                barColor="bg-warning-400"
                valueColor="text-warning-600"
                onItemClick={(cat) =>
                  navigate('/expense-filter', { state: { categoryFilter: cat } })
                }
              />
            ) : (
              <div className="text-sm text-ink-muted text-center">この年のデータがありません</div>
            )
          ) : allByCat.length > 0 ? (
            <BreakdownBars
              entries={allByCat}
              total={allExpenseTotal}
              barColor="bg-warning-400"
              valueColor="text-warning-600"
              onItemClick={(cat) => navigate('/expense-filter', { state: { categoryFilter: cat } })}
            />
          ) : (
            <div className="text-sm text-ink-muted text-center">データがありません</div>
          )}
        </CollapsiblePanel>

        {/* 日別/月別/年別出費棒グラフ */}
        <CollapsiblePanel
          title={period === 'monthly' ? '日別出費' : period === 'yearly' ? '月別出費' : '年別出費'}
        >
          {period === 'monthly' ? (
            <ExpenseBarChart
              entries={dailyExpenses.map(({ day, amount }) => ({
                label: String(day),
                amount,
                showLabel: day % 5 === 0 || day === 1,
              }))}
            />
          ) : period === 'yearly' ? (
            <ExpenseBarChart
              entries={monthlyExpenses.map(({ month: m, amount }) => ({
                label: String(m),
                amount,
              }))}
            />
          ) : (
            <ExpenseBarChart
              barGap="gap-1"
              entries={yearlyExpenses.map(({ year: y, amount }) => ({
                label: y.slice(2),
                amount,
              }))}
            />
          )}
        </CollapsiblePanel>

        {/* 日別/月別 食費テーブル */}
        {(period === 'monthly' || period === 'yearly') && (
          <CollapsiblePanel title={period === 'monthly' ? '日別食費' : '月別食費'}>
            {period === 'monthly' ? (
              <FoodTable
                cols={FOOD_MEAL_COLS}
                rows={Array.from({ length: dailyFoodByMeal.days }, (_, i) => ({
                  label: `${i + 1}日`,
                  meals: dailyFoodByMeal.map.get(i + 1)!,
                  future: i + 1 > foodFutureFrom,
                }))}
              />
            ) : (
              <FoodTable
                cols={FOOD_MEAL_COLS}
                rows={Array.from({ length: 12 }, (_, i) => ({
                  label: `${i + 1}月`,
                  meals: yearlyFoodByMeal.get(i + 1)!,
                  future: i + 1 > foodFutureFrom,
                }))}
              />
            )}
          </CollapsiblePanel>
        )}

        {/* 店舗種別 */}
        <CollapsiblePanel title="店舗種別">
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-ink-muted">記録数</div>
              <StoreBars
                entries={storeCounts}
                valueType="count"
                storeTypes={storeTypes}
                onItemClick={(storeName) =>
                  navigate('/expense-filter', { state: { storeTypeFilter: storeName } })
                }
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-ink-muted">合計額</div>
              <StoreBars
                entries={storeAmounts}
                valueType="amount"
                storeTypes={storeTypes}
                onItemClick={(storeName) =>
                  navigate('/expense-filter', { state: { storeTypeFilter: storeName } })
                }
              />
            </div>
          </div>
        </CollapsiblePanel>

        {/* 支払い方法別 */}
        <CollapsiblePanel title="支払い方法別">
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-ink-muted">記録数</div>
              <PaymentBars
                entries={paymentCounts}
                valueType="count"
                onItemClick={(paymentType) =>
                  navigate('/expense-filter', { state: { paymentTypeFilter: paymentType } })
                }
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-ink-muted">合計額</div>
              <PaymentBars
                entries={paymentAmounts}
                valueType="amount"
                onItemClick={(paymentType) =>
                  navigate('/expense-filter', { state: { paymentTypeFilter: paymentType } })
                }
              />
            </div>
          </div>
        </CollapsiblePanel>
      </div>
    </div>
  )
}
