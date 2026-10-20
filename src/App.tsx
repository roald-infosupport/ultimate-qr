import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import {
  classify,
  computeEncodedContent,
  trimInput,
  type ContentType,
} from './lib/qrContent'
import {
  defaultTrackingToggles,
  groupByCategory,
  TRACKING_PARAMETER_CATALOG,
} from './lib/trackingParams'
import { resolveLocalWrapper, resolveViaNetwork } from './lib/followLink'
import { computeCapacityStatus, truncateToCapacity } from './lib/capacity'
import {
  checkRawFileSize,
  processUploadedFile,
  readFileBytes,
  toDataUri,
  type UploadedFile,
} from './lib/fileUpload'
import { computeScannabilityRisk } from './lib/scannabilityRisk'
import './App.css'

const DEBOUNCE_MS = 150
const UPDATING_INDICATOR_THRESHOLD_MS = 300
const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.5
const FOLLOW_LINK_FAILURE_MESSAGE =
  "Couldn't verify this link's destination. It may be a shortener that blocks cross-origin checks, or the link may already be direct."

type FollowLinkOutcome =
  | 'notAttempted'
  | 'localWrapperResolved'
  | 'networkResolved'
  | 'failed'

interface FollowLinkState {
  outcome: FollowLinkOutcome
  failureMessage?: string
}

function isClickableLink(contentType: ContentType, content: string): boolean {
  return contentType === 'Link' && /^https?:\/\//i.test(content)
}

const TRACKING_PARAMETER_GROUPS = groupByCategory(TRACKING_PARAMETER_CATALOG)

