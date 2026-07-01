import { useLayoutEffect, useRef, useState } from 'react'

const DESIGN_WIDTH = 750

function getInitialScale(height, fitToViewport) {
  if (typeof window === 'undefined') return 1
  const widthScale = window.innerWidth / DESIGN_WIDTH
  const heightScale = fitToViewport ? window.innerHeight / height : 1
  return Math.min(widthScale, heightScale, 1)
}

export default function DesignStage({ height = 1624, fitToViewport = false, children }) {
  const viewportRef = useRef(null)
  const [scale, setScale] = useState(() => getInitialScale(height, fitToViewport))

  useLayoutEffect(() => {
    function updateScale() {
      const containerWidth = viewportRef.current?.parentElement?.getBoundingClientRect().width || window.innerWidth
      const widthScale = containerWidth / DESIGN_WIDTH
      const heightScale = fitToViewport ? window.innerHeight / height : 1
      setScale(Math.min(widthScale, heightScale, 1))
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    window.visualViewport?.addEventListener('resize', updateScale)
    return () => {
      window.removeEventListener('resize', updateScale)
      window.visualViewport?.removeEventListener('resize', updateScale)
    }
  }, [fitToViewport, height])

  return (
    <div
      ref={viewportRef}
      className="quiz-design-viewport"
      style={{ height: height * scale }}
    >
      <div
        className="quiz-design-stage"
        style={{
          width: DESIGN_WIDTH,
          height,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
