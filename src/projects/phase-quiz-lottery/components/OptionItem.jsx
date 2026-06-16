export default function OptionItem({ index, label, selected, disabled, onSelect }) {
  const letter = String.fromCharCode(65 + index)
  const inputId = `pql-option-${index}`

  return (
    <label
      className={[
        'flex min-h-[96px] cursor-pointer items-center gap-[18px] rounded-[20px] border px-[24px] py-[20px] transition',
        selected ? 'border-slate-900 bg-slate-900/5' : 'border-slate-200 bg-white',
        disabled ? 'cursor-not-allowed opacity-60' : 'active:scale-[0.99]',
      ].join(' ')}
      htmlFor={inputId}
    >
      <input
        id={inputId}
        className="sr-only"
        type="radio"
        checked={selected}
        disabled={disabled}
        onChange={onSelect}
      />
      <span
        className={[
          'flex h-[40px] w-[40px] flex-none items-center justify-center rounded-full border-2 text-[22px] font-bold',
          selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-500',
        ].join(' ')}
        aria-hidden="true"
      >
        {letter}
      </span>
      <span className="text-[28px] leading-[1.6] font-medium text-slate-900">{label}</span>
    </label>
  )
}
