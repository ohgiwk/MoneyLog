import { useEffect, useMemo, useState } from 'react'
import type { CalendarEvent } from '../lib/database.types'
import { calendarEventService } from '../lib/services/calendarEventService'
import { formatYen } from '../utils'
import MonthSwitcher from './ui/MonthSwitcher'

interface Props {
  userId: string
  month: string
  setMonth: (m: string) => void
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

const DAY_TYPE_LABELS: Record<CalendarEvent['day_type'], { label: string; color: string }> = {
  work:    { label: '勤務日', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  off:     { label: '休暇',   color: 'text-sky-600 bg-sky-50 border-sky-200' },
  holiday: { label: '祝日',   color: 'text-rose-500 bg-rose-50 border-rose-200' },
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function CalendarTab({ userId, month, setMonth }: Props) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(todayStr())
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [month, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setFetchError(null)
    try {
      const data = await calendarEventService.fetchByMonth(userId, month)
      setEvents(data)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'データの読み込みに失敗しました')
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
    <div className="p-4 space-y-4">
      <MonthSwitcher month={month} setMonth={setMonth} />

      {fetchError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-600">
          {fetchError}
        </div>
      )}

      {/* カレンダーグリッド */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DAY_LABELS.map((d, i) => (
            <div
              key={d}
              className={
                'py-2 text-center text-xs font-semibold ' +
                (i === 0 ? 'text-rose-400' : i === 6 ? 'text-sky-500' : 'text-slate-400')
              }
            >
              {d}
            </div>
          ))}
        </div>
        {/* 日付セル */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, i) => {
            if (!date) return <div key={i} className="h-14 border-b border-r border-slate-50 last:border-r-0" />
            const dayEvents = eventsByDate.get(date) ?? []
            const isSelected = date === selectedDate
            const isToday = date === todayStr()
            const dow = new Date(date + 'T00:00:00').getDay()
            const dayNum = parseInt(date.slice(8))
            const hasWork = dayEvents.some((e) => e.day_type === 'work')
            const hasOff  = dayEvents.some((e) => e.day_type === 'off' || e.day_type === 'holiday')
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={
                  'relative h-14 flex flex-col items-center pt-1 border-b border-r border-slate-50 last:border-r-0 transition ' +
                  (isSelected ? 'bg-emerald-50' : 'active:bg-slate-50')
                }
              >
                <span
                  className={
                    'w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold ' +
                    (isToday
                      ? 'bg-emerald-500 text-white'
                      : dow === 0
                      ? 'text-rose-400'
                      : dow === 6
                      ? 'text-sky-500'
                      : 'text-slate-700')
                  }
                >
                  {dayNum}
                </span>
                {/* イベントドット */}
                <div className="flex gap-0.5 mt-0.5">
                  {hasWork && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  {hasOff  && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
                  {dayEvents.length > 0 && !hasWork && !hasOff && (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  )}
                </div>
                {dayEvents.length > 1 && (
                  <span className="text-[9px] text-slate-400">{dayEvents.length}件</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 選択日のヘッダー + 追加ボタン */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">
          {formatSelectedDate(selectedDate)}
        </span>
        <button
          onClick={openAdd}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-semibold active:bg-emerald-600"
        >
          <span className="text-base leading-none">＋</span>予定を追加
        </button>
      </div>

      {/* 選択日の予定リスト */}
      {selectedEvents.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm px-4 py-6 text-center text-sm text-slate-400">
          予定はありません
        </div>
      ) : (
        <div className="space-y-2">
          {selectedEvents.map((ev) => (
            <button
              key={ev.id}
              onClick={() => openEdit(ev)}
              className="w-full bg-white rounded-2xl shadow-sm px-4 py-3 flex items-start justify-between gap-3 text-left active:bg-slate-50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded border ' +
                      DAY_TYPE_LABELS[ev.day_type].color
                    }
                  >
                    {DAY_TYPE_LABELS[ev.day_type].label}
                  </span>
                  <span className="text-sm font-semibold text-slate-700 truncate">{ev.title}</span>
                </div>
                {(ev.start_time || ev.end_time) && (
                  <div className="text-xs text-slate-400 mt-0.5">
                    {ev.start_time ? ev.start_time.slice(0, 5) : ''}
                    {ev.end_time ? ` 〜 ${ev.end_time.slice(0, 5)}` : ''}
                  </div>
                )}
                {ev.memo && <div className="text-xs text-slate-400 mt-0.5 truncate">{ev.memo}</div>}
              </div>
              {ev.planned_expense > 0 && (
                <span className="text-sm font-semibold text-rose-500 shrink-0">
                  -{formatYen(ev.planned_expense)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 追加・編集フォーム */}
      {showForm && (
        <EventForm
          userId={userId}
          date={selectedDate}
          event={editingEvent}
          onClose={closeForm}
          onSaved={() => { closeForm(); void load() }}
        />
      )}
    </div>
  )
}

function formatSelectedDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日（${dow}）`
}

// ─── EventForm ───────────────────────────────────────────────

interface EventFormProps {
  userId: string
  date: string
  event: CalendarEvent | null
  onClose: () => void
  onSaved: () => void
}

function EventForm({ userId, date, event, onClose, onSaved }: EventFormProps) {
  const [title, setTitle]               = useState(event?.title ?? '')
  const [startTime, setStartTime]       = useState(event?.start_time?.slice(0, 5) ?? '')
  const [endTime, setEndTime]           = useState(event?.end_time?.slice(0, 5) ?? '')
  const [dayType, setDayType]           = useState<CalendarEvent['day_type']>(event?.day_type ?? 'work')
  const [plannedExpense, setPlannedExpense] = useState(event?.planned_expense ? String(event.planned_expense) : '')
  const [memo, setMemo]                 = useState(event?.memo ?? '')
  const [titleError, setTitleError]     = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]               = useState<string | null>(null)

  async function handleSave() {
    if (!title.trim()) { setTitleError('予定名を入力してください'); return }
    setTitleError(null)
    setError(null)
    setIsSubmitting(true)
    try {
      const payload = {
        user_id: userId,
        date,
        title: title.trim(),
        start_time: startTime || null,
        end_time: endTime || null,
        day_type: dayType,
        planned_expense: parseInt(plannedExpense) || 0,
        memo: memo.trim() || null,
      }
      if (event) {
        await calendarEventService.update(event.id, payload)
      } else {
        await calendarEventService.insert(payload)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!event) return
    setIsSubmitting(true)
    try {
      await calendarEventService.delete(event.id)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-5 pt-5 pb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-700">
              {event ? '予定を編集' : '予定を追加'}
            </h2>
            <span className="text-xs text-slate-400">{formatSelectedDate(date)}</span>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          {/* 予定名 */}
          <div>
            <label className="text-xs text-slate-400">予定名</label>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(null) }}
              placeholder="例: 会議、買い物"
              className={`w-full mt-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 ${titleError ? 'border-rose-300' : 'border-slate-200'}`}
            />
            {titleError && <p className="text-xs text-rose-500 mt-1">{titleError}</p>}
          </div>

          {/* 開始・終了時間 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">開始時間</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">終了時間</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
          </div>

          {/* 勤務日・休暇 */}
          <div>
            <label className="text-xs text-slate-400">区分</label>
            <div className="flex gap-2 mt-1">
              {(['work', 'off', 'holiday'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDayType(t)}
                  className={
                    'flex-1 py-2 rounded-xl text-xs font-semibold border transition ' +
                    (dayType === t
                      ? DAY_TYPE_LABELS[t].color
                      : 'border-slate-100 text-slate-400 bg-slate-50')
                  }
                >
                  {DAY_TYPE_LABELS[t].label}
                </button>
              ))}
            </div>
          </div>

          {/* 予定出費 */}
          <div>
            <label className="text-xs text-slate-400">予定出費</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={plannedExpense}
                onChange={(e) => setPlannedExpense(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
              <span className="text-sm text-slate-500">円</span>
            </div>
          </div>

          {/* メモ */}
          <div>
            <label className="text-xs text-slate-400">メモ（任意）</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-2 pt-1">
            {event && (
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-3 rounded-xl border border-rose-200 text-rose-500 text-sm font-semibold active:bg-rose-50 disabled:opacity-50"
              >
                削除
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-3 rounded-xl border border-slate-200 text-slate-500 text-sm font-semibold active:bg-slate-50 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold active:bg-emerald-600 disabled:opacity-50"
            >
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
