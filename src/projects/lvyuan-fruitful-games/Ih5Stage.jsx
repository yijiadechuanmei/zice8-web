import { useEffect, useState } from 'react'

const DESIGN_WIDTH = 750
const DESIGN_HEIGHT = 1624

function getScale() {
  const viewport = window.visualViewport
  const viewportWidth = viewport?.width || window.innerWidth
  const viewportHeight = viewport?.height || window.innerHeight
  const widthScale = viewportWidth / DESIGN_WIDTH
  const heightScale = viewportHeight / DESIGN_HEIGHT

  // Mobile WebViews can be taller than a width-fitted design stage. Cover the
  // visible viewport in portrait mode, then center-crop only the side artwork.
  if (viewportWidth < DESIGN_WIDTH) return Math.min(Math.max(widthScale, heightScale), 1)
  return Math.min(widthScale, 1)
}

export default function Ih5Stage({ children, label }) {
  const [scale, setScale] = useState(getScale)

  useEffect(() => {
    const updateScale = () => setScale(getScale())
    const viewport = window.visualViewport
    window.addEventListener('resize', updateScale)
    viewport?.addEventListener('resize', updateScale)
    return () => {
      window.removeEventListener('resize', updateScale)
      viewport?.removeEventListener('resize', updateScale)
    }
  }, [])

  return (
    <div className="lyfg-ih5-frame" style={{ width: DESIGN_WIDTH * scale, height: DESIGN_HEIGHT * scale }}>
      <section className="lyfg-ih5-canvas" style={{ transform: `scale(${scale})` }} aria-label={label}>
        {children}
      </section>
    </div>
  )
}
