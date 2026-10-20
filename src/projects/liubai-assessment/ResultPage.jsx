import { asset, RESULT_BUTTONS, RESULT_IMAGES } from './config'

// 当前按用户要求展示设计稿的固定内容；后续再接入不同矿石的结果。
export default function ResultPage({ onAction }) {
  return (
    <section className="liubai-result" aria-label="测试结果">
      {RESULT_IMAGES.map(([name, left, top, width, height]) => (
        <img key={name} className="liubai-art" src={asset(name)} alt="" draggable="false" style={{ left, top, width, height }} />
      ))}
      <div className="liubai-result-name">
        <h1>黑曜石—定力之石</h1>
        <p>OBSIDIAN.STONE OF COMPOSURE</p>
      </div>
      <div className="liubai-result-copy">
        <h2>「边界守序者」</h2>
        <p>{'选中这只杯的你，是生活里的「边界守序者」\n外界再喧嚣，也打乱不了你的内在节奏\n你心里自有标尺，不盲从、不越界，纷乱里也能站得安稳\n这份在地底沉淀千万年的沉静力量，会帮你加固内心的防线，隔绝无关干扰\n守得住秩序，也守得住自己'}</p>
      </div>
      {RESULT_BUTTONS.map(([action, name, label, left, top, width, height]) => (
        <button key={action} className="liubai-result-button" aria-label={label} onClick={() => onAction(action)} style={{ left, top, width, height }}>
          <img src={asset(name)} alt="" draggable="false" />
        </button>
      ))}
    </section>
  )
}
