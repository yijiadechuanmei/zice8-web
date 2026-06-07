const STATE_CLASSES = {
  default: {
    shell: 'fill-[#fffef0] stroke-[#8bcfc3] shadow-[0_10px_22px_rgba(22,70,53,0.12)]',
    badge: 'border-[#8bcfc3] bg-[#f4f2dd] text-[#4f8b55]',
    text: 'text-[#4f8b55]',
  },
  selected: {
    shell: 'fill-[#eff8ee] stroke-[#57ad9d] shadow-[0_12px_24px_rgba(40,116,90,0.16)]',
    badge: 'border-[#57ad9d] bg-[#d9efe9] text-[#2c7f61]',
    text: 'text-[#3d8051]',
  },
  correct: {
    shell: 'fill-[#eef9ed] stroke-[#52a767] shadow-[0_12px_24px_rgba(37,103,45,0.18)]',
    badge: 'border-[#52a767] bg-[#67b478] text-[#ffffff]',
    text: 'text-[#246032]',
  },
  wrong: {
    shell: 'fill-[#fff1e9] stroke-[#d6866d] shadow-[0_12px_24px_rgba(148,72,51,0.15)]',
    badge: 'border-[#d6866d] bg-[#eba68b] text-[#fff7f1]',
    text: 'text-[#91503c]',
  },
}

export default function OptionItem({ option, selected, locked, state, onClick }) {
  const variant = state || (selected ? 'selected' : 'default')
  const theme = STATE_CLASSES[variant] || STATE_CLASSES.default

  return (
    <button
      className={`relative min-h-[123px] w-[545px] bg-transparent text-left transition-transform duration-150 ${
        locked ? 'cursor-not-allowed opacity-85' : 'cursor-pointer active:scale-[0.995]'
      }`}
      type="button"
      disabled={locked}
      onClick={onClick}
    >
      <svg className={`absolute inset-0 h-full w-full ${theme.shell}`} viewBox="0 0 545 123" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M40 2H505C520.464 2 533 14.536 533 30V38L543 48V75L533 85V93C533 108.464 520.464 121 505 121H40C24.536 121 12 108.464 12 93V85L2 75V48L12 38V30C12 14.536 24.536 2 40 2Z"
          strokeWidth="2.5"
        />
        <path
          d="M41 10H504C514.493 10 523 18.507 523 29V33L534 42V80L523 90V94C523 104.493 514.493 113 504 113H41C30.507 113 22 104.493 22 94V90L11 80V42L22 33V29C22 18.507 30.507 10 41 10Z"
          fill="none"
          stroke="rgba(255,255,255,0.42)"
          strokeWidth="1.2"
        />
      </svg>

      <span
        className={`absolute left-[42px] top-1/2 inline-flex h-[92px] w-[92px] -translate-y-1/2 items-center justify-center rounded-full border-[2px] text-[44px] font-black ${theme.badge}`}
      >
          {option.label}
      </span>

      <span className={`absolute left-[165px] right-[40px] top-1/2 -translate-y-1/2 text-[36px] leading-[1.25] font-bold ${theme.text}`}>
        <span className="block break-words">
          {option.content}
        </span>
      </span>
    </button>
  )
}
