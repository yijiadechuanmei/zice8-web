const STATE_CLASSES = {
  default: {
    shell: 'border-white/55 shadow-[0_12px_30px_rgba(14,36,77,0.18)]',
    panel: 'bg-gradient-to-b from-white via-[#eef5ff] to-[#d9e9ff]',
    badge: 'border-[#b9d0ff] bg-gradient-to-b from-white to-[#d7e4ff] text-[#5878b4]',
  },
  selected: {
    shell: 'border-[#f8e38a] shadow-[0_16px_32px_rgba(249,214,87,0.24)]',
    panel: 'bg-gradient-to-b from-[#fffbe8] via-[#fff2bd] to-[#ffe37a]',
    badge: 'border-[#f0d26a] bg-gradient-to-b from-[#fff7c8] to-[#ffd55c] text-[#8b5f00]',
  },
  correct: {
    shell: 'border-[#8ee0aa] shadow-[0_16px_32px_rgba(21,153,71,0.22)]',
    panel: 'bg-gradient-to-b from-[#f0fff4] via-[#d9fbe5] to-[#b6f0ca]',
    badge: 'border-[#79d998] bg-gradient-to-b from-[#ecfff3] to-[#a7edc2] text-[#12733a]',
  },
  wrong: {
    shell: 'border-[#f2a4a4] shadow-[0_16px_32px_rgba(220,38,38,0.18)]',
    panel: 'bg-gradient-to-b from-[#fff7f7] via-[#ffe0e0] to-[#ffc3c3]',
    badge: 'border-[#e58d8d] bg-gradient-to-b from-[#fff1f1] to-[#ffbdbd] text-[#b42318]',
  },
}

export default function OptionItem({ option, selected, locked, state, onClick }) {
  const variant = state || (selected ? 'selected' : 'default')
  const theme = STATE_CLASSES[variant] || STATE_CLASSES.default

  return (
    <button
      className={`relative h-[92px] w-full overflow-hidden rounded-[24px] border bg-transparent text-left transition-transform duration-150 ${
        locked ? 'cursor-not-allowed opacity-95' : 'cursor-pointer active:scale-[0.99]'
      } ${theme.shell}`}
      type="button"
      disabled={locked}
      onClick={onClick}
    >
      <span className={`absolute inset-0 rounded-[24px] ${theme.panel}`} aria-hidden="true" />
      <span className="absolute inset-x-0 top-0 h-1/2 rounded-t-[24px] bg-white/35" aria-hidden="true" />
      <span className="relative flex h-full items-center gap-[22px] px-[22px]">
        <span
          className={`inline-flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full border text-[28px] font-black ${theme.badge}`}
        >
          {option.label}
        </span>
        <span className="min-w-0 flex-1 break-words pr-[12px] text-[24px] leading-[1.35] text-[#173f2a]">
          {option.content}
        </span>
      </span>
    </button>
  )
}
