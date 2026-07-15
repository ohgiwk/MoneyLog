export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  budget: (userId: string, month: string) => ['budget', userId, month] as const,
  fixedExpenses: (userId: string) => ['fixedExpenses', userId] as const,
  consumables: (userId: string) => ['consumables', userId] as const,
  transactions: (userId: string, month: string) => ['transactions', userId, month] as const,
  calendarEvents: (userId: string) => ['calendarEvents', userId] as const,
  workSchedule: (userId: string) => ['workSchedule', userId] as const,
  wishlist: (userId: string) => ['wishlist', userId] as const,
  achievements: (userId: string) => ['achievements', userId] as const,
}
