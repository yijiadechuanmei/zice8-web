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

async function fetchPdfData(url, signal, onProgress) {
  const response = await fetch(url, {
    signal,
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  })
  if (!response.ok) {
    const error = new Error(`PDF 请求失败（${response.status}）`)
    error.status = response.status
    throw error
  }

  const total = Number(response.headers.get('content-length')) || 0
  if (!response.body) {
    const data = new Uint8Array(await response.arrayBuffer())
    onProgress(data.byteLength, total || data.byteLength)
    return data
  }

  const reader = response.body.getReader()
  const chunks = []
  let loaded = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.byteLength
    onProgress(loaded, total)
  }

  const data = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    data.set(chunk, offset)
    offset += chunk.byteLength
  }
  return data
}

function PdfPage({ documentProxy, pageNumber }) {
  const canvasRef = useRef(null)
  const frameRef = useRef(null)
  const [nearViewport, setNearViewport] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )
  const [rendered, setRendered] = useState(false)

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

      const canvasContext = canvas.getContext('2d')
      if (!canvasContext) throw new Error('无法创建 PDF 画布')
      const renderTask = page.render({ canvasContext, viewport })
      try {
        await renderTask.promise
        if (!disposed) setRendered(true)
      } catch (error) {
        if (error?.name !== 'RenderingCancelledException') throw error
      }
    }

    render().catch((renderError) => {
      if (!disposed) console.error('[pdf-preview] page render failed', renderError)
    })

    return () => { disposed = true }
  }, [documentProxy, nearViewport, pageNumber])

  return (
    <section
      className={`pdf-preview-page${rendered ? ' pdf-preview-page--rendered' : ''}`}
      ref={frameRef}
      aria-label={`第 ${pageNumber} 页`}
    >
      <canvas ref={canvasRef} />
      {!rendered && (
        <div className="pdf-preview-page__loading" aria-hidden="true">
          <span className="pdf-preview-spinner pdf-preview-spinner--dark" />
          <span>正在渲染第 {pageNumber} 页</span>
        </div>
      )}
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
    let loadingTask = null
    const abortController = new AbortController()

    fetchPdfData(pdfUrl, abortController.signal, (loaded, total) => {
      if (!active || !total) return
      setProgress(Math.min(Math.round((loaded / total) * 100), 100))
    })
      .then((data) => {
        if (!active) return null
        loadingTask = getDocument({ data })
        return loadingTask.promise
      })
      .then((document) => {
        if (!document) return
        if (!active) {
          document.destroy()
          return
        }
        setDocumentProxy(document)
      })
      .catch((loadError) => {
        if (loadError?.name === 'AbortError') return
        console.error('[pdf-preview] load failed', loadError)
        if (active) setPdfError('PDF 加载失败，请检查网络后重试')
      })
      .finally(() => {
        if (active) setPdfLoading(false)
      })

    return () => {
      active = false
      abortController.abort()
      loadingTask?.destroy()
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
