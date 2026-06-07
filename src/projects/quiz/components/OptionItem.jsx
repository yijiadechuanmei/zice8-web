const STATE_CLASSES = {
  default: {
    fill: '#fffef0',
    stroke: '#8bd7ce',
    badge: 'border-[#b9dfcb] bg-[#f8f7e8] text-[#3e8548]',
    text: 'text-[#4f8b55]',
    shadow: 'drop-shadow-[0_10px_20px_rgba(25,92,73,0.12)]',
  },
  selected: {
    fill: '#f3ffe8',
    stroke: '#4f9857',
    badge: 'border-[#71b87a] bg-[#dff4d8] text-[#31733a]',
    text: 'text-[#31733a]',
    shadow: 'drop-shadow-[0_12px_22px_rgba(40,116,62,0.16)]',
  },
  correct: {
    fill: '#ecffe8',
    stroke: '#2f9b43',
    badge: 'border-[#2f9b43] bg-[#4fba65] text-[#ffffff]',
    text: 'text-[#166534]',
    shadow: 'drop-shadow-[0_12px_22px_rgba(36,123,58,0.18)]',
  },
  wrong: {
    fill: '#fff1ed',
    stroke: '#e66b4e',
    badge: 'border-[#e66b4e] bg-[#f4b09f] text-[#9a3412]',
    text: 'text-[#9a3412]',
    shadow: 'drop-shadow-[0_12px_22px_rgba(176,82,51,0.16)]',
  },
}

export default function OptionItem({ option, selected, locked, state, onClick }) {
  const variant = state || (selected ? 'selected' : 'default')
  const theme = STATE_CLASSES[variant] || STATE_CLASSES.default

  return (
    <button
      className={`relative h-[123px] w-[545px] shrink-0 overflow-visible bg-transparent text-left transition-transform duration-150 ${
        locked ? 'cursor-not-allowed opacity-85' : 'cursor-pointer active:scale-[0.995]'
      }`}
      type="button"
      disabled={locked}
      onClick={onClick}
    >
      <svg className={`absolute left-0 top-0 h-[123px] w-[545px] ${theme.shadow}`} viewBox="0 0 545 123" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M 14 1 H 531 A 13 13 0 0 0 544 14 V 109 A 13 13 0 0 0 531 122 H 14 A 13 13 0 0 0 1 109 V 14 A 13 13 0 0 0 14 1 Z"
          fill={theme.fill}
          stroke={theme.stroke}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <span
        className={`absolute left-[43px] top-[15px] inline-flex h-[92px] w-[92px] items-center justify-center rounded-full border-[2px] text-[48px] font-black leading-[92px] ${theme.badge}`}
      >
          {option.label}
      </span>

      <span className={`absolute left-[165px] top-0 flex h-[123px] w-[340px] items-center text-[40px] leading-[1.2] font-bold ${theme.text}`}>
        <span className="block max-h-[96px] overflow-hidden break-words">
          {option.content}
        </span>
      </span>
    </button>
  )
}
