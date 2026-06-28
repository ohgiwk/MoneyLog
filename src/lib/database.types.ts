export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          income_type: 'fixed' | 'hourly'
          monthly_income: number | null
          hourly_wage: number | null
          expected_work_days: number | null
          household_members: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      consumables: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string
          amount: number
          quantity: number
          cycle_days: number
          members_scale: boolean
          last_purchased: string
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['consumables']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['consumables']['Insert']>
      }
      fixed_expenses: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string
          amount: number
          baseline_amount: number
          cycle: 'daily' | 'weekly' | 'monthly' | 'yearly'
          billing_day: number | null
          status: 'active' | 'reviewing' | 'cancelled' | 'unsubscribed'
          start_date: string
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['fixed_expenses']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['fixed_expenses']['Insert']>
      }
      recurring_rules: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string
          estimated_amount: number
          recurrence_type: 'daily' | 'weekly' | 'monthly' | 'yearly'
          recurrence_interval: number
          start_date: string
          next_date: string
          auto_record: boolean
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['recurring_rules']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['recurring_rules']['Insert']>
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: 'income' | 'expense'
          expense_kind: 'routine' | 'consumable' | 'one_time' | null
          date: string
          category: string
          amount: number
          memo: string | null
          recurring_rule_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
      }
      shopping_lists: {
        Row: {
          id: string
          user_id: string
          name: string
          planned_date: string
          status: 'open' | 'done'
          total_budget: number
          total_actual: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['shopping_lists']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['shopping_lists']['Insert']>
      }
      shopping_items: {
        Row: {
          id: string
          list_id: string
          user_id: string
          name: string
          category: string
          budget_amount: number
          actual_amount: number | null
          status: 'pending' | 'bought' | 'skipped'
          is_template: boolean
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['shopping_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['shopping_items']['Insert']>
      }
      wishlist_items: {
        Row: {
          id: string
          user_id: string
          name: string
          target_amount: number
          priority: number
          purchased_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['wishlist_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['wishlist_items']['Insert']>
      }
      savings_goals: {
        Row: {
          id: string
          user_id: string
          wishlist_item_id: string | null
          target_amount: number
          monthly_target: number
          deadline: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['savings_goals']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['savings_goals']['Insert']>
      }
      monthly_adjustments: {
        Row: {
          id: string
          user_id: string
          savings_goal_id: string
          year_month: string
          amount: number
          memo: string | null
          created_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['monthly_adjustments']['Row'],
          'id' | 'created_at'
        >
        Update: Partial<Database['public']['Tables']['monthly_adjustments']['Insert']>
      }
      calendar_events: {
        Row: {
          id: string
          user_id: string
          date: string
          title: string
          start_time: string | null
          end_time: string | null
          day_type: 'work' | 'off' | 'holiday'
          planned_expense: number
          memo: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['calendar_events']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['calendar_events']['Insert']>
      }
      work_schedule: {
        Row: {
          id: string
          user_id: string
          date: string
          day_type: 'work' | 'off' | 'holiday'
          hours_worked: number | null
          hourly_wage: number | null
          daily_income: number | null
          memo: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['work_schedule']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['work_schedule']['Insert']>
      }
      income_records: {
        Row: {
          id: string
          user_id: string
          year_month: string
          expected_income: number
          actual_income: number | null
          work_days_expected: number
          work_days_actual: number | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['income_records']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['income_records']['Insert']>
      }
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type FixedExpense = Database['public']['Tables']['fixed_expenses']['Row']
export type RecurringRule = Database['public']['Tables']['recurring_rules']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type ShoppingList = Database['public']['Tables']['shopping_lists']['Row']
export type ShoppingItem = Database['public']['Tables']['shopping_items']['Row']
export type WishlistItem = Database['public']['Tables']['wishlist_items']['Row']
export type SavingsGoal = Database['public']['Tables']['savings_goals']['Row']
export type WorkSchedule = Database['public']['Tables']['work_schedule']['Row']
export type CalendarEvent = Database['public']['Tables']['calendar_events']['Row']
export type IncomeRecord = Database['public']['Tables']['income_records']['Row']
export type Consumable = Database['public']['Tables']['consumables']['Row']
