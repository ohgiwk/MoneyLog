import { useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  value: string // YYYY-MM-DD
  onChange: (value: string) => void
  label?: string
  // 指定すると同じダイアログで時刻（HH:MM）も選び、「決定」でまとめて確定する
  time?: string
  onTimeChange?: (time: string) => void
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const DIAL_SIZE = 256
const DIAL_CENTER = DIAL_SIZE / 2
const OUTER_R = 104
const INNER_R = 68

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

// index は 12 等分した文字盤上の位置（0 = 真上）。分の針用に小数も受け付ける
function dialPoint(index: number, r: number): { x: number; y: number } {
  const a = (index / 12) * 2 * Math.PI
  return { x: DIAL_CENTER + r * Math.sin(a), y: DIAL_CENTER - r * Math.cos(a) }
}

function ClockPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [mode, setMode] = useState<'hour' | 'minute'>('hour')
  const dragging = useRef(false)
  const [hh = '', mm = ''] = value ? value.split(':') : []
  const hour = hh ? Number(hh) : null
  const minute = mm ? Number(mm) : null

  function pick(e: ReactPointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * DIAL_SIZE - DIAL_CENTER
    const y = ((e.clientY - rect.top) / rect.height) * DIAL_SIZE - DIAL_CENTER
    const turn = ((Math.atan2(x, -y) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI)
    if (mode === 'hour') {
      const idx = Math.round(turn * 12) % 12
      // 24時間表記のため、内側の輪を 00・13〜23 に割り当てる
      const inner = Math.hypot(x, y) < (OUTER_R + INNER_R) / 2
      const h = inner ? (idx === 0 ? 0 : idx + 12) : idx === 0 ? 12 : idx
      onChange(`${pad2(h)}:${mm || '00'}`)
    } else {
      onChange(`${hh || '00'}:${pad2(Math.round(turn * 60) % 60)}`)
    }
  }

  const hand =
    mode === 'hour'
      ? hour !== null
        ? dialPoint(hour % 12, hour === 0 || hour > 12 ? INNER_R : OUTER_R)
        : null
      : minute !== null
        ? dialPoint(minute / 5, OUTER_R)
        : null

  const labels =
    mode === 'hour'
      ? [
          ...Array.from({ length: 12 }, (_, i) => ({
            v: i === 0 ? 12 : i,
            text: String(i === 0 ? 12 : i),
            p: dialPoint(i, OUTER_R),
            inner: false,
          })),
          ...Array.from({ length: 12 }, (_, i) => ({
            v: i === 0 ? 0 : i + 12,
            text: i === 0 ? '00' : String(i + 12),
            p: dialPoint(i, INNER_R),
            inner: true,
          })),
        ]
      : Array.from({ length: 12 }, (_, i) => ({
          v: i * 5,
          text: pad2(i * 5),
          p: dialPoint(i, OUTER_R),
          inner: false,
        }))
  const selected = mode === 'hour' ? hour : minute
  // 目盛り数字のない分（5分刻み以外）は隣の数字を隠さないよう針先を小さくする
  const onLabel = mode === 'hour' || (minute !== null && minute % 5 === 0)

  function segmentClass(active: boolean): string {
    return (
      'px-2 rounded-xl transition-colors disabled:opacity-35 ' +
      (active ? 'text-primary-500 bg-primary-50 dark:bg-primary-950/60' : 'text-ink-muted')
    )
  }

  return (
    <div>
      <div className="flex items-center justify-center gap-1 mb-3 text-4xl font-bold tabular-nums">
        <button
          type="button"
          onClick={() => setMode('hour')}
          className={segmentClass(mode === 'hour')}
        >
          {hh || '--'}
        </button>
        <span className="text-ink-muted">:</span>
        <button
          type="button"
          disabled={!hh}
          onClick={() => setMode('minute')}
          className={segmentClass(mode === 'minute')}
        >
          {mm || '--'}
        </button>
      </div>
      <svg
        viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}
        className="w-64 h-64 mx-auto block touch-none select-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          dragging.current = true
          pick(e)
        }}
        onPointerMove={(e) => {
          if (dragging.current) pick(e)
        }}
        onPointerUp={() => {
          dragging.current = false
          if (mode === 'hour') setMode('minute')
        }}
        onPointerCancel={() => {
          dragging.current = false
        }}
      >
        <circle cx={DIAL_CENTER} cy={DIAL_CENTER} r={DIAL_CENTER} className="fill-surface-subtle" />
        {hand && (
          <>
            <line
              x1={DIAL_CENTER}
              y1={DIAL_CENTER}
              x2={hand.x}
              y2={hand.y}
              strokeWidth={2}
              className="stroke-primary-500"
            />
            <circle cx={DIAL_CENTER} cy={DIAL_CENTER} r={4} className="fill-primary-500" />
            <circle cx={hand.x} cy={hand.y} r={onLabel ? 18 : 6} className="fill-primary-500" />
          </>
        )}
        {labels.map((l) => (
          <text
            key={`${l.inner}-${l.v}`}
            x={l.p.x}
            y={l.p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={l.inner ? 12 : 15}
            className={
              l.v === selected ? 'fill-white font-bold' : l.inner ? 'fill-ink-muted' : 'fill-ink'
            }
          >
            {l.text}
          </text>
        ))}
      </svg>
    </div>
  )
}

