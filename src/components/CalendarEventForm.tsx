import { useState } from 'react'
import type { CalendarEvent } from '../lib/database.types'
import { calendarEventService } from '../lib/services/calendarEventService'
import Button from './ui/Button'
import DatePicker from './ui/DatePicker'
import ErrorText from './ui/ErrorText'
import Input from './ui/Input'
import Modal from './ui/Modal'
import Textarea from './ui/Textarea'

interface Props {
  userId: string
  date: string
  event: CalendarEvent | null
  onClose: () => void
  onSaved: () => void
}

export default function CalendarEventForm({ userId, date, event, onClose, onSaved }: Props) {
  const [eventDate, setEventDate]           = useState(event?.date ?? date)
  const [allDay, setAllDay]                 = useState(!event?.start_time)
  const [title, setTitle]                   = useState(event?.title ?? '')
  const [startTime, setStartTime]           = useState(event?.start_time?.slice(0, 5) ?? '')
  const [endTime, setEndTime]               = useState(event?.end_time?.slice(0, 5) ?? '')
  const [plannedExpense, setPlannedExpense] = useState(event?.planned_expense ? String(event.planned_expense) : '')
  const [memo, setMemo]                     = useState(event?.memo ?? '')
  const [titleError, setTitleError]         = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting]     = useState(false)
  const [error, setError]                   = useState<string | null>(null)

  async function handleSave() {
    if (!title.trim()) { setTitleError('予定名を入力してください'); return }
    setTitleError(null)
    setError(null)
    setIsSubmitting(true)
    try {
      const payload = {
        user_id: userId,
        date: eventDate,
        title: title.trim(),
        start_time: allDay ? null : startTime || null,
        end_time: allDay ? null : endTime || null,
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
    <Modal isOpen onClose={onClose} position="center" className="w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto">
      <div className="px-5 pt-5 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">
            {event ? '予定を編集' : '予定を追加'}
          </h2>
          {event && (
            <button
              onClick={handleDelete}
              disabled={isSubmitting}
              className="p-1.5 text-danger-400 active:text-danger-600 disabled:opacity-50"
              aria-label="削除"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          )}
        </div>

        {error && (
          <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
            {error}
          </div>
        )}

        <div>
          <DatePicker label="予定日" value={eventDate} onChange={setEventDate} />
        </div>

        <div>
          <label className="text-xs text-ink-muted">予定名</label>
          <Input
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(null) }}
            placeholder="例: 会議、買い物"
            error={!!titleError}
            className="mt-1"
          />
          <ErrorText>{titleError}</ErrorText>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-ink-muted">開始時間</label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={allDay} className="mt-1 disabled:bg-surface-subtle disabled:text-ink-muted" />
          </div>
          <div>
            <label className="text-xs text-ink-muted">終了時間</label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={allDay} className="mt-1 disabled:bg-surface-subtle disabled:text-ink-muted" />
          </div>
        </div>

        <label className="flex items-center justify-between cursor-pointer select-none">
          <span className="text-sm text-ink">終日</span>
          <div
            onClick={() => setAllDay((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${allDay ? 'bg-primary-500' : 'bg-surface-muted'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${allDay ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </div>
        </label>

        <div>
          <label className="text-xs text-ink-muted">予定出費</label>
          <div className="flex items-center gap-2 mt-1">
            <Input type="number" inputMode="numeric" placeholder="0" value={plannedExpense} onChange={(e) => setPlannedExpense(e.target.value)} className="flex-1 w-auto" />
            <span className="text-sm text-ink-muted">円</span>
          </div>
        </div>

        <div>
          <label className="text-xs text-ink-muted">メモ（任意）</label>
          <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} className="mt-1" />
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting} className="px-4 flex-none">
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
