import { asset, RESULT_BUTTONS, RESULT_IMAGES } from './config'

export default function ResultPage({ resultId, onAction }) {
  const imageId = Number.isInteger(resultId) && resultId >= 1 && resultId <= 14 ? resultId : 1
  return (
    <section className="liubai-result" aria-label="测试结果">
      {RESULT_IMAGES.map(([name, left, top, width, height]) => (
        <img key={name} className="liubai-art" src={asset(name)} alt="" draggable="false" style={{ left, top, width, height }} />
      ))}
      <img className="liubai-result-card" src={asset(`${imageId}.png`)} alt={`测试结果 ${imageId}`} draggable="false" />
      {RESULT_BUTTONS.map(([action, name, label, left, top, width, height]) => (
        <button key={action} className="liubai-result-button" aria-label={label} onClick={() => onAction(action)} style={{ left, top, width, height }}>
          <img src={asset(name)} alt="" draggable="false" />
        </button>
      ))}
    </section>
  )
}
