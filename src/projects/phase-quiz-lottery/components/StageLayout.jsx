import { useEffect, useState } from 'react'

const DESIGN_WIDTH = 750
const DESIGN_HEIGHT = 1624

export default function StageLayout({ children, className = '' }) {
  const [scale, setScale] = useState(() => {
    if (typeof window === 'undefined') return 1
    return window.innerWidth / DESIGN_WIDTH
  })

  useEffect(() => {
    const updateScale = () => setScale((window.innerWidth || DESIGN_WIDTH) / DESIGN_WIDTH)
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  return (
    <div className={`relative h-[100vh] w-[100vw] overflow-hidden ${className}`.trim()}>
      <div className="relative flex h-full w-full justify-center overflow-hidden pt-[env(safe-area-inset-top,0px)] pr-[env(safe-area-inset-right,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)]">
        <div
          className="pql-stage-layout__stage"
          style={{
            width: `${DESIGN_WIDTH}px`,
            height: `${DESIGN_HEIGHT}px`,
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
