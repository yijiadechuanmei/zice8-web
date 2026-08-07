import { useEffect, useMemo, useState } from 'react'
import bodyall from './assets/bodyall.svg'
import './styles.css'

export const CHAKRA_ASSESSMENT_ACTIVITY_TYPE = 'chakra_assessment'
export const CHAKRA_ASSESSMENT_ACTIVITY_KEY = 'qimiao_chakra_test_2026'

const CHAKRAS = ['海底轮', '脐轮', '太阳轮', '心轮', '喉轮', '三眼轮', '顶轮']
const REVERSE_QUESTIONS = new Set([3, 6, 7, 13, 16, 18, 20, 26, 31, 37, 46, 47, 55, 56])
const QUESTIONS = [
  '你觉得不管在哪里，都感到很自在？', '你总是很有安全感？', '你行事比较倾向于事前规划而不是随遇而安？', '你觉得你的身心是合一的？',
  '你信任大多数的人吗？', '你容易感到紧张，或者你会尽量避免容易让你紧张的状况？', '你会担心财务状况或家宅的安全？', '你总是感到脚踏实地，专注当下且坚定不移吗？',
  '你可以自由地表达自己的感受？让感受自然地流淌，而不是压抑它们', '你觉得亲密关系和身体欲望都是很自然的？', '你感到有强烈的与人建立情感链接的需求？', '你能自由地表达生理需求方面的感受？',
  '你倾向于把情绪都隐藏起来，不表露出来？', '你是一个非常感性且富有激情的人？', '你总是能清楚地知道自己的喜恶和需求？', '你有自律的习惯？',
  '你通常感觉可以很自由地根据自己的意愿做出行动吗？', '你对自己的本能冲动感到羞耻？', '当必要时，你总是能够坚定地表达自己？', '你容易在社交场合表现得被动和犹豫不决？',
  '你有自信吗？', '你觉得团队合作很轻松？', '你有很强的意志，以至于你总能主宰局势？', '在团队中，你感觉可以掌控事情的发展？',
  '你喜爱大多数的人？', '你会非常小心地表达你的爱，以免受到伤害？', '你努力追求人与人关系的和谐？', '你能轻易地对他人和自己展现出同情心吗？',
  '你总是对别人付出太多以至于忘记了自己？', '如果你和别人产生冲突，你会考虑到别人的感受吗？', '你感到孤僻或寂寞，或者会与人保持距离？', '你是一个天生就很友善的人？',
  '你说话时的声音是洪亮又清晰的？', '你善于沟通，能倾听也善于表达？', '你会用某种艺术形式（音乐、绘画、唱歌等）或其他创造性方式表达自己？', '你善于用语言，符号和概念进行思考？',
  '你感觉很难表达你的需求和感受，所以你很少跟别人谈论这些？', '你善于用写作来沟通？', '你通常会说很多话吗？', '你很有创意？',
  '你很依赖于直觉？', '你善于深入洞察事物吗？', '你能很容易地回忆起做过的梦？', '你对事物有洞见？',
  '你经常幻想吗？', '你觉得很难把事物形象化？', '你经常依赖于他人的洞察力吗？', '你常常有好的，创新的想法？',
  '你感觉自己是背后一股更大力量的展现？', '你觉得和身边所有围绕你的事物或宇宙间有某种联系？', '你把发生在自己身上的任何事都看作是学习的过程？', '你觉得巧合通常是有意义的，而非全是随机发生的？',
  '你感觉到完整的自我意识？', '你接受发生在你身上的一切吗？', '你是否很依赖于某些人或事？', '是否经常有些情况你想极力避免？',
]

function scoreAnswers(answers) {
  return CHAKRAS.map((_, chakraIndex) => {
    let units = 0
    for (let offset = 0; offset < 8; offset += 1) {
      const questionIndex = chakraIndex * 8 + offset
      const questionNumber = questionIndex + 1
      units += (REVERSE_QUESTIONS.has(questionNumber) ? -1 : 1) * (answers[questionIndex] - 2)
    }
    return units * 6.25
  })
}

function statusFor(score) {
  if (score <= 0) return '不活跃'
  if (score <= 56.25) return '已开启'
  return '过度活跃'
}

