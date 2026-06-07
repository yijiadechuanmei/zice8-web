export default function QuizButton({ children, variant = 'primary', className = '', ...props }) {
  const variantClassName =
    variant === 'secondary'
      ? 'bg-[#e5efba] text-[#255332] hover:bg-[#d9e8a1]'
      : 'bg-[#177245] text-white hover:bg-[#145f39]'

  return (
    <button
      className={`inline-flex min-h-12 w-full items-center justify-center rounded-lg px-4 text-base font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variantClassName} ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}
