import Card from './ui/Card'
import FabButton from './ui/FabButton'
import CalendarEventForm from './CalendarEventForm'
import ErrorText from './ui/ErrorText'
import { useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../contexts/AppContext'
import type { CalendarEvent, WorkSchedule } from '../lib/database.types'
import { workScheduleService } from '../lib/services/workScheduleService'
import { useCalendarEventsQuery } from '../hooks/queries/useCalendarEventsQuery'
import { useWorkScheduleQuery } from '../hooks/queries/useWorkScheduleQuery'
import { useTransactionsQuery } from '../hooks/queries/useTransactionsQuery'
import { useQueryClient } from '@tanstack/react-query'
import { formatDateWithWeekday, formatYen, todayStr } from '../utils'

interface Props {
  userId: string
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

const DAY_TYPE_LABELS: Record<WorkSchedule['day_type'], { label: string; color: string; cellBg: string }> = {
  work:    { label: '勤務日', color: 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 border-primary-200 dark:border-primary-900', cellBg: 'bg-primary-50 dark:bg-primary-950/50' },
  off:     { label: '休暇',   color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-900', cellBg: 'bg-sky-50 dark:bg-sky-950/50' },
  holiday: { label: 'その他', color: 'text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-950/60 border-warning-200 dark:border-warning-900', cellBg: 'bg-warning-50 dark:bg-warning-950/50' },
}


export default function CalendarTab({ userId }: Props) {
  const { month, calendarSelectedDate, categories } = useAppContext()
  const expenseCategories = categories.expenseCategories
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState<string>(calendarSelectedDate ?? todayStr())
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [dayTypeError, setDayTypeError] = useState<string | null>(null)

  useEffect(() => {
    if (selectedDate.slice(0, 7) !== month) {
      const today = todayStr()
      setSelectedDate(month === today.slice(0, 7) ? today : `${month}-01`)
    }
  }, [month])

  const { data: events = [], isError: eventsError } = useCalendarEventsQuery(userId, month)
  const { data: workSchedule = [], isError: scheduleError } = useWorkScheduleQuery(userId, month)
  const { data: transactions = [], isError: txError } = useTransactionsQuery(userId, month)

  const fetchError = eventsError || scheduleError || txError ? 'データの読み込みに失敗しました' : null

  const dayTypeByDate = useMemo(() => {
    const map = new Map<string, WorkSchedule['day_type']>()
    for (const s of workSchedule) map.set(s.date, s.day_type)
    return map
  }, [workSchedule])

  async function handleDayTypeChange(next: WorkSchedule['day_type'] | null) {
    setDayTypeError(null)
    try {
      if (next === null) {
        await workScheduleService.clearDayType(userId, selectedDate)
      } else {
        await workScheduleService.setDayType(userId, selectedDate, next)
      }
      void queryClient.invalidateQueries({ queryKey: ['workSchedule', userId, month] })
    } catch (err) {
      setDayTypeError(err instanceof Error ? err.message : '保存に失敗しました')
    }
  }

  // カレンダーグリッド生成
  const calendarDays = useMemo(() => {
    const [year, monthNum] = month.split('-').map(Number)
    const firstDay = new Date(year, monthNum - 1, 1).getDay()
    const lastDate = new Date(year, monthNum, 0).getDate()
    const days: (string | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= lastDate; d++) {
      days.push(`${month}-${String(d).padStart(2, '0')}`)
    }
    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [month])

  const expenseByDate = useMemo(() => {
    const map = new Map<string, number>()
    for (const tx of transactions) {
      if (tx.type === 'expense') map.set(tx.date, (map.get(tx.date) ?? 0) + tx.amount)
    }
    return map
  }, [transactions])

  const plannedByDate = useMemo(() => {
    const map = new Map<string, number>()
    for (const ev of events) {
      if (ev.planned_expense > 0) map.set(ev.date, (map.get(ev.date) ?? 0) + ev.planned_expense)
    }
    return map
  }, [events])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      const arr = map.get(e.date) ?? []
      arr.push(e)
      map.set(e.date, arr)
    }
    return map
  }, [events])

  const selectedEvents = eventsByDate.get(selectedDate) ?? []
  const selectedTransactions = useMemo(
    () => transactions.filter((tx) => tx.date === selectedDate && tx.type === 'expense'),
    [transactions, selectedDate]
  )

  function openAdd() {
    setEditingEvent(null)
    setShowForm(true)
  }

  function openEdit(event: CalendarEvent) {
    setEditingEvent(event)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingEvent(null)
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      {fetchError && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
          {fetchError}
        </div>
      )}

      {/* カレンダーグリッド */}
      <Card>
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b border-line-subtle">
          {DAY_LABELS.map((d, i) => (
            <div
              key={d}
              className={
                'py-2 text-center text-xs font-semibold ' +
                (i === 0 ? 'text-danger-400' : i === 6 ? 'text-sky-500' : 'text-ink-muted')
              }
            >
              {d}
            </div>
          ))}
        </div>
        {/* 日付セル */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, i) => {
            if (!date) return <div key={i} className="h-16 border-b border-r border-line-subtle last:border-r-0" />
            const isSelected = date === selectedDate
            const isToday = date === todayStr()
            const dow = new Date(date + 'T00:00:00').getDay()
            const dayNum = parseInt(date.slice(8))
            const dayType = dayTypeByDate.get(date)
            const cellBg = dayType ? DAY_TYPE_LABELS[dayType].cellBg : ''
            const expense = expenseByDate.get(date) ?? 0
            const planned = plannedByDate.get(date) ?? 0
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={
                  'relative h-16 flex flex-col items-center pt-1 border-b border-r border-line-subtle last:border-r-0 transition ' +
                  cellBg + ' ' +
                  (isSelected ? 'ring-2 ring-inset ring-primary-400' : cellBg ? '' : 'active:bg-surface-subtle')
                }
              >
                <span
                  className={
                    'w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold ' +
                    (isToday
                      ? 'bg-primary-500 text-white'
                      : dow === 0
                      ? 'text-danger-400'
                      : dow === 6
                      ? 'text-sky-500'
                      : 'text-ink')
                  }
                >
                  {dayNum}
                </span>
                {expense > 0 && (
                  <span className={
                    'rounded-full bg-danger-400 mt-0.5 ' +
                    (expense >= 15000 ? 'w-2.5 h-2.5' : expense >= 5000 ? 'w-2 h-2' : expense >= 1000 ? 'w-1.5 h-1.5' : 'w-1 h-1')
                  } />
                )}
                {planned > 0 && (
                  <span className="text-[9px] text-ink-muted leading-tight">
                    予{planned >= 1000 ? `${Math.round(planned / 1000)}k` : planned}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </Card>

      {/* 選択日のヘッダー */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">
          {formatDateWithWeekday(selectedDate)}
        </span>
      </div>

      {/* 選択日の区分設定 */}
      <div className="bg-surface rounded-2xl shadow-sm px-4 py-2 flex items-center gap-3">
        <span className="text-xs text-ink-muted shrink-0">区分</span>
        <ErrorText>{dayTypeError}</ErrorText>
        <div className="flex gap-2 flex-1">
          {(['work', 'off', 'holiday'] as const).map((t) => {
            const selected = dayTypeByDate.get(selectedDate) === t
            return (
              <button
                key={t}
                type="button"
                onClick={() => void handleDayTypeChange(selected ? null : t)}
                className={
                  'flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ' +
                  (selected ? DAY_TYPE_LABELS[t].color : 'border-line-subtle text-ink-muted bg-surface-subtle')
                }
              >
                {DAY_TYPE_LABELS[t].label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 選択日の予定リスト */}
      <div className="space-y-1">
        <span className="text-xs text-ink-muted px-1">予定</span>
      {selectedEvents.length === 0 ? (
        <div className="bg-surface rounded-2xl shadow-sm px-4 py-6 text-center text-sm text-ink-muted">
          予定はありません
        </div>
      ) : (
        <div className="space-y-2">
          {selectedEvents.map((ev) => (
            <button
              key={ev.id}
              onClick={() => openEdit(ev)}
              className="w-full bg-surface rounded-2xl shadow-sm px-4 py-3 flex items-start justify-between gap-3 text-left active:bg-surface-subtle"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-ink truncate">{ev.title}</span>
                </div>
                {(ev.start_time || ev.end_time) && (
                  <div className="text-xs text-ink-muted mt-0.5">
                    {ev.start_time ? ev.start_time.slice(0, 5) : ''}
                    {ev.end_time ? ` 〜 ${ev.end_time.slice(0, 5)}` : ''}
                  </div>
                )}
                {ev.memo && <div className="text-xs text-ink-muted mt-0.5 truncate">{ev.memo}</div>}
              </div>
              {ev.planned_expense > 0 && (
                <span className="text-sm font-semibold text-danger-500 shrink-0">
                  -{formatYen(ev.planned_expense)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      </div>

      {/* 選択日の出費記録 */}
      {selectedTransactions.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-ink-muted">出費記録</span>
            <span className="text-xs font-semibold text-danger-500">
              -{formatYen(selectedTransactions.reduce((s, tx) => s + tx.amount, 0))}
            </span>
          </div>
          <div className="space-y-2">
            {selectedTransactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-surface rounded-2xl shadow-sm px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-lg shrink-0">
                    {expenseCategories.find((c) => c.name === tx.category)?.icon ?? '📦'}
                  </span>
                  <div className="min-w-0">
                    <span className="text-sm text-ink truncate block">{tx.category}</span>
                    {tx.memo && <span className="text-xs text-ink-muted truncate block">{tx.memo}</span>}
                  </div>
                </div>
                <span className="text-sm font-semibold text-danger-500 shrink-0">
                  -{formatYen(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAB */}
      <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-0 right-0 max-w-md mx-auto flex justify-end pr-5 pointer-events-none z-20">
        <FabButton onClick={openAdd} ariaLabel="予定を追加" />
      </div>

      {/* 追加・編集フォーム */}
      {showForm && (
        <CalendarEventForm
          userId={userId}
          date={selectedDate}
          event={editingEvent}
          onClose={closeForm}
          onSaved={() => { closeForm(); void queryClient.invalidateQueries({ queryKey: ['calendarEvents', userId, month] }) }}
        />
      )}
    </div>
  )
}
