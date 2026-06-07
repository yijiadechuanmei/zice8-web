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
      <svg className={`absolute inset-0 h-full w-full ${theme.shadow}`} viewBox="0 0 545 123" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M 44 1 H 501 C 520 1 534 15 534 34 V 39 C 534 45 540 48 544 52 V 71 C 540 75 534 78 534 84 V 89 C 534 108 520 122 501 122 H 44 C 25 122 11 108 11 89 V 84 C 11 78 5 75 1 71 V 52 C 5 48 11 45 11 39 V 34 C 11 15 25 1 44 1 Z"
          fill={theme.fill}
          stroke={theme.stroke}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M 48 9 H 497 C 512 9 524 21 524 36 V 40 C 524 45 530 49 532 52 V 71 C 530 74 524 78 524 83 V 87 C 524 102 512 114 497 114 H 48 C 33 114 21 102 21 87 V 83 C 21 78 15 74 13 71 V 52 C 15 49 21 45 21 40 V 36 C 21 21 33 9 48 9 Z"
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1"
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
