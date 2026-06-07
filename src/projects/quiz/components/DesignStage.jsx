import { useEffect, useRef, useState } from 'react'

const DESIGN_WIDTH = 750

export default function DesignStage({ height = 1624, children }) {
  const viewportRef = useRef(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    function updateScale() {
      const containerWidth = viewportRef.current?.parentElement?.getBoundingClientRect().width || window.innerWidth
      setScale(Math.min(containerWidth / DESIGN_WIDTH, 1))
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

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
