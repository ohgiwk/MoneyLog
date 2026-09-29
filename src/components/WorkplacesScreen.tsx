import Card from './ui/Card'
import Input from './ui/Input'
import FormLabel from './ui/FormLabel'
import ErrorText from './ui/ErrorText'
import ConfirmDialog from './ui/ConfirmDialog'
import BottomSheet from './ui/BottomSheet'
import ScreenHeader from './ui/ScreenHeader'
import Spinner from './ui/Spinner'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { ShiftType, Workplace } from '../lib/database.types'
import { workplaceService } from '../lib/services/workplaceService'
import { useWorkplacesQuery } from '../hooks/queries/useWorkplacesQuery'
import {
  SHIFT_COLOR_KEYS,
  SHIFT_KINDS,
  formatShiftTime,
  shiftColor,
  workplaceForDate,
  type ShiftTypeDraft,
  type TimeRange,
} from '../lib/workShift'
import { todayStr } from '../utils'

interface Props {
  userId: string
}

type WorkplaceEditing = { mode: 'new' } | { mode: 'edit'; workplace: Workplace }
type ShiftEditing = { mode: 'new'; workplaceId: string } | { mode: 'edit'; shiftType: ShiftType }

function formatStartDate(date: string | null): string {
  if (!date) return 'はじめから'
  const [y, m, d] = date.split('-').map(Number)
  return `${y}年${m}月${d}日から`
}

const DEFAULT_RANGE: TimeRange = { start: '09:00', end: '18:00' }
const MAX_RANGES = 4

const saveButtonClass =
  'w-full py-3.5 text-base rounded-[2rem] shadow-lg bg-primary-500 active:bg-primary-600 text-white font-semibold disabled:opacity-50'

export default function WorkplacesScreen({ userId }: Props) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const { workplaces, shiftTypes, isLoading, isError } = useWorkplacesQuery(userId)
  const [workplaceEditing, setWorkplaceEditing] = useState<WorkplaceEditing | null>(null)
  const [shiftEditing, setShiftEditing] = useState<ShiftEditing | null>(null)

  // 新しい勤務先が上に来るよう開始日の降順（「はじめから」は最後）
  const sortedWorkplaces = useMemo(
    () => [...workplaces].sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? '')),
    [workplaces]
  )
  const currentWorkplace = workplaceForDate(workplaces, todayStr())

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['workplaces', userId] })
    void queryClient.invalidateQueries({ queryKey: ['workSchedule', userId] })
  }

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-surface-subtle flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 bg-surface border-b border-line-subtle">
        <ScreenHeader title="勤務先と区分" onBack={() => navigate(-1)} />
      </div>

      <div className="flex-1 p-4 pb-8 overflow-y-auto space-y-3">
        <p className="text-xs text-ink-muted px-1">
          カレンダーの区分と勤務時間を勤務先ごとに設定できます。職場が変わったら勤務先を追加すると、開始日より前の日は元の勤務先の区分のまま残ります。
        </p>

        {isError && (
          <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-600">
            データの読み込みに失敗しました
          </div>
        )}
        {isLoading && <Spinner />}

        {sortedWorkplaces.map((w) => {
          const types = shiftTypes.filter((t) => t.workplace_id === w.id && !t.archived)
          return (
            <Card key={w.id}>
              <button
                type="button"
                onClick={() => setWorkplaceEditing({ mode: 'edit', workplace: w })}
                className="w-full flex items-center gap-2 px-4 py-3 border-b border-line-subtle active:bg-surface-subtle text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink truncate">{w.name}</span>
                    {currentWorkplace?.id === w.id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 font-semibold shrink-0">
                        現在
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-muted">{formatStartDate(w.start_date)}</div>
                </div>
                <span className="text-xs text-ink-muted">編集</span>
              </button>
              {types.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setShiftEditing({ mode: 'edit', shiftType: t })}
                  className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-line-subtle active:bg-surface-subtle text-left"
                >
                  <span className={`w-3 h-3 rounded-full shrink-0 ${shiftColor(t.color).swatch}`} />
                  <span className="text-sm text-ink flex-1 min-w-0 truncate">{t.name}</span>
                  <span className="text-xs text-ink-muted tabular-nums">
                    {formatShiftTime(t) ?? '時間なし'}
                  </span>
                  <span className="text-[10px] text-ink-subtle w-8 text-right shrink-0">
                    {SHIFT_KINDS.find((k) => k.kind === t.kind)?.label}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShiftEditing({ mode: 'new', workplaceId: w.id })}
                className="w-full px-4 py-2.5 text-sm text-primary-600 dark:text-primary-400 font-medium text-left active:bg-surface-subtle"
              >
                ＋ 区分を追加
              </button>
            </Card>
          )
        })}

        {!isLoading && (
          <button
            type="button"
            onClick={() => setWorkplaceEditing({ mode: 'new' })}
            className="w-full py-3 rounded-2xl border border-dashed border-line text-sm font-medium text-ink-muted active:bg-surface"
          >
            ＋ 勤務先を追加（職場が変わったとき）
          </button>
        )}
      </div>

      <WorkplaceSheet
        userId={userId}
        editing={workplaceEditing}
        canDelete={workplaces.length > 1}
        copySource={shiftTypes.filter(
          (t) => t.workplace_id === currentWorkplace?.id && !t.archived
        )}
        onClose={() => setWorkplaceEditing(null)}
        onSaved={() => {
          setWorkplaceEditing(null)
          refresh()
        }}
      />

      <ShiftTypeSheet
        userId={userId}
        editing={shiftEditing}
        nextSortOrder={shiftTypes.reduce((m, t) => Math.max(m, t.sort_order), -1) + 1}
        onClose={() => setShiftEditing(null)}
        onSaved={() => {
          setShiftEditing(null)
          refresh()
        }}
      />
    </div>
  )
}

