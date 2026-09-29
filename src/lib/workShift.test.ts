import { describe, expect, it } from 'vitest'
import type { ShiftType, WorkSchedule, Workplace } from './database.types'
import { countShiftDays, formatShiftTime, workplaceForDate } from './workShift'

function workplace(id: string, start_date: string | null): Workplace {
  return { id, user_id: 'u', name: id, start_date, created_at: '' }
}

function shiftType(id: string, kind: ShiftType['kind']): ShiftType {
  return {
    id,
    user_id: 'u',
    workplace_id: 'w',
    name: id,
    kind,
    time_ranges: [],
    color: 'primary',
    sort_order: 0,
    archived: false,
    created_at: '',
  }
}

function record(date: string, shift_type_id: string | null): WorkSchedule {
  return {
    id: date,
    user_id: 'u',
    date,
    shift_type_id,
    memo: null,
    created_at: '',
  }
}

describe('workplaceForDate', () => {
  const list = [workplace('new', '2026-10-01'), workplace('old', null)]

  it('日付以前で最も新しい勤務先を返す', () => {
    expect(workplaceForDate(list, '2026-09-30')?.id).toBe('old')
    expect(workplaceForDate(list, '2026-10-01')?.id).toBe('new')
  })

  it('どの開始日より前でも最も古い勤務先を返す', () => {
    const dated = [workplace('a', '2026-01-01'), workplace('b', '2026-06-01')]
    expect(workplaceForDate(dated, '2025-12-31')?.id).toBe('a')
  })

  it('勤務先がなければ null', () => {
    expect(workplaceForDate([], '2026-01-01')).toBeNull()
  })
})

describe('countShiftDays', () => {
  it('半休は出勤・休日に 0.5 日ずつ数え、その他は数えない', () => {
    const types = new Map(
      [
        shiftType('w', 'work'),
        shiftType('h', 'half'),
        shiftType('o', 'off'),
        shiftType('x', 'other'),
      ].map((t) => [t.id, t])
    )
    const records = [
      record('2026-09-01', 'w'),
      record('2026-09-02', 'w'),
      record('2026-09-03', 'h'),
      record('2026-09-04', 'o'),
      record('2026-09-05', 'x'),
      record('2026-09-06', null),
    ]
    expect(countShiftDays(records, types)).toEqual({ work: 2.5, off: 1.5 })
  })
})

describe('formatShiftTime', () => {
  it('時間帯を表示し、時間なしは null', () => {
    expect(formatShiftTime({ time_ranges: [{ start: '09:00', end: '18:00' }] })).toBe(
      '09:00 〜 18:00'
    )
    expect(formatShiftTime({ time_ranges: [] })).toBeNull()
  })

  it('中抜け勤務は時間帯を / で区切って表示する', () => {
    expect(
      formatShiftTime({
        time_ranges: [
          { start: '10:00', end: '14:00' },
          { start: '17:00', end: '22:00' },
        ],
      })
    ).toBe('10:00 〜 14:00 / 17:00 〜 22:00')
  })
})
