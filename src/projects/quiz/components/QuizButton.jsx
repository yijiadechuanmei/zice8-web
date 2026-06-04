export default function QuizButton({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button className={`quiz-button quiz-button-${variant} ${className}`} type="button" {...props}>
      {children}
    </button>
  )
}
