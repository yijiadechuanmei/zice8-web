export default function OptionItem({ option, selected, locked, state, onClick }) {
  return (
    <button
      className={`quiz-option ${selected ? 'is-selected' : ''} ${state ? `is-${state}` : ''}`}
      type="button"
      disabled={locked}
      onClick={onClick}
    >
      <span className="quiz-option-label">{option.label}</span>
      <span className="quiz-option-content">{option.content}</span>
    </button>
  )
}
