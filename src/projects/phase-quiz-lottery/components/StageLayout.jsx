import { useEffect, useMemo, useRef, useState } from 'react'

const DESIGN_WIDTH = 750
const DESIGN_HEIGHT = 1624

export default function StageLayout({ children, className = '' }) {
  const hostRef = useRef(null)
  const [viewport, setViewport] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = hostRef.current
    if (!element) return undefined

    const updateViewport = () => {
      setViewport({
        width: element.clientWidth || window.innerWidth || DESIGN_WIDTH,
        height: element.clientHeight || window.innerHeight || DESIGN_HEIGHT,
      })
    }

    updateViewport()
    const observer = new ResizeObserver(updateViewport)
    observer.observe(element)
    window.addEventListener('resize', updateViewport)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateViewport)
    }
  }, [])

  const stageStyle = useMemo(() => {
    const width = viewport.width || window.innerWidth || DESIGN_WIDTH
    const height = viewport.height || window.innerHeight || DESIGN_HEIGHT
    const scale = Math.max(width / DESIGN_WIDTH, height / DESIGN_HEIGHT)
    const scaledWidth = DESIGN_WIDTH * scale
    const scaledHeight = DESIGN_HEIGHT * scale
    return {
      transform: `translate(${(width - scaledWidth) / 2}px, ${(height - scaledHeight) / 2}px) scale(${scale})`,
    }
  }, [viewport.height, viewport.width])

  return (
    <div ref={hostRef} className={`relative min-h-screen w-full overflow-hidden ${className}`.trim()}>
      <div className="relative min-h-screen w-full overflow-hidden pt-[env(safe-area-inset-top,0px)] pr-[env(safe-area-inset-right,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)]">
        <div className="pql-stage-layout__stage" style={stageStyle}>
          {children}
        </div>
      </div>
    </div>
  )
}
