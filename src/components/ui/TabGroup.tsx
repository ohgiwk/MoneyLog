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
    <div className="flex rounded-xl bg-slate-100 p-1">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={
            `flex-1 rounded-lg font-semibold transition ${size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-sm'} ` +
            (active === key ? 'bg-white shadow text-slate-800' : 'text-slate-400')
          }
        >
          {label}
        </button>
      ))}
    </div>
  )
}
