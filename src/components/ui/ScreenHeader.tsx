interface Props {
  title: string
  onBack: () => void
}

export default function ScreenHeader({ title, onBack }: Props) {
  return (
    <div className="px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] grid grid-cols-[2.5rem_1fr_2.5rem] items-center">
      <button
        onClick={onBack}
        className="text-slate-500 active:text-slate-700 justify-self-start p-1"
        aria-label="戻る"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span className="font-semibold text-slate-800 text-center truncate">{title}</span>
      <span />
    </div>
  )
}
