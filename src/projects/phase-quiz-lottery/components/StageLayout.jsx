import { useEffect, useState } from 'react'

const DESIGN_WIDTH = 750
const DESIGN_HEIGHT = 1624

function getStageScale() {
  if (typeof window === 'undefined') return 1
  const widthScale = window.innerWidth / DESIGN_WIDTH
  return Math.min(widthScale, widthScale)
}

export default function StageLayout({ children, className = '' }) {
  const [scale, setScale] = useState(getStageScale)

  useEffect(() => {
    const updateScale = () => {
      const nextScale = getStageScale()
      setScale(nextScale)
      window.__pqlStageMetrics = {
        viewportWidth: window.innerWidth,
        scale: nextScale,
        stageWidth: DESIGN_WIDTH,
      }
    }
    updateScale()
    window.addEventListener('orientationchange', updateScale)
    window.addEventListener('resize', updateScale)
    return () => {
      window.removeEventListener('orientationchange', updateScale)
      window.removeEventListener('resize', updateScale)
    }
  }, [])

  return (
    <div
      className={`pql-stage-layout relative ${className}`.trim()}
      style={{
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        '--pql-stage-scale': scale,
      }}
    >
      <div
        className="relative flex justify-center overflow-hidden"
        style={{
          width: '100vw',
          height: '100vh',
          margin: 0,
          padding: 0,
        }}
      >
        <div
          className="pql-stage-layout__stage"
          style={{
            width: `${DESIGN_WIDTH}px`,
            height: `${DESIGN_HEIGHT}px`,
            margin: 0,
            padding: 0,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
