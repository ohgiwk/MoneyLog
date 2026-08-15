import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider, useAppContext } from './contexts/AppContext'
import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import { useNavDirection } from './hooks/useNavDirection'
import PageTransition from './components/PageTransition'
import AuthScreen from './components/AuthScreen'
import MainLayout from './components/layouts/MainLayout'
import HomeTab from './components/HomeTab'
import RecordTab from './components/RecordTab'
import ShoppingTab from './components/ShoppingTab'
import FixedExpenseTab from './components/FixedExpenseTab'
import CalendarTab from './components/CalendarTab'
import SettingsScreen from './components/SettingsScreen'
import CategoryEditScreen from './components/CategoryEditScreen'
import BudgetScreen from './components/BudgetScreen'
import ExchangeRateScreen from './components/ExchangeRateScreen'
import PaymentMethodsScreen from './components/PaymentMethodsScreen'
import StoreTypesScreen from './components/StoreTypesScreen'
import OnboardingScreen from './components/OnboardingScreen'
import AnalyticsScreen from './components/AnalyticsScreen'
import SavingTipsScreen from './components/SavingTipsScreen'
import AchievementsScreen from './components/AchievementsScreen'
import MyPageScreen from './components/MyPageScreen'
import PrivacyPolicyScreen from './components/PrivacyPolicyScreen'
import TermsOfServiceScreen from './components/TermsOfServiceScreen'
import ChangePasswordScreen from './components/ChangePasswordScreen'

const TAB_PATHS = ['/', '/record', '/shopping', '/fixed', '/calendar']

function AppRoutes() {
  const { user, authLoading } = useAppContext()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let showHandle: { remove: () => void } | null = null
    let hideHandle: { remove: () => void } | null = null
    void Keyboard.addListener('keyboardWillShow', (info) => {
      document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`)
    }).then((h) => {
      showHandle = h
    })
    void Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.style.setProperty('--keyboard-height', '0px')
    }).then((h) => {
      hideHandle = h
    })
    return () => {
      showHandle?.remove()
      hideHandle?.remove()
    }
  }, [])
  const location = useLocation()
  const direction = useNavDirection()
  const pageKey = TAB_PATHS.includes(location.pathname) ? 'main' : location.pathname

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface-subtle flex flex-col items-center justify-center gap-8">
        <div className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt=""
            className="w-16 h-16 object-contain"
          />
          <p className="text-3xl text-ink-strong" style={{ fontFamily: "'Kiwi Maru', serif" }}>
            キンカク手帖
          </p>
        </div>
        <div className="w-48 h-1 bg-surface-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 rounded-full animate-[loading_1.4s_ease-in-out_infinite]" />
        </div>
        <style>{`
          @keyframes loading {
            0%   { transform: translateX(-100%); }
            50%  { transform: translateX(0%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    )
  }

  if (!user) return <AuthScreen />

  return (
    <PageTransition pageKey={pageKey} direction={direction} className="h-[100dvh]" fillHeight>
      <Routes location={location} key={pageKey}>
        <Route element={<MainLayout />}>
          <Route index element={<HomeTab userId={user.id} />} />
          <Route path="record" element={<RecordTab userId={user.id} />} />
          <Route path="shopping" element={<ShoppingTab userId={user.id} />} />
          <Route path="fixed" element={<FixedExpenseTab userId={user.id} />} />
          <Route path="calendar" element={<CalendarTab userId={user.id} />} />
        </Route>
        <Route path="settings" element={<SettingsScreen userId={user.id} />} />
        <Route path="settings/categories" element={<CategoryEditScreen />} />
        <Route path="settings/exchange-rate" element={<ExchangeRateScreen />} />
        <Route path="settings/payment-methods" element={<PaymentMethodsScreen />} />
        <Route path="settings/store-types" element={<StoreTypesScreen />} />
        <Route path="settings/change-password" element={<ChangePasswordScreen />} />
        <Route path="budget" element={<BudgetScreen userId={user.id} />} />
        <Route path="analytics" element={<AnalyticsScreen userId={user.id} />} />
        <Route path="saving-tips" element={<SavingTipsScreen />} />
        <Route path="achievements" element={<AchievementsScreen userId={user.id} />} />
        <Route path="setup" element={<OnboardingScreen userId={user.id} />} />
        <Route path="mypage" element={<MyPageScreen userId={user.id} />} />
        <Route path="privacy-policy" element={<PrivacyPolicyScreen />} />
        <Route path="terms-of-service" element={<TermsOfServiceScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PageTransition>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  )
}
