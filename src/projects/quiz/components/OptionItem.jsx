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
      className={`relative min-h-[123px] w-[545px] bg-transparent text-left transition-transform duration-150 ${
        locked ? 'cursor-not-allowed opacity-85' : 'cursor-pointer active:scale-[0.995]'
      }`}
      type="button"
      disabled={locked}
      onClick={onClick}
    >
      <svg className={`absolute inset-0 h-full w-full ${theme.shadow}`} viewBox="0 0 545 123" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M 42 1 H 503 C 523 1 536 14 536 34 V 38 C 536 45 542 48 544 52 V 71 C 542 75 536 78 536 85 V 89 C 536 109 523 122 503 122 H 42 C 22 122 9 109 9 89 V 85 C 9 78 3 75 1 71 V 52 C 3 48 9 45 9 38 V 34 C 9 14 22 1 42 1 Z"
          fill={theme.fill}
          stroke={theme.stroke}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M 46 9 H 499 C 514 9 526 20 526 35 V 39 C 526 44 532 47 534 50 V 73 C 532 76 526 79 526 84 V 88 C 526 103 514 114 499 114 H 46 C 31 114 19 103 19 88 V 84 C 19 79 13 76 11 73 V 50 C 13 47 19 44 19 39 V 35 C 19 20 31 9 46 9 Z"
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <span
        className={`absolute left-[45px] top-1/2 inline-flex h-[92px] w-[92px] -translate-y-1/2 items-center justify-center rounded-full border-[2px] text-[48px] font-black ${theme.badge}`}
      >
          {option.label}
      </span>

      <span className={`absolute left-[165px] right-[40px] top-1/2 -translate-y-1/2 text-[40px] leading-[1.2] font-bold ${theme.text}`}>
        <span className="block break-words">
          {option.content}
        </span>
      </span>
    </button>
  )
}
