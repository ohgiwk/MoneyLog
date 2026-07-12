interface TabItem<T> {
  key: T
  label: string
}

interface TabGroupProps<T extends string> {
  tabs: TabItem<T>[]
  active: T
  onChange: (key: T) => void
  size?: 'sm' | 'md'
}

export function TabGroup<T extends string>({
  tabs,
  active,
  onChange,
  size = 'md',
}: TabGroupProps<T>) {
  return (
    <div className="flex rounded-xl bg-surface-hover p-1">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={
            `flex-1 rounded-lg font-semibold transition ${size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-sm'} ` +
            (active === key ? 'bg-surface shadow text-ink-strong' : 'text-ink-muted')
          }
        >
          {label}
        </button>
      ))}
    </div>
  )
}
