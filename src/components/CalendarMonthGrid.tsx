import { useMemo } from 'react'
import { motion } from 'motion/react'
import type { CalendarEvent, ShiftType } from '../lib/database.types'
import { useCalendarEventsQuery } from '../hooks/queries/useCalendarEventsQuery'
import { useWorkScheduleQuery } from '../hooks/queries/useWorkScheduleQuery'
import { useTransactionsQuery } from '../hooks/queries/useTransactionsQuery'
import { holidayName, todayStr } from '../utils'
import { countShiftDays, shiftColor, shiftTypesByDate } from '../lib/workShift'

// 1か月分の日付グリッドと、その月の出勤・休日数。
// 月ごとに自分でデータを取得するので、スワイプ中に見える前後の月もそのまま並べられる
export default function CalendarMonthGrid({
  userId,
  month,
  isCurrent,
  selectedDate,
  onSelectDate,
  shiftTypeById,
}: {
  userId: string
  month: string
  isCurrent: boolean
  selectedDate: string
  onSelectDate: (date: string) => void
  shiftTypeById: Map<string, ShiftType>
}) {
  const { data: events = [] } = useCalendarEventsQuery(userId, month)
  const { data: workSchedule = [] } = useWorkScheduleQuery(userId, month)
  const { data: transactions = [] } = useTransactionsQuery(userId, month)

  const shiftTypeByDate = useMemo(
    () => shiftTypesByDate(workSchedule, shiftTypeById),
    [workSchedule, shiftTypeById]
  )

  const dayTypeCounts = useMemo(
    () => countShiftDays(workSchedule, shiftTypeById),
    [workSchedule, shiftTypeById]
  )

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

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const date of calendarDays) {
      if (!date) continue
      const dayEvents = events.filter((e) => e.date <= date && date <= (e.end_date ?? e.date))
      if (dayEvents.length > 0) map.set(date, dayEvents)
    }
    return map
  }, [events, calendarDays])

  return (
    <>
      <div className="grid grid-cols-7">
        {calendarDays.map((date, i) => {
          if (!date) return <div key={i} className="h-[3.75rem]" />
          const isSelected = date === selectedDate
          const isToday = date === todayStr()
          const dow = new Date(date + 'T00:00:00').getDay()
          const dayNum = parseInt(date.slice(8))
          const shiftType = shiftTypeByDate.get(date)
          const cellBg = shiftType ? shiftColor(shiftType.color).cellBg : ''
          const expense = expenseByDate.get(date) ?? 0
          const hasEvent = eventsByDate.has(date)
          return (
            <motion.button
              key={date}
              tabIndex={isCurrent ? undefined : -1}
              onClick={() => onSelectDate(date)}
              whileTap={{ scale: 0.88 }}
              className="group h-[3.75rem] flex flex-col items-center pt-1"
            >
              {/* 外側の円: 勤務区分の色と選択状態 / 内側の円: 今日の印 */}
              <motion.span
                initial={false}
                animate={{ scale: isSelected ? [0.8, 1.1, 1] : 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={
                  'w-10 h-10 flex items-center justify-center rounded-full transition-colors ' +
                  cellBg +
                  ' ' +
                  (isSelected
                    ? 'ring-2 ring-primary-400'
                    : cellBg
                      ? ''
                      : 'group-active:bg-surface-subtle')
                }
              >
                <span
                  className={
                    'w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold ' +
                    (isToday
                      ? 'bg-primary-500 text-white'
                      : dow === 0 || holidayName(date)
                        ? 'text-danger-600'
                        : dow === 6
                          ? 'text-sky-500'
                          : 'text-ink')
                  }
                >
                  {dayNum}
                </span>
              </motion.span>
              {(expense > 0 || hasEvent) && (
                <div className="flex flex-row items-center gap-0.5 mt-1">
                  {expense > 0 && (
                    <span
                      className={
                        'rounded-full bg-danger-400 ' +
                        (expense >= 15000
                          ? 'w-2.5 h-2.5'
                          : expense >= 5000
                            ? 'w-2 h-2'
                            : expense >= 1000
                              ? 'w-1.5 h-1.5'
                              : 'w-1 h-1')
                      }
                    />
                  )}
                  {hasEvent && <span className="w-1.5 h-1.5 rounded-full bg-income-400" />}
                </div>
              )}
            </motion.button>
          )
        })}
      </div>
      {/* 月の出勤・休日数 */}
      <div className="flex justify-end gap-3 px-3 py-1.5 text-[11px] text-ink-muted">
        <span>
          出勤{' '}
          <span className="font-semibold text-primary-600 dark:text-primary-400">
            {dayTypeCounts.work}
          </span>
          日
        </span>
        <span>
          休日{' '}
          <span className="font-semibold text-sky-600 dark:text-sky-400">{dayTypeCounts.off}</span>
          日
        </span>
      </div>
    </>
  )
}
