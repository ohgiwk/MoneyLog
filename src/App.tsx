import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider, useAppContext } from './contexts/AppContext'
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
import OnboardingScreen from './components/OnboardingScreen'
import AnalyticsScreen from './components/AnalyticsScreen'
import SavingTipsScreen from './components/SavingTipsScreen'
import AchievementsScreen from './components/AchievementsScreen'

const TAB_PATHS = ['/', '/record', '/shopping', '/fixed', '/calendar']

function AppRoutes() {
  const { user, authLoading } = useAppContext()
  const location = useLocation()
  const direction = useNavDirection()
  const pageKey = TAB_PATHS.includes(location.pathname) ? 'main' : location.pathname

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface-subtle flex items-center justify-center">
        <div className="text-ink-muted text-sm">読み込み中...</div>
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
        <Route path="budget" element={<BudgetScreen userId={user.id} />} />
        <Route path="analytics" element={<AnalyticsScreen userId={user.id} />} />
        <Route path="saving-tips" element={<SavingTipsScreen />} />
        <Route path="achievements" element={<AchievementsScreen userId={user.id} />} />
        <Route path="setup" element={<OnboardingScreen userId={user.id} />} />
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
