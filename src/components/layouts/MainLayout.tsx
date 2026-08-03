import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { useAppContext } from '../../contexts/AppContext'
import DrawerMenu from '../DrawerMenu'
import UpdateNotification from '../UpdateNotification'
import NewMonthBudgetDialog from '../NewMonthBudgetDialog'
import { shiftMonth, monthLabel } from '../../utils'

const TABS = [
  { path: '/', label: 'ホーム', icon: '🏠' },
  { path: '/fixed', label: '固定費', icon: '📋' },
  { path: '/record', label: '入力', icon: '✏️', special: true },
  { path: '/shopping', label: 'メモ', icon: '🛒' },
  { path: '/calendar', label: 'カレンダー', icon: '📅' },
]

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut, headerBack, setHeaderBack, month, setMonth, setCalendarSelectedDate, bumpRecordTap, bumpShoppingTap, registerScrollToTop } = useAppContext()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isCalendar = !!useMatch('/calendar')
  const prevPath = useRef(location.pathname)

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
    <div id="app-root" className="relative max-w-md mx-auto h-full bg-surface-subtle flex flex-col overflow-hidden">
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
              <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
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
                  className="w-8 h-8 flex items-center justify-center rounded-full active:bg-surface-subtle text-ink-muted text-2xl"
                >
                  ‹
                </button>
                <span className="text-base font-bold text-ink-strong">{monthLabel(month)}</span>
                <button
                  onClick={() => setMonth(shiftMonth(month, 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full active:bg-surface-subtle text-ink-muted text-2xl"
                >
                  ›
                </button>
              </div>
            ) : (
              <>
                <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" className="w-7 h-7 object-contain" />
                <span className="text-lg text-ink-strong" style={{ fontFamily: "'Kiwi Maru', serif" }}>キンカク手帖</span>
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
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
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

      {/* ドロワーメニュー */}
      <AnimatePresence>
        {drawerOpen && (
          <DrawerMenu
            key="drawer"
            onSignOut={signOut}
            onClose={() => setDrawerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* コンテンツ */}
      <div ref={scrollRef} className="flex-1 min-h-0 pt-[calc(57px+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] overflow-y-auto">
        <Outlet />
      </div>

      {/* ボトムナビ */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-10 bg-surface-subtle border-t border-line flex justify-around pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-2px_8px_rgba(1,38,100,0.06)]">
        {TABS.map((t) => {
          const isActive = location.pathname === t.path
          if (t.special) {
            return (
              <motion.button
                key={t.path}
                onClick={() => {
                  if (location.pathname === '/record') {
                    bumpRecordTap()
                  } else {
                    navigate(t.path)
                  }
                }}
                className="flex flex-col items-center gap-0.5 px-4 py-1 -mt-6"
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <span
                  className={
                    'w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-md transition-colors ' +
                    (isActive ? 'bg-blue-500' : 'bg-primary-500')
                  }
                >
                  <span className="text-2xl leading-none">{t.icon}</span>
                  <span className={'text-xs font-bold leading-none mt-1.5 text-white'}>
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
              <span className={`block h-0.5 w-5 rounded-full mt-0.5 transition-all ${isActive ? 'bg-primary-500' : 'bg-transparent'}`} />
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
