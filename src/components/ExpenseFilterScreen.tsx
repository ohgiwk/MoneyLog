import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../contexts/AppContext'
import RecordTab from './RecordTab'
import ScreenHeader from './ui/ScreenHeader'

export default function ExpenseFilterScreen() {
  const navigate = useNavigate()
  const { user } = useAppContext()

  if (!user) return null

  return (
    <div className="max-w-md mx-auto flex flex-col h-[100dvh] bg-surface-subtle">
      <ScreenHeader title="出費内訳" onBack={() => navigate(-1)} />
      <div className="flex-1 overflow-y-auto">
        <RecordTab userId={user.id} />
      </div>
    </div>
  )
}
