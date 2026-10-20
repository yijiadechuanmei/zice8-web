import { useLayoutEffect, useRef, useState } from 'react'

/** A width-fitted reference canvas. The parent controls centring and scrolling. */
export default function DesignStage({ width = 750, height = 1448, children, className = '' }) {
  const frame = useRef(null)
  const [scale, setScale] = useState(() => Math.min(window.innerWidth / width, 1))

  useLayoutEffect(() => {
    const update = () => {
      const available = frame.current?.parentElement?.clientWidth || window.innerWidth
      setScale(Math.min(available / width, 1))
    }
    update()
    const observer = new ResizeObserver(update)
    if (frame.current?.parentElement) observer.observe(frame.current.parentElement)
    return () => observer.disconnect()
  }, [width])

  return (
    <div ref={frame} style={{ position: 'relative', width: width * scale, height: height * scale, flexShrink: 0 }}>
      <div className={className} style={{ position: 'relative', width, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  )
}