function parseDate(value: string): { year: number; month: number; day: number } | null {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return { year: y, month: m, day: d }
}

function formatDisplay(value: string): string {
  const parsed = parseDate(value)
  if (!parsed) return '日付を選択'
  const { year, month, day } = parsed
  const date = new Date(year, month - 1, day)
  const weekday = WEEKDAYS[date.getDay()]
  return `${year}年${month}月${day}日（${weekday}）`
}

function formatShortDate(value: string): string {
  const parsed = parseDate(value)
  if (!parsed) return '日付'
  const { year, month, day } = parsed
  return `${month}/${day}（${WEEKDAYS[new Date(year, month - 1, day).getDay()]}）`
}

function formatDisplayWithTime(value: string, time: string): string {
  const parsed = parseDate(value)
  if (!parsed) return '日時を選択'
  const { year, month, day } = parsed
  const weekday = WEEKDAYS[new Date(year, month - 1, day).getDay()]
  return `${year}/${month}/${day}（${weekday}） ${time || '--:--'}`
}

export default function DatePicker({ value, onChange, label, time, onTimeChange }: Props) {
  const [open, setOpen] = useState(false)
  const withTime = !!onTimeChange
  const [draftDate, setDraftDate] = useState(value)
  const [draftTime, setDraftTime] = useState(time ?? '')
  const [view, setView] = useState<'date' | 'time'>('date')

  const today = new Date()
  const parsed = parseDate(value)

  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth() + 1)

  const days = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay()
    const lastDate = new Date(viewYear, viewMonth, 0).getDate()
    const cells: (number | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= lastDate; d++) cells.push(d)
    // 6行になるよう末尾を埋める
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [viewYear, viewMonth])

  function prevMonth() {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1)
      setViewMonth(12)
    } else setViewMonth((m) => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1)
      setViewMonth(1)
    } else setViewMonth((m) => m + 1)
  }

  function selectDay(day: number) {
    const mm = String(viewMonth).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    const next = `${viewYear}-${mm}-${dd}`
    if (withTime) {
      setDraftDate(next)
      setView('time')
      return
    }
    onChange(next)
    setOpen(false)
  }

  function confirmDateTime() {
    onChange(draftDate)
    onTimeChange?.(draftTime)
    setOpen(false)
  }

  function openPicker() {
    const p = parseDate(value)
    setViewYear(p?.year ?? today.getFullYear())
    setViewMonth(p?.month ?? today.getMonth() + 1)
    setDraftDate(value)
    setDraftTime(time ?? '')
    setView('date')
    setOpen(true)
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <>
      {label && <label className="text-xs text-ink-muted">{label}</label>}
      <button
        type="button"
        onClick={openPicker}
        className={
          (label ? 'mt-1 ' : '') +
          'w-full border border-line rounded-xl px-3 py-2 text-sm text-left bg-surface focus:outline-none focus:ring-2 focus:ring-primary-300 flex items-center justify-between'
        }
      >
        <span className={value ? 'text-ink' : 'text-ink-muted'}>
          {withTime ? formatDisplayWithTime(value, time ?? '') : formatDisplay(value)}
        </span>
        <span className="text-ink-muted text-base">📅</span>
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div className="relative bg-surface rounded-3xl w-full max-w-sm mx-4 px-4 pt-3 pb-6">
              <div className="flex justify-end mb-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted active:bg-surface-hover"
                  aria-label="閉じる"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              {withTime && (
                <div className="flex gap-2 mb-4">
                  {(
                    [
                      ['date', formatShortDate(draftDate)],
                      ['time', draftTime || '--:--'],
                    ] as const
                  ).map(([v, text]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setView(v)}
                      className={
                        'flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ' +
                        (view === v
                          ? 'border-primary-400 text-primary-600 bg-primary-50 dark:bg-primary-950/60 dark:text-primary-400'
                          : 'border-line text-ink-muted')
                      }
                    >
                      {text}
                    </button>
                  ))}
                </div>
              )}

              {view === 'date' ? (
                <>
                  {/* 月ナビゲーション */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={prevMonth}
                      className="w-9 h-9 flex items-center justify-center rounded-full active:bg-surface-hover text-ink-muted"
                    >
                      ‹
                    </button>
                    <span className="font-bold text-ink-strong">
                      {viewYear}年{viewMonth}月
                    </span>
                    <button
                      type="button"
                      onClick={nextMonth}
                      className="w-9 h-9 flex items-center justify-center rounded-full active:bg-surface-hover text-ink-muted"
                    >
                      ›
                    </button>
                  </div>

                  {/* 曜日ヘッダー */}
                  <div className="grid grid-cols-7 mb-1">
                    {WEEKDAYS.map((w, i) => (
                      <div
                        key={w}
                        className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-ink-muted'}`}
                      >
                        {w}
                      </div>
                    ))}
                  </div>

                  {/* カレンダーグリッド */}
                  <div className="grid grid-cols-7">
                    {days.map((day, i) => {
                      if (day === null) return <div key={i} />
                      const mm = String(viewMonth).padStart(2, '0')
                      const dd = String(day).padStart(2, '0')
                      const dateStr = `${viewYear}-${mm}-${dd}`
                      const isSelected = dateStr === (withTime ? draftDate : value)
                      const isToday = dateStr === todayStr
                      const col = i % 7
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => selectDay(day)}
                          className={
                            'flex items-center justify-center h-10 text-sm rounded-full mx-0.5 my-0.5 transition-colors ' +
                            (isSelected
                              ? 'bg-primary-500 text-white font-bold'
                              : isToday
                                ? 'border border-primary-400 text-primary-600 font-semibold'
                                : col === 0
                                  ? 'text-red-400 active:bg-red-50'
                                  : col === 6
                                    ? 'text-blue-400 active:bg-blue-50'
                                    : 'text-ink active:bg-surface-hover')
                          }
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                </>
              ) : (
                <ClockPicker value={draftTime} onChange={setDraftTime} />
              )}

              <div className={withTime ? 'mt-4 flex gap-2' : 'mt-3'}>
                {view === 'date' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (withTime) {
                        setDraftDate(todayStr)
                        setViewYear(today.getFullYear())
                        setViewMonth(today.getMonth() + 1)
                        setView('time')
                        return
                      }
                      onChange(todayStr)
                      setOpen(false)
                    }}
                    className="w-full py-3 text-sm text-primary-600 font-medium border border-primary-200 active:bg-primary-50 rounded-xl"
                  >
                    今日
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDraftTime('')}
                    className="w-full py-3 text-sm text-ink-muted font-medium border border-line active:bg-surface-hover rounded-xl"
                  >
                    時刻なし
                  </button>
                )}
                {withTime && (
                  <button
                    type="button"
                    onClick={confirmDateTime}
                    className="w-full py-3 text-sm text-white font-semibold bg-primary-500 active:bg-primary-600 rounded-xl"
                  >
                    決定
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