function WorkplaceSheet({
  userId,
  editing,
  canDelete,
  copySource,
  onClose,
  onSaved,
}: {
  userId: string
  editing: WorkplaceEditing | null
  canDelete: boolean
  copySource: ShiftType[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [fromStart, setFromStart] = useState(false)
  const [startDate, setStartDate] = useState(todayStr())
  const [copyTypes, setCopyTypes] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // 開くたびに編集対象の値でフォームを初期化する
  const [prevEditing, setPrevEditing] = useState(editing)
  if (editing !== prevEditing) {
    setPrevEditing(editing)
    if (editing) {
      setError(null)
      if (editing.mode === 'edit') {
        setName(editing.workplace.name)
        setFromStart(editing.workplace.start_date == null)
        setStartDate(editing.workplace.start_date ?? todayStr())
      } else {
        setName('')
        setFromStart(false)
        setStartDate(todayStr())
        setCopyTypes(true)
      }
    }
  }

  async function run(action: () => Promise<unknown>) {
    setSaving(true)
    setError(null)
    try {
      await action()
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  function save() {
    if (!name.trim()) {
      setError('勤務先名を入力してください')
      return
    }
    if (!fromStart && !startDate) {
      setError('開始日を入力してください')
      return
    }
    const data = { name: name.trim(), start_date: fromStart ? null : startDate }
    void run(() =>
      editing?.mode === 'edit'
        ? workplaceService.updateWorkplace(editing.workplace.id, data)
        : workplaceService.insertWorkplace(
            { user_id: userId, ...data },
            copyTypes ? copySource : []
          )
    )
  }

  return (
    <BottomSheet
      isOpen={editing !== null}
      onClose={onClose}
      title={editing?.mode === 'edit' ? '勤務先を編集' : '勤務先を追加'}
      rightAction={
        editing?.mode === 'edit' && canDelete
          ? { onClick: () => setConfirmDelete(true), tone: 'danger', disabled: saving }
          : undefined
      }
      footer={
        <button type="button" onClick={save} disabled={saving} className={saveButtonClass}>
          保存する
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <FormLabel>勤務先名</FormLabel>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 株式会社〇〇"
          />
        </div>
        <div>
          <FormLabel>開始日（この日以降のカレンダーでこの勤務先の区分を使います）</FormLabel>
          <label className="flex items-center gap-2 text-sm text-ink mb-2">
            <input
              type="checkbox"
              checked={fromStart}
              onChange={(e) => setFromStart(e.target.checked)}
            />
            はじめから
          </label>
          {!fromStart && (
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          )}
        </div>
        {editing?.mode === 'new' && copySource.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={copyTypes}
              onChange={(e) => setCopyTypes(e.target.checked)}
            />
            現在の勤務先の区分（{copySource.length}件）をコピーする
          </label>
        )}
        <ErrorText>{error}</ErrorText>
      </div>

      {confirmDelete && editing?.mode === 'edit' && (
        <ConfirmDialog
          message={`「${editing.workplace.name}」を削除しますか？この勤務先の区分と、その区分を付けた日の区分も解除されます。`}
          confirmLabel="削除する"
          onConfirm={() => {
            setConfirmDelete(false)
            void run(() => workplaceService.deleteWorkplace(editing.workplace.id))
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </BottomSheet>
  )
}

function ShiftTypeSheet({
  userId,
  editing,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  userId: string
  editing: ShiftEditing | null
  nextSortOrder: number
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<ShiftTypeDraft>({
    name: '',
    kind: 'work',
    time_ranges: [],
    color: 'primary',
  })
  const [hasTime, setHasTime] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // 開くたびに編集対象の値でフォームを初期化する
  const [prevEditing, setPrevEditing] = useState(editing)
  if (editing !== prevEditing) {
    setPrevEditing(editing)
    if (editing) {
      setError(null)
      if (editing.mode === 'edit') {
        const t = editing.shiftType
        setForm({
          name: t.name,
          kind: t.kind,
          time_ranges: t.time_ranges ?? [],
          color: t.color,
        })
        setHasTime((t.time_ranges ?? []).length > 0)
      } else {
        setForm({
          name: '',
          kind: 'work',
          time_ranges: [DEFAULT_RANGE],
          color: 'primary',
        })
        setHasTime(true)
      }
    }
  }

  function updateRange(index: number, patch: Partial<TimeRange>) {
    setForm((f) => ({
      ...f,
      time_ranges: f.time_ranges.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }))
  }

  // 中抜け後の時間帯は、直前の時間帯の終了から始まる形で追加する
  function addRange() {
    setForm((f) => {
      const last = f.time_ranges[f.time_ranges.length - 1]
      const start = last?.end ?? DEFAULT_RANGE.start
      return { ...f, time_ranges: [...f.time_ranges, { start, end: start }] }
    })
  }

  function removeRange(index: number) {
    setForm((f) => ({ ...f, time_ranges: f.time_ranges.filter((_, i) => i !== index) }))
  }

  async function run(action: () => Promise<unknown>) {
    setSaving(true)
    setError(null)
    try {
      await action()
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  function save() {
    if (!form.name.trim()) {
      setError('区分名を入力してください')
      return
    }
    if (hasTime && form.time_ranges.some((r) => !r.start || !r.end)) {
      setError('始業・終業時刻を入力してください')
      return
    }
    const draft: ShiftTypeDraft = {
      ...form,
      name: form.name.trim(),
      time_ranges: hasTime ? form.time_ranges : [],
    }
    void run(() =>
      editing?.mode === 'edit'
        ? workplaceService.updateShiftType(editing.shiftType.id, draft)
        : workplaceService.insertShiftType(userId, editing!.workplaceId, draft, nextSortOrder)
    )
  }

  return (
    <BottomSheet
      isOpen={editing !== null}
      onClose={onClose}
      title={editing?.mode === 'edit' ? '区分を編集' : '区分を追加'}
      rightAction={
        editing?.mode === 'edit'
          ? { onClick: () => setConfirmDelete(true), tone: 'danger', disabled: saving }
          : undefined
      }
      footer={
        <button type="button" onClick={save} disabled={saving} className={saveButtonClass}>
          保存する
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <FormLabel>区分名</FormLabel>
          <Input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="例: 早番"
          />
        </div>

        <div>
          <FormLabel>日数の数え方</FormLabel>
          <div className="grid grid-cols-4 gap-1.5">
            {SHIFT_KINDS.map((k) => (
              <button
                key={k.kind}
                type="button"
                onClick={() => setForm((f) => ({ ...f, kind: k.kind }))}
                className={
                  'py-1.5 rounded-lg text-xs font-semibold border ' +
                  (form.kind === k.kind
                    ? 'border-primary-400 bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300'
                    : 'border-line-subtle bg-surface-subtle text-ink-muted')
                }
              >
                {k.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-muted mt-1">
            {SHIFT_KINDS.find((k) => k.kind === form.kind)?.description}
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm text-ink mb-2">
            <input
              type="checkbox"
              checked={hasTime}
              onChange={(e) => {
                const checked = e.target.checked
                setHasTime(checked)
                if (checked && form.time_ranges.length === 0)
                  setForm((f) => ({ ...f, time_ranges: [DEFAULT_RANGE] }))
              }}
            />
            勤務時間を設定する
          </label>
          {hasTime && (
            <div className="space-y-2">
              {form.time_ranges.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="time"
                    aria-label={`時間帯${i + 1}の開始時刻`}
                    value={r.start}
                    onChange={(e) => updateRange(i, { start: e.target.value })}
                    className="px-2 text-center"
                  />
                  <span className="text-ink-muted text-sm shrink-0">〜</span>
                  <Input
                    type="time"
                    aria-label={`時間帯${i + 1}の終了時刻`}
                    value={r.end}
                    onChange={(e) => updateRange(i, { end: e.target.value })}
                    className="px-2 text-center"
                  />
                  {form.time_ranges.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRange(i)}
                      aria-label={`時間帯${i + 1}を削除`}
                      className="shrink-0 w-8 h-8 rounded-full text-ink-muted active:bg-surface-hover"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {form.time_ranges.length < MAX_RANGES && (
                <button
                  type="button"
                  onClick={addRange}
                  className="text-sm text-primary-600 dark:text-primary-400 font-medium"
                >
                  ＋ 時間帯を追加（中抜け勤務）
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <FormLabel>色</FormLabel>
          <div className="flex flex-wrap gap-2">
            {SHIFT_COLOR_KEYS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                className={
                  'w-8 h-8 rounded-full border-2 ' +
                  shiftColor(c).swatch +
                  (form.color === c ? ' border-ink' : ' border-transparent')
                }
              />
            ))}
          </div>
        </div>
        <ErrorText>{error}</ErrorText>
      </div>

      {confirmDelete && editing?.mode === 'edit' && (
        <ConfirmDialog
          message={`「${editing.shiftType.name}」を削除しますか？すでにこの区分を付けた日の記録はそのまま残ります。`}
          confirmLabel="削除する"
          onConfirm={() => {
            setConfirmDelete(false)
            void run(() => workplaceService.archiveShiftType(editing.shiftType.id))
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </BottomSheet>
  )
}