function App() {
  const [rawInput, setRawInput] = useState('')
  const [committedInput, setCommittedInput] = useState('')
  const [schemeAutoAddEnabled, setSchemeAutoAddEnabled] = useState(true)
  const [trackingToggles, setTrackingToggles] = useState<
    Record<string, boolean>
  >(defaultTrackingToggles)
  const [followLinkState, setFollowLinkState] = useState<FollowLinkState>({
    outcome: 'notAttempted',
  })
  const [isResolvingFollowLink, setIsResolvingFollowLink] = useState(false)

  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [uploadMessageKind, setUploadMessageKind] = useState<
    'error' | 'info' | null
  >(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [isProcessingUpload, setIsProcessingUpload] = useState(false)

  useEffect(() => {
    const timer = setTimeout(
      () => setCommittedInput(truncateToCapacity(rawInput, 'M')),
      DEBOUNCE_MS,
    )
    return () => clearTimeout(timer)
  }, [rawInput])

  function handleRawInputChange(value: string) {
    setRawInput(value)
    setFollowLinkState({ outcome: 'notAttempted' })
    setUploadedFile(null)
    setUploadMessage(null)
    setUploadMessageKind(null)
  }

  function applyResolvedInput(destination: string) {
    setRawInput(destination)
    setCommittedInput(destination)
  }

  async function handleFileSelected(file: File) {
    if (isProcessingUpload) return

    const sizeCheck = checkRawFileSize(file)
    if (!sizeCheck.ok) {
      setUploadedFile(null)
      setUploadMessageKind('error')
      setUploadMessage(sizeCheck.message)
      return
    }

    // Uploading a file replaces any typed input (mutually exclusive sources).
    setRawInput('')
    setCommittedInput('')
    setFollowLinkState({ outcome: 'notAttempted' })

    setIsProcessingUpload(true)
    try {
      const bytes = await readFileBytes(file)
      const result = processUploadedFile(file.name, bytes, 'M')

      if (result.outcome === 'accepted') {
        setUploadedFile(result.file)
        if (result.minificationApplied) {
          setUploadMessageKind('info')
          setUploadMessage('File was minified to fit QR capacity.')
        } else {
          setUploadMessageKind(null)
          setUploadMessage(null)
        }
      } else {
        setUploadedFile(null)
        setUploadMessageKind('error')
        setUploadMessage(result.message)
      }
    } finally {
      setIsProcessingUpload(false)
    }
  }

  function toggleTrackingParam(name: string) {
    setTrackingToggles((current) => ({
      ...current,
      [name]: current[name] === false,
    }))
  }

  const hasUploadedFile = uploadedFile !== null
  const trimmedInput = trimInput(committedInput)
  const typedContentType = classify(trimmedInput)
  const typedEncodedContent = computeEncodedContent(
    trimmedInput,
    typedContentType,
    schemeAutoAddEnabled,
    trackingToggles,
  )
  const contentType: ContentType = hasUploadedFile ? 'File' : typedContentType
  const encodedContent = hasUploadedFile
    ? toDataUri(uploadedFile.mimeType, uploadedFile.finalBytes)
    : typedEncodedContent
  const isEmpty = !hasUploadedFile && trimmedInput === ''
  const capacityStatus = computeCapacityStatus(encodedContent, 'M')

  async function handleFollowLink() {
    if (isResolvingFollowLink) return
    setIsResolvingFollowLink(true)

    try {
      const localDestination = resolveLocalWrapper(encodedContent)
      if (localDestination && classify(trimInput(localDestination)) === 'Link') {
        applyResolvedInput(localDestination)
        setFollowLinkState({ outcome: 'localWrapperResolved' })
        return
      }

      const networkDestination = await resolveViaNetwork(encodedContent)
      if (
        networkDestination &&
        classify(trimInput(networkDestination)) === 'Link'
      ) {
        applyResolvedInput(networkDestination)
        setFollowLinkState({ outcome: 'networkResolved' })
        return
      }

      setFollowLinkState({
        outcome: 'failed',
        failureMessage: FOLLOW_LINK_FAILURE_MESSAGE,
      })
    } catch {
      setFollowLinkState({
        outcome: 'failed',
        failureMessage: FOLLOW_LINK_FAILURE_MESSAGE,
      })
    } finally {
      setIsResolvingFollowLink(false)
    }
  }

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrError, setQrError] = useState(false)
  const [qrErrorMessage, setQrErrorMessage] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)

  // Scaffold for stories 005/006: both inputs stay null until logo/color
  // design parameters exist, so this never triggers today (degrades
  // gracefully per spec 004 section 5.4).
  const scannabilityRisk = computeScannabilityRisk(null, null)
  const [dismissedRiskFactors, setDismissedRiskFactors] = useState<string | null>(null)
  const scannabilityWarningDismissed =
    dismissedRiskFactors === scannabilityRisk.riskFactors.join(',')

  useEffect(() => {
    if (isEmpty) {
      setQrDataUrl(null)
      setQrError(false)
      setQrErrorMessage(null)
      setIsUpdating(false)
      return
    }

    let cancelled = false
    const indicatorTimer = setTimeout(() => {
      if (!cancelled) setIsUpdating(true)
    }, UPDATING_INDICATOR_THRESHOLD_MS)

    QRCode.toDataURL(encodedContent, { errorCorrectionLevel: 'M', margin: 1 })
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url)
          setQrError(false)
          setQrErrorMessage(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setQrDataUrl(null)
          setQrError(true)
          setQrErrorMessage(
            err instanceof Error
              ? `Couldn't generate a QR code for this content: ${err.message}`
              : "Couldn't generate a QR code for this content.",
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          clearTimeout(indicatorTimer)
          setIsUpdating(false)
        }
      })

    return () => {
      cancelled = true
      clearTimeout(indicatorTimer)
    }
  }, [encodedContent, isEmpty])

  return (
    <section id="center">
      <h1>QR Maker</h1>
      <p>Paste a link, type some text, or upload a file to get an instant QR code.</p>

      <div className="input-row">
        <input
          type="text"
          value={rawInput}
          onChange={(event) => handleRawInputChange(event.target.value)}
          placeholder="https://example.com or any text"
          aria-label="Content to encode"
          disabled={isResolvingFollowLink}
        />
        <label className="scheme-toggle">
          <input
            type="checkbox"
            checked={schemeAutoAddEnabled}
            onChange={(event) => setSchemeAutoAddEnabled(event.target.checked)}
          />
          Auto-add https://
        </label>
      </div>

      <div
        className={`upload-row${isDraggingFile ? ' upload-row--dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDraggingFile(true)
        }}
        onDragLeave={() => setIsDraggingFile(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDraggingFile(false)
          const file = event.dataTransfer.files[0]
          if (file) handleFileSelected(file)
        }}
      >
        <input
          type="file"
          accept=".ics,.ico,.svg,.vcf"
          aria-label="Upload a file to encode"
          disabled={isProcessingUpload}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) handleFileSelected(file)
            event.target.value = ''
          }}
        />
        <p className="upload-hint">or drag and drop a .ics, .ico, .svg, or .vcf file</p>
        {uploadMessage && (
          <p className={uploadMessageKind === 'error' ? 'upload-error' : 'upload-info'}>
            {uploadMessage}
          </p>
        )}
      </div>

      <div className="tracking-params">
        <h2 className="tracking-params-heading">Tracking cleanup</h2>
        {TRACKING_PARAMETER_GROUPS.map((group) => (
          <fieldset className="tracking-group" key={group.category}>
            <legend>{group.category}</legend>
            {group.params.map((param) => (
              <label className="tracking-toggle" key={param.name}>
                <input
                  type="checkbox"
                  checked={trackingToggles[param.name] !== false}
                  onChange={() => toggleTrackingParam(param.name)}
                />
                {param.name}
              </label>
            ))}
          </fieldset>
        ))}
      </div>

      {contentType === 'Link' && (
        <div className="follow-link">
          <button
            type="button"
            onClick={handleFollowLink}
            disabled={isResolvingFollowLink}
          >
            {isResolvingFollowLink ? 'Checking…' : 'Follow Link'}
          </button>
          {followLinkState.outcome === 'failed' && (
            <p className="follow-link-error">{followLinkState.failureMessage}</p>
          )}
        </div>
      )}

      <div className="preview">
        {isEmpty ? (
          <div className="empty-state">Enter a link or text to see your QR code</div>
        ) : qrError ? (
          <div className="error-state">
            {qrErrorMessage ?? "Couldn't generate a QR code for this content."}
          </div>
        ) : (
          <>
            {isUpdating && <div className="updating-indicator">Updating…</div>}
            {!scannabilityWarningDismissed && scannabilityRisk.isAtRisk && (
              <div className="scannability-warning">
                <span>
                  This design may be harder to scan (
                  {scannabilityRisk.riskFactors.join(', ')}).
                </span>
                <button
                  type="button"
                  className="scannability-warning-dismiss"
                  onClick={() =>
                    setDismissedRiskFactors(scannabilityRisk.riskFactors.join(','))
                  }
                  aria-label="Dismiss scannability warning"
                >
                  ×
                </button>
              </div>
            )}
            {qrDataUrl && (
              <div className="qr-zoom-frame">
                <img
                  src={qrDataUrl}
                  alt="Generated QR code"
                  width={220}
                  height={220}
                  style={{ transform: `scale(${zoomLevel})` }}
                />
              </div>
            )}
            <div className="zoom-controls">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
                disabled={zoomLevel <= MIN_ZOOM}
                aria-label="Zoom out"
              >
                −
              </button>
              <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
                disabled={zoomLevel >= MAX_ZOOM}
                aria-label="Zoom in"
              >
                +
              </button>
            </div>
            <div className="meta">
              <span className="content-type">{contentType}</span>
              {contentType === 'File' && uploadedFile && (
                <span className="file-type">.{uploadedFile.extension}</span>
              )}
              {contentType === 'File' && uploadedFile ? (
                uploadedFile.extension === 'ico' || uploadedFile.extension === 'svg' ? (
                  <img
                    className="file-thumbnail"
                    src={toDataUri(uploadedFile.mimeType, uploadedFile.finalBytes)}
                    alt={`Preview of uploaded ${uploadedFile.extension} file`}
                  />
                ) : (
                  <pre className="content-text file-text-preview">
                    {new TextDecoder().decode(uploadedFile.finalBytes)}
                  </pre>
                )
              ) : isClickableLink(contentType, encodedContent) ? (
                <a href={encodedContent} target="_blank" rel="noopener noreferrer">
                  {encodedContent}
                </a>
              ) : (
                <span className="content-text">{encodedContent}</span>
              )}
              {capacityStatus.status === 'warning' && (
                <span className="capacity-warning">
                  Approaching QR capacity ({capacityStatus.capacityUsedBytes} /{' '}
                  {capacityStatus.capacityMaxBytes} bytes)
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default App
