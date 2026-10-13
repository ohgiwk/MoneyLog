import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useAppContext } from '../../contexts/AppContext'
import DrawerMenu from '../DrawerMenu'
import UpdateNotification from '../UpdateNotification'
import NewMonthBudgetDialog from '../NewMonthBudgetDialog'
import QuickRecordSheet from '../QuickRecordSheet'
import MonthPickerDialog from '../MonthPickerDialog'
import { shiftMonth, monthLabel, todayStr } from '../../utils'
import type { Transaction } from '../../lib/database.types'

const TABS = [
  { path: '/', label: 'ホーム', icon: '🏠' },
  { path: '/fixed', label: '固定費', icon: '📋' },
  { path: '/record', label: '入力', icon: '✏️', special: true },
  { path: '/shopping', label: '目標', icon: '🎯' },
  { path: '/calendar', label: 'カレンダー', icon: '📅' },
]

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    user,
    signOut,
    headerBack,
    setHeaderBack,
    month,
    setMonth,
    setCalendarSelectedDate,
    bumpRecordTap,
    bumpShoppingTap,
    bumpCalendarTodayTap,
    registerScrollToTop,
    setQuickRecordTx,
  } = useAppContext()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [quickSheetOpen, setQuickSheetOpen] = useState(false)
  const [longPressing, setLongPressing] = useState(false)
  // 暗転の表示中（フェードアウトが終わるまで）は true
  const [dimActive, setDimActive] = useState(false)
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressRectRef = useRef<DOMRect | null>(null)
  const isLongPress = useRef(false)
  const isCalendar = !!useMatch('/calendar')
  const prevPath = useRef(location.pathname)

  const LONG_PRESS_MS = 500
  // 長押し中に指がこの距離までボタンの外へずれても、押し続けているとみなす
  const PRESS_SLOP_PX = 24

  // 濃さはシートの背景（bg-black/40）に合わせ、開いた瞬間に明るさが跳ねないようにする
  const dimMotion = {
    initial: { opacity: 0 },
    animate: { opacity: 0.4, transition: { duration: LONG_PRESS_MS / 1000, ease: 'easeIn' } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  } as const

  function startLongPress(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    cancelLongPress()
    // 指がボタンの外へずれても move / up を受け取り続ける
    e.currentTarget.setPointerCapture(e.pointerId)
    pressRectRef.current = e.currentTarget.getBoundingClientRect()
    isLongPress.current = false
    setLongPressing(true)
    setDimActive(true)
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null
      isLongPress.current = true
      setLongPressing(false)
      setQuickSheetOpen(true)
    }, LONG_PRESS_MS)
  }

  // わずかな指のずれでは中断せず、ボタンから大きく離れたときだけ長押しをやめる
  function handlePressMove(e: React.PointerEvent<HTMLButtonElement>) {
    const rect = pressRectRef.current
    if (longPressTimer.current === null || !rect) return
    const outside =
      e.clientX < rect.left - PRESS_SLOP_PX ||
      e.clientX > rect.right + PRESS_SLOP_PX ||
      e.clientY < rect.top - PRESS_SLOP_PX ||
      e.clientY > rect.bottom + PRESS_SLOP_PX
    if (outside) cancelLongPress()
  }

  function cancelLongPress() {
    setLongPressing(false)
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    // isLongPress は click ハンドラが参照するためここではリセットしない
  }

  function handleQuickRecordSelect(tx: Transaction) {
    setQuickRecordTx(tx)
    if (location.pathname !== '/record') {
      navigate('/record')
    }
  }

  useLayoutEffect(() => {
    registerScrollToTop(() => scrollRef.current?.scrollTo(0, 0))
  }, [registerScrollToTop])

  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname
      setHeaderBack(null)
      scrollRef.current?.scrollTo(0, 0)
    }
  }, [location.pathname, setHeaderBack])

  return (
    <div
      id="app-root"
      className="relative max-w-md mx-auto h-full bg-surface-subtle flex flex-col overflow-hidden"
    >
      <UpdateNotification />
      {user && <NewMonthBudgetDialog userId={user.id} />}

      {/* ヘッダー */}
      <div className="fixed top-0 left-0 right-0 max-w-md mx-auto z-10 bg-surface-subtle border-b-2 border-primary-500 pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3 grid grid-cols-[2.5rem_1fr_2.5rem] items-center">
          {headerBack ? (
            <button
              onClick={headerBack.onBack}
              className="text-ink-muted active:text-ink justify-self-start p-1"
              aria-label="戻る"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          ) : isCalendar ? (
            <button
              onClick={() => {
                setMonth(todayStr().slice(0, 7))
                bumpCalendarTodayTap()
              }}
              className="justify-self-start -ml-2 -my-2 px-3 py-3 rounded-lg text-xs font-semibold text-ink-muted whitespace-nowrap active:bg-surface-hover"
            >
              今日
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center justify-center gap-2 min-w-0">
            {headerBack ? (
              <span className="font-semibold text-ink-strong truncate">{headerBack.title}</span>
            ) : isCalendar ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMonth(shiftMonth(month, -1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full active:bg-surface-subtle text-ink-muted"
                  aria-label="前の月"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  onClick={() => setMonthPickerOpen(true)}
                  className="px-1 py-1 rounded-lg text-base font-bold text-ink-strong active:bg-surface-subtle"
                  aria-label={`${monthLabel(month)}、年月を選ぶ`}
                >
                  {monthLabel(month)}
                </button>
                <button
                  onClick={() => setMonth(shiftMonth(month, 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full active:bg-surface-subtle text-ink-muted"
                  aria-label="次の月"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <img
                  src={`${import.meta.env.BASE_URL}logo.png`}
                  alt=""
                  className="w-7 h-7 object-contain"
                />
                <span
                  className="text-lg text-ink-strong"
                  style={{ fontFamily: "'Kiwi Maru', serif" }}
                >
                  キンカク手帖
                </span>
              </>
            )}
          </div>

          {headerBack ? (
            headerBack.action ? (
              <button
                onClick={headerBack.action.onClick}
                disabled={headerBack.action.disabled}
                className={
                  'justify-self-end p-1 active:opacity-70 disabled:opacity-40 ' +
                  (headerBack.action.tone === 'danger' ? 'text-danger-500' : 'text-primary-600')
                }
                aria-label={headerBack.action.label}
              >
                {headerBack.action.tone === 'danger' ? (
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                ) : (
                  <span className="text-sm font-semibold">{headerBack.action.label}</span>
                )}
              </button>
            ) : (
              <span />
            )
          ) : (
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex flex-col gap-1 p-2 active:opacity-60 justify-self-end"
              aria-label="メニューを開く"
            >
              <span className="block w-5 h-0.5 bg-ink-muted rounded" />
              <span className="block w-5 h-0.5 bg-ink-muted rounded" />
              <span className="block w-5 h-0.5 bg-ink-muted rounded" />
            </button>
          )}
        </div>
      </div>

      {monthPickerOpen && (
        <MonthPickerDialog
          month={month}
          onSelect={(m) => {
            setMonth(m)
            setMonthPickerOpen(false)
          }}
          onClose={() => setMonthPickerOpen(false)}
        />
      )}

      {/* ドロワーメニュー */}
      <AnimatePresence>
        {drawerOpen && (
          <DrawerMenu key="drawer" onSignOut={signOut} onClose={() => setDrawerOpen(false)} />
        )}
      </AnimatePresence>

      {/* コンテンツ */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 pt-[calc(57px+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] overflow-y-auto"
      >
        <Outlet />
      </div>

      {/* 長押し中、記録ボタン以外を少しずつ暗くする。
          記録ボタンはタブバーの中にあるので、暗転は「タブバーより上」と「タブバーの中」の2枚に分け、
          タブバーの中ではボタンだけを暗転より手前に置く。
          各画面の FAB（z-20）も覆うため z-20 にし、表示中だけタブバーも z-20 に上げて手前に残す */}
      <AnimatePresence onExitComplete={() => setDimActive(false)}>
        {longPressing && (
          <motion.div
            aria-hidden
            className="absolute inset-0 z-20 bg-black pointer-events-none"
            {...dimMotion}
          />
        )}
      </AnimatePresence>

      {/* ボトムナビ */}
      <div
        className={
          'fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface-subtle border-t border-line flex justify-around pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-2px_8px_rgba(1,38,100,0.06)] ' +
          (dimActive ? 'z-20' : 'z-10')
        }
      >
        {TABS.map((t) => {
          const isActive = location.pathname === t.path
          if (t.special) {
            return (
              <motion.button
                key={t.path}
                onClick={() => {
                  if (isLongPress.current) {
                    isLongPress.current = false
                    return
                  }
                  if (location.pathname === '/record') {
                    bumpRecordTap()
                  } else {
                    navigate(t.path)
                  }
                }}
                onPointerDown={startLongPress}
                onPointerMove={handlePressMove}
                onPointerUp={cancelLongPress}
                onPointerCancel={cancelLongPress}
                // 長押しで出る OS のメニューや文字選択に操作を奪われないようにする
                onContextMenu={(e) => e.preventDefault()}
                style={{ WebkitTouchCallout: 'none' }}
                className="relative z-10 flex flex-col items-center gap-0.5 px-4 py-1 -mt-6 select-none touch-none"
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                {/* 長押しの進み具合。ボタン上の塗り上がりは指で隠れるため、指の上に吹き出しで示す */}
                <span
                  aria-hidden
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none"
                >
                  <AnimatePresence>
                    {longPressing && (
                      <motion.span
                        // 普通のタップでは一瞬も出ないよう、少し待ってから表示する
                        initial={{ opacity: 0, y: 6, scale: 0.95 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          transition: { delay: 0.1, duration: 0.12 },
                        }}
                        exit={{ opacity: 0, transition: { duration: 0.1 } }}
                        className="relative block px-3 py-2 rounded-xl bg-navy-900 text-white shadow-lg whitespace-nowrap"
                      >
                        <span className="block text-xs font-semibold">よく記録する出費</span>
                        <span className="block h-1 mt-1.5 rounded-full bg-white/25 overflow-hidden">
                          <motion.span
                            className="block h-full rounded-full bg-primary-400 origin-left"
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: LONG_PRESS_MS / 1000, ease: 'linear' }}
                          />
                        </span>
                        <span className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2.5 h-2.5 rotate-45 bg-navy-900" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <span
                  className={
                    'w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-md ' +
                    (isActive ? 'bg-blue-500' : 'bg-primary-500')
                  }
                >
                  <span className="text-2xl leading-none">{t.icon}</span>
                  <span className="text-xs font-bold leading-none mt-1.5 text-white">
                    {isActive ? '入力' : '記録'}
                  </span>
                </span>
              </motion.button>
            )
          }
          return (
            <motion.button
              key={t.path}
              onClick={() => {
                if (t.path === '/shopping') bumpShoppingTap()
                if (t.path === '/calendar') setCalendarSelectedDate(undefined)
                navigate(t.path)
              }}
              className={
                'flex flex-col items-center gap-0.5 px-6 py-1 ' +
                (isActive ? 'text-primary-500' : 'text-ink-muted')
              }
              whileTap={{ scale: 0.82 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <span className="text-xl">{t.icon}</span>
              <span className="text-[11px] font-medium whitespace-nowrap">{t.label}</span>
              <span
                className={`block h-0.5 w-5 rounded-full mt-0.5 transition-all ${isActive ? 'bg-primary-500' : 'bg-transparent'}`}
              />
            </motion.button>
          )
        })}
        {/* タブバーの中の暗転（-top-px: 上端の枠線も覆う） */}
        <AnimatePresence>
          {longPressing && (
            <motion.div
              aria-hidden
              className="absolute inset-x-0 bottom-0 -top-px bg-black pointer-events-none"
              {...dimMotion}
            />
          )}
        </AnimatePresence>
      </div>

      {user && (
        <QuickRecordSheet
          userId={user.id}
          isOpen={quickSheetOpen}
          onClose={() => setQuickSheetOpen(false)}
          onSelect={handleQuickRecordSelect}
        />
      )}
    </div>
  )
}
