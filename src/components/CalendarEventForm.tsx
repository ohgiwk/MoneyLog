import { useState, useEffect } from 'react'
import type { CalendarEvent } from '../lib/database.types'
import { calendarEventService } from '../lib/services/calendarEventService'
import BottomSheet from './ui/BottomSheet'
import DatePicker from './ui/DatePicker'
import ErrorText from './ui/ErrorText'
import Input from './ui/Input'
import Textarea from './ui/Textarea'

interface Props {
  isOpen: boolean
  userId: string
  date: string
  event: CalendarEvent | null
  onClose: () => void
  onSaved: () => void
}

export default function CalendarEventForm({
  isOpen,
  userId,
  date,
  event,
  onClose,
  onSaved,
}: Props) {
  const [eventDate, setEventDate] = useState(event?.date ?? date)
  const [allDay, setAllDay] = useState(event ? !event.start_time : false)
  const [title, setTitle] = useState(event?.title ?? '')
  const [startTime, setStartTime] = useState(event?.start_time?.slice(0, 5) ?? '')
  const [endTime, setEndTime] = useState(event?.end_time?.slice(0, 5) ?? '')
  const [plannedExpense, setPlannedExpense] = useState(
    event?.planned_expense ? String(event.planned_expense) : ''
  )
  const [memo, setMemo] = useState(event?.memo ?? '')
  const [titleError, setTitleError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setEventDate(event?.date ?? date)
    setAllDay(event ? !event.start_time : false)
    setTitle(event?.title ?? '')
    setStartTime(event?.start_time?.slice(0, 5) ?? '')
    setEndTime(event?.end_time?.slice(0, 5) ?? '')
    setPlannedExpense(event?.planned_expense ? String(event.planned_expense) : '')
    setMemo(event?.memo ?? '')
    setTitleError(null)
    setIsSubmitting(false)
    setError(null)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!title.trim()) {
      setTitleError('予定名を入力してください')
      return
    }
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
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={event ? '予定を編集' : '予定を追加'}
      rightAction={
        event
          ? {
              onClick: handleDelete,
              disabled: isSubmitting,
              tone: 'danger',
            }
          : undefined
      }
      footer={
        <button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting}
          className="w-full py-3.5 text-base rounded-[2rem] shadow-lg bg-primary-500 active:bg-primary-600 text-white font-semibold disabled:opacity-50"
        >
          {isSubmitting ? '保存中...' : '保存'}
        </button>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
            {error}
          </div>
        )}
        <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-4">
          <DatePicker label="予定日" value={eventDate} onChange={setEventDate} />

          <div>
            <label className="text-xs text-ink-muted">予定名</label>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (titleError) setTitleError(null)
              }}
              placeholder="例: 会議、買い物"
              error={!!titleError}
              className="mt-1"
            />
            <ErrorText>{titleError}</ErrorText>
          </div>

          <div
            className={`space-y-2 transition-opacity duration-200 ${allDay ? 'opacity-35 pointer-events-none' : 'opacity-100'}`}
          >
            <div className="flex items-center gap-3">
              <label className="text-xs text-ink-muted w-14 flex-shrink-0">開始時間</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={allDay}
                className="flex-1 min-w-0 bg-white dark:bg-surface"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-ink-muted w-14 flex-shrink-0">終了時間</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={allDay}
                className="flex-1 min-w-0 bg-white dark:bg-surface"
              />
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
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={plannedExpense}
                onChange={(e) => setPlannedExpense(e.target.value)}
                className="flex-1 w-auto"
              />
              <span className="text-sm text-ink-muted">円</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-ink-muted">メモ（任意）</label>
            <Textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}
