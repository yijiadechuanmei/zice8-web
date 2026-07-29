import { useEffect, useMemo, useRef, useState } from 'react'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf'
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.js?url'
import { request } from '../../shared/api/request'
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

function resolvePdfUrl(publicConfig, fallback) {
  const configuredUrl = publicConfig?.mobileConfig?.pdfUrl
  return typeof configuredUrl === 'string' && configuredUrl.trim()
    ? configuredUrl.trim()
    : fallback
}

function PdfPage({ documentProxy, pageNumber }) {
  const canvasRef = useRef(null)
  const frameRef = useRef(null)
  const [nearViewport, setNearViewport] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return undefined
    if (typeof IntersectionObserver === 'undefined') return undefined

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
  const [publicConfig, setPublicConfig] = useState(null)
  const [configLoading, setConfigLoading] = useState(Boolean(activityKey))
  const [configError, setConfigError] = useState('')
  const [documentProxy, setDocumentProxy] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(Boolean(activityKey))
  const [progress, setProgress] = useState(0)
  const [pdfError, setPdfError] = useState('')
  const pdfUrl = useMemo(
    () => resolvePdfUrl(publicConfig, buildPdfUrl(activityKey)),
    [activityKey, publicConfig],
  )

  useEffect(() => {
    if (!activityKey) return undefined

    let active = true
    request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })
      .then((config) => {
        if (!active) return
        setPublicConfig(config)
        document.title = config?.title || 'PDF'
      })
      .catch(() => {
        if (active) {
          setConfigError('项目配置加载失败，请稍后重试')
          setPdfLoading(false)
        }
      })
      .finally(() => {
        if (active) setConfigLoading(false)
      })

    return () => {
      active = false
    }
  }, [activityKey])

  useEffect(() => {
    if (!activityKey || configLoading || configError) return undefined

    let active = true
    const loadingTask = getDocument({
      url: pdfUrl,
      rangeChunkSize: 256 * 1024,
    })
    loadingTask.onProgress = ({ loaded, total }) => {
      if (!active || !total) return
      setProgress(Math.min(Math.round((loaded / total) * 100), 100))
    }

    loadingTask.promise
      .then((document) => {
        if (!active) {
          document.destroy()
          return
        }
        setDocumentProxy(document)
      })
      .catch((loadError) => {
        console.error('[pdf-preview] load failed', loadError)
        if (active) setPdfError('PDF 加载失败，请检查网络后重试')
      })
      .finally(() => {
        if (active) setPdfLoading(false)
      })

    return () => {
      active = false
      loadingTask.destroy()
    }
  }, [activityKey, configError, configLoading, pdfUrl])

  const loading = configLoading || pdfLoading
  const error = configError || pdfError

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
