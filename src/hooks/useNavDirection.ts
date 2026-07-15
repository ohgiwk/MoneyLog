import { NavigationType, useNavigationType } from 'react-router-dom'
import type { NavDirection } from '../components/PageTransition'

export function useNavDirection(): NavDirection {
  const type = useNavigationType()
  return type === NavigationType.Pop ? 'back' : 'forward'
}
