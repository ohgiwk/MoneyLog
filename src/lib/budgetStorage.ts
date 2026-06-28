export interface BudgetSettings {
  fixed: number
  consumable: number
  oneTimeByCategory: Record<string, number>
}

const key = (userId: string) => `budget_${userId}`

const empty = (): BudgetSettings => ({ fixed: 0, consumable: 0, oneTimeByCategory: {} })

export function loadBudget(userId: string): BudgetSettings {
  try {
    const raw = localStorage.getItem(key(userId))
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as Partial<BudgetSettings> & { oneTime?: number }
    return {
      fixed: parsed.fixed ?? 0,
      consumable: parsed.consumable ?? 0,
      // migrate from old single-field format
      oneTimeByCategory: parsed.oneTimeByCategory ?? {},
    }
  } catch {
    return empty()
  }
}

export function saveBudget(userId: string, budget: BudgetSettings): void {
  localStorage.setItem(key(userId), JSON.stringify(budget))
}

export function oneTimeBudgetTotal(budget: BudgetSettings): number {
  return Object.values(budget.oneTimeByCategory).reduce((s, v) => s + v, 0)
}
