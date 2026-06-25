interface Props {
  onCategoryEdit: () => void
  onBack: () => void
}

export default function SettingsScreen({ onCategoryEdit, onBack }: Props) {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 active:text-slate-600 text-xl px-1">
            ←
          </button>
          <span className="font-bold text-lg text-slate-800">設定</span>
        </div>
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">カスタマイズ</span>
          </div>
          <button
            onClick={onCategoryEdit}
            className="w-full flex items-center gap-3 px-4 py-4 active:bg-slate-50"
          >
            <span className="text-xl">🏷️</span>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-slate-700">カテゴリ編集</div>
              <div className="text-xs text-slate-400">支出・収入・固定費のカテゴリを編集</div>
            </div>
            <span className="text-slate-300 text-lg">›</span>
          </button>
        </div>
      </div>
    </div>
  )
}
