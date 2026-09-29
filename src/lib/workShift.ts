import type { ShiftType, WorkSchedule, Workplace } from './database.types'

export type ShiftKind = ShiftType['kind']

export const SHIFT_KINDS: { kind: ShiftKind; label: string; description: string }[] = [
  { kind: 'work', label: '出勤', description: '出勤 1日' },
  { kind: 'half', label: '半休', description: '出勤・休日 0.5日ずつ' },
  { kind: 'off', label: '休み', description: '休日 1日' },
  { kind: 'other', label: 'その他', description: '日数に数えない' },
]

// Tailwind の JIT で拾えるよう、クラス名は完全な文字列で持つ
export const SHIFT_COLORS: Record<string, { chip: string; cellBg: string; swatch: string }> = {
  primary: {
    chip: 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 border-primary-200 dark:border-primary-900',
    cellBg: 'bg-primary-50 dark:bg-primary-950/50',
    swatch: 'bg-primary-400',
  },
  teal: {
    chip: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-900',
    cellBg: 'bg-teal-50 dark:bg-teal-950/50',
    swatch: 'bg-teal-400',
  },
  sky: {
    chip: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-900',
    cellBg: 'bg-sky-50 dark:bg-sky-950/50',
    swatch: 'bg-sky-400',
  },
  violet: {
    chip: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 border-violet-200 dark:border-violet-900',
    cellBg: 'bg-violet-50 dark:bg-violet-950/50',
    swatch: 'bg-violet-400',
  },
  warning: {
    chip: 'text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-950/60 border-warning-200 dark:border-warning-900',
    cellBg: 'bg-warning-50 dark:bg-warning-950/50',
    swatch: 'bg-warning-400',
  },
  danger: {
    chip: 'text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-950/60 border-danger-200 dark:border-danger-900',
    cellBg: 'bg-danger-50 dark:bg-danger-950/50',
    swatch: 'bg-danger-400',
  },
  slate: {
    chip: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700',
    cellBg: 'bg-slate-100 dark:bg-slate-800/50',
    swatch: 'bg-slate-400',
  },
}

export const SHIFT_COLOR_KEYS = Object.keys(SHIFT_COLORS)

export function shiftColor(color: string) {
  return SHIFT_COLORS[color] ?? SHIFT_COLORS.primary
}

export type TimeRange = ShiftType['time_ranges'][number]

export type ShiftTypeDraft = Pick<ShiftType, 'name' | 'kind' | 'time_ranges' | 'color'>

// 初回に作成する区分
export const DEFAULT_SHIFT_TYPES: ShiftTypeDraft[] = [
  {
    name: '勤務日',
    kind: 'work',
    time_ranges: [{ start: '09:00', end: '18:00' }],
    color: 'primary',
  },
  {
    name: '午前半休',
    kind: 'half',
    time_ranges: [{ start: '14:00', end: '18:00' }],
    color: 'teal',
  },
  {
    name: '午後半休',
    kind: 'half',
    time_ranges: [{ start: '09:00', end: '13:00' }],
    color: 'teal',
  },
  { name: '休暇', kind: 'off', time_ranges: [], color: 'sky' },
  { name: 'その他', kind: 'other', time_ranges: [], color: 'warning' },
]

// 日付に適用される勤務先（start_date がその日以前で最も新しいもの。該当なしなら最も古いもの）
export function workplaceForDate(workplaces: Workplace[], date: string): Workplace | null {
  if (workplaces.length === 0) return null
  const sorted = [...workplaces].sort((a, b) =>
    (a.start_date ?? '').localeCompare(b.start_date ?? '')
  )
  let current = sorted[0]
  for (const w of sorted) {
    if ((w.start_date ?? '') <= date) current = w
  }
  return current
}

// 月の出勤・休日数（半休は 0.5 日ずつ）
export function countShiftDays(
  records: WorkSchedule[],
  shiftTypeById: Map<string, ShiftType>
): { work: number; off: number } {
  let work = 0
  let off = 0
  for (const r of records) {
    const kind = r.shift_type_id ? shiftTypeById.get(r.shift_type_id)?.kind : undefined
    if (kind === 'work') work++
    else if (kind === 'off') off++
    else if (kind === 'half') {
      work += 0.5
      off += 0.5
    }
  }
  return { work, off }
}

// 勤務時間帯を「09:00 〜 12:00 / 17:00 〜 21:00」の形で表示する（時間なしは null）
export function formatShiftTime(t: Pick<ShiftType, 'time_ranges'>): string | null {
  const ranges = t.time_ranges ?? []
  if (ranges.length === 0) return null
  return ranges.map((r) => `${r.start} 〜 ${r.end}`).join(' / ')
}
