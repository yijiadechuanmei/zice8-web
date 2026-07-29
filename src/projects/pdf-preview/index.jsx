import { useEffect, useMemo, useRef, useState } from 'react'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import './styles.css'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const PDF_ASSETS_ORIGIN = 'https://assets.zice8.com'

function normalizePdfKey(value) {
  return String(value || '')
    .trim()
    .replace(/\.pdf$/i, '')
}

function buildPdfUrl(activityKey) {
  return `${PDF_ASSETS_ORIGIN}/pdf/${encodeURIComponent(activityKey)}.pdf`
}

function PdfPage({ documentProxy, pageNumber }) {
  const canvasRef = useRef(null)
  const frameRef = useRef(null)
  const [nearViewport, setNearViewport] = useState(false)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => setNearViewport(entry.isIntersecting),
      { rootMargin: '900px 0px' },
    )
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!documentProxy || !nearViewport) return undefined

    const frame = frameRef.current
    const canvas = canvasRef.current
    if (!frame || !canvas) return undefined

    let disposed = false
    let renderTask = null
    let resizeObserver = null

    const render = async () => {
      if (disposed) return

      const page = await documentProxy.getPage(pageNumber)
      if (disposed) return

      const baseViewport = page.getViewport({ scale: 1 })
      const availableWidth = Math.max(frame.clientWidth - 24, 280)
      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const scale = (availableWidth / baseViewport.width) * devicePixelRatio
      const viewport = page.getViewport({ scale })

      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      canvas.style.width = `${Math.ceil(viewport.width / devicePixelRatio)}px`
      canvas.style.height = `${Math.ceil(viewport.height / devicePixelRatio)}px`

      renderTask?.cancel()
      renderTask = page.render({ canvas, viewport })
      try {
        await renderTask.promise
      } catch (error) {
        if (error?.name !== 'RenderingCancelledException') throw error
      }
    }

    render().catch(() => {})
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => render().catch(() => {}))
      resizeObserver.observe(frame)
    }

    return () => {
      disposed = true
      resizeObserver?.disconnect()
      renderTask?.cancel()
      canvas.width = 1
      canvas.height = 1
    }
  }, [documentProxy, nearViewport, pageNumber])

  return (
    <section className="pdf-preview-page" ref={frameRef} aria-label={`第 ${pageNumber} 页`}>
      <canvas ref={canvasRef} />
    </section>
  )
}

export default function PdfPreviewProject({ routeParams }) {
  const activityKey = normalizePdfKey(routeParams?.activityKey)
  const pdfUrl = useMemo(() => buildPdfUrl(activityKey), [activityKey])
  const [documentProxy, setDocumentProxy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!activityKey) return undefined

    let active = true
    const loadingTask = getDocument({
      url: pdfUrl,
      rangeChunkSize: 256 * 1024,
    })
    loadingTask.onProgress = ({ loaded, total }) => {
      if (!active || !total) return
      setProgress(Math.min(Math.round((loaded / total) * 100), 100))
    }

    document.title = 'PDF'

    loadingTask.promise
      .then((document) => {
        if (!active) {
          document.destroy()
          return
        }
        setDocumentProxy(document)
      })
      .catch(() => {
        if (active) setError('PDF 加载失败，请稍后重试')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      loadingTask.destroy()
    }
  }, [activityKey, pdfUrl])

  return (
    <main className="pdf-preview-app">
      {documentProxy && (
        <div className="pdf-preview-pages">
          {Array.from({ length: documentProxy.numPages }, (_, index) => (
            <PdfPage
              key={index + 1}
              documentProxy={documentProxy}
              pageNumber={index + 1}
            />
          ))}
        </div>
      )}

      {loading && (
        <div className="pdf-preview-loading" role="status">
          <span className="pdf-preview-spinner" aria-hidden="true" />
          <span>{progress > 0 ? `正在加载 ${progress}%` : '正在加载 PDF…'}</span>
        </div>
      )}

      {error && (
        <div className="pdf-preview-error" role="alert">
          {error}
        </div>
      )}
      {!activityKey && (
        <div className="pdf-preview-error" role="alert">
          PDF 文件不存在
        </div>
      )}
    </main>
  )
}