export default function ChakraAssessmentProject({ routeParams }) {
  const activityKey = routeParams?.activityKey || CHAKRA_ASSESSMENT_ACTIVITY_KEY
  const [page, setPage] = useState('home')
  const [answers, setAnswers] = useState(() => Array(56).fill(2))
  const scores = useMemo(() => scoreAnswers(answers), [answers])

  useEffect(() => {
    document.title = '脉轮测试'
  }, [activityKey])

  function returnHome() {
    if (page === 'question' && !window.confirm('返回首页将不保存当前页面答案')) return
    setAnswers(Array(56).fill(2))
    setPage('home')
    window.scrollTo({ top: 0 })
  }

  if (page === 'home') {
    return (
      <>
        <main className="chakra-assessment chakra-home-main">
          <div className="chakra-home-content">
            <div className="chakra-home-box">
              <div className="chakra-home-title">
                <div className="chakra-home-content-item">
                  <div className="chakra-home-copy">
                    <h4>脉轮测试</h4>
                    <p>脉轮测试可以准确反映你当前的能量状态，包括各部分的身体健康、生活、人际、感情、事业等方面，通过测试找到当前的症结所在</p>
                    <p>本测试共56个问题，每个问题请选择程度，从“完全没有”到“感觉强烈”，请跟着感觉凭借第一直觉回答问题，无需思考，就可以得到准确的结果</p>
                    <p>本测试预计花费你5-6分钟的时间，请找个安静的地方，坐下来，调整呼吸，让我们开始测试吧！</p>
                  </div>
                  <div className="chakra-home-art"><img src={bodyall} alt="" /></div>
                </div>
                <div className="chakra-button-wrap"><button className="chakra-button" type="button" onClick={() => setPage('question')}>让我们开始吧</button></div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (page === 'question') {
    return (
      <main className="chakra-assessment chakra-question-page">
        <header className="chakra-header"><button type="button" onClick={returnHome}>返回首页</button></header>
        <section className="chakra-question-scroll">
          <div className="chakra-question-wrapper">
            <form className="chakra-form" onSubmit={(event) => { event.preventDefault(); setPage('result'); window.scrollTo({ top: 0 }) }}>
              {QUESTIONS.map((question, questionIndex) => (
                <div className="chakra-question-item" id={`question_${questionIndex + 1}`} key={question}>
                  <div className="chakra-question-title">{question}</div>
                  <div className="chakra-question-content">
                    <span>完全没有</span>
                    <div className="chakra-radio-group">
                      {[0, 1, 2, 3, 4].map((value) => (
                        <label className="chakra-radio-item" key={value}>
                          <input type="radio" name={`option-${questionIndex + 1}`} value={value} checked={answers[questionIndex] === value} onChange={() => setAnswers((current) => current.map((answer, index) => index === questionIndex ? value : answer))} />
                          <i aria-hidden="true" />
                        </label>
                      ))}
                    </div>
                    <span>强烈感觉</span>
                  </div>
                </div>
              ))}
              <div className="chakra-question-button-wrap"><button className="chakra-button" type="submit">下一步</button></div>
            </form>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="chakra-assessment chakra-result-page">
      <header className="chakra-header"><button type="button" onClick={returnHome}>返回首页</button></header>
      <section className="chakra-result-scroll">
        <div className="chakra-result-wrapper">
          <div className="chakra-result">
            <div className="chakra-result-left">
              <div className="chakra-chart" aria-label="七脉轮结果图">
                {scores.map((score, index) => <div className={`chakra-bar chakra-bar-${index + 1}`} key={CHAKRAS[index]}><i style={{ height: `${50 + score / 2}%` }} /><span>{CHAKRAS[index]}</span></div>)}
              </div>
              <div className="chakra-result-message">
                <ul>{scores.map((score, index) => <li key={CHAKRAS[index]}><span>{CHAKRAS[index]}:</span><span>{statusFor(score)} ({score}%)</span></li>)}</ul>
                <p>百分比在 -100% 到 100%之间</p>
              </div>
            </div>
            <div className="chakra-result-right"><p>看不懂结果？没关系！</p><p><strong>长按二维码</strong>，添加其妙工作室的微信，免费为你进行专业的一对一详细解读</p></div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}

function Footer() {
  return <div className="chakra-footer"><a href="https://beian.miit.gov.cn/" rel="noreferrer" target="_blank">粤ICP备2024201847号</a></div>
}
