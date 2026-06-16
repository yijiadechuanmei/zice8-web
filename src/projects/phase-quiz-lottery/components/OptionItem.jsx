export default function OptionItem({ index, label, selected, disabled, onSelect }) {
  const letter = String.fromCharCode(65 + index)

  return (
    <button
      className={[
        'group flex min-h-[92px] w-full items-center gap-4 rounded-[16px] border px-5 py-4 text-left transition',
        selected
          ? 'border-[#2F80FF] bg-[#f4f9ff] shadow-[0_10px_24px_rgba(47,128,255,0.10)]'
          : 'border-[#e7edf5] bg-white hover:bg-[#f8fbff] active:bg-[#f4f9ff]',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      ].join(' ')}
      type="button"
      disabled={disabled}
      onClick={() => onSelect?.()}
      aria-pressed={selected}
    >
      <span
        className={[
          'flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 transition',
          selected ? 'border-[#2F80FF] bg-[#2F80FF] shadow-[inset_0_0_0_5px_rgba(255,255,255,0.95)]' : 'border-[#b8c4d7] bg-white',
        ].join(' ')}
        aria-hidden="true"
      />
      <span className="text-[17px] leading-7 font-medium text-slate-900">
        <span className="mr-1 text-slate-900">{letter}.</span>
        <span>{label}</span>
      </span>
    </button>
  )
}
