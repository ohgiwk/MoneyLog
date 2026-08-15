interface Props {
  onClick: () => void
  ariaLabel: string
}

export default function FabButton({ onClick, ariaLabel }: Props) {
  return (
    <button
      onClick={onClick}
      className="pointer-events-auto w-14 h-14 rounded-full bg-primary-500 text-white shadow-lg active:bg-primary-600 flex items-center justify-center"
      aria-label={ariaLabel}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  )
}
