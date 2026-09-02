import { useEffect, useState } from 'react'

const DESIGN_WIDTH = 750
const DESIGN_HEIGHT = 1624

function getScale() {
  return Math.min(window.innerWidth / DESIGN_WIDTH, 1)
}

export default function Ih5Stage({ children, label }) {
  const [scale, setScale] = useState(getScale)

  useEffect(() => {
    const updateScale = () => setScale(getScale())
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  return (
    <div className="lyfg-ih5-frame" style={{ width: DESIGN_WIDTH * scale, height: DESIGN_HEIGHT * scale }}>
      <section className="lyfg-ih5-canvas" style={{ transform: `scale(${scale})` }} aria-label={label}>
        {children}
      </section>
    </div>
  )
}
