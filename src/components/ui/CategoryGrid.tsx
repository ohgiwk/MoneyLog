import type { CategoryInfo } from '../../constants'

interface Props {
  categories: CategoryInfo[]
  selected: string
  onSelect: (name: string) => void
}

export default function CategoryGrid({ categories, selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-5 gap-2 mt-1">
      {categories.map((c) => (
        <button
          key={c.name}
          type="button"
          onClick={() => onSelect(c.name)}
          className={
            'flex flex-col items-center justify-center py-2 rounded-xl text-xs gap-1 border ' +
            (selected === c.name
              ? 'border-primary-400 bg-primary-50 dark:bg-primary-950/60'
              : 'border-line-subtle bg-surface-subtle')
          }
        >
          <span className="text-lg">{c.icon}</span>
          <span className="text-[10px] text-ink text-center leading-tight">{c.name}</span>
        </button>
      ))}
    </div>
  )
}
