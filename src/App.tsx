import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import QRCode from 'qrcode'
import {
  classify,
  computeEncodedContent,
  trimInput,
  type ContentType,
} from './lib/qrContent'
import {
  buildPresentParameterGroups,
  resolveToggleState,
} from './lib/trackingParams'
import { resolveLocalWrapper, resolveViaNetwork } from './lib/followLink'
import {
  computeCapacityStatus,
  truncateToCapacity,
  type ErrorCorrectionLevel,
} from './lib/capacity'
import {
  checkRawFileSize,
  processUploadedFile,
  readFileBytes,
  toDataUri,
  type UploadedFile,
} from './lib/fileUpload'
import { computeScannabilityRisk } from './lib/scannabilityRisk'
import {
  checkRawLogoFileSize,
  clampLogoPosition,
  clampLogoSizePercent,
  computeLogoCoveragePercent,
  DEFAULT_BACKING_PLATE_COLOR,
  DEFAULT_LOGO_POSITION,
  DEFAULT_LOGO_SIZE_PERCENT,
  MAX_LOGO_SIZE_PERCENT,
  processUploadedLogo,
  type LogoConfiguration,
} from './lib/logoConfig'
import './App.css'

const DEBOUNCE_MS = 150
const UPDATING_INDICATOR_THRESHOLD_MS = 300
const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.5
const QR_FRAME_SIZE = 220

const EMPTY_LOGO_CONFIG: LogoConfiguration = {
  isActive: false,
  fileName: null,
  extension: null,
  mimeType: null,
  imageData: null,
  sizePercent: null,
  backingPlateColor: null,
  positionPercent: DEFAULT_LOGO_POSITION,
  errorCorrectionLevelBeforeLogo: null,
  ecLevelAutoSet: false,
}
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

function App() {
  const [rawInput, setRawInput] = useState('')
  const [committedInput, setCommittedInput] = useState('')
  const [schemeAutoAddEnabled, setSchemeAutoAddEnabled] = useState(true)
  const [trackingToggles, setTrackingToggles] = useState<
    Record<string, boolean>
  >({})
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
  const [inputWasTruncated, setInputWasTruncated] = useState(false)

  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState<ErrorCorrectionLevel>('M')
  // Mirrors errorCorrectionLevel for reads from async continuations (e.g.
  // handleLogoSelected after its await) where the closed-over state value
  // can be stale relative to what's actually committed.
  const errorCorrectionLevelRef = useRef(errorCorrectionLevel)
  useEffect(() => {
    errorCorrectionLevelRef.current = errorCorrectionLevel
  }, [errorCorrectionLevel])

  const [logoConfig, setLogoConfig] = useState<LogoConfiguration>(EMPTY_LOGO_CONFIG)
  const [logoMessage, setLogoMessage] = useState<string | null>(null)
  const [isDraggingLogoFile, setIsDraggingLogoFile] = useState(false)
  const [isProcessingLogo, setIsProcessingLogo] = useState(false)
  const [isRepositioningLogo, setIsRepositioningLogo] = useState(false)
  const [rawLogoSizePercent, setRawLogoSizePercent] = useState(DEFAULT_LOGO_SIZE_PERCENT)
  const [committedLogoSizePercent, setCommittedLogoSizePercent] = useState(
    DEFAULT_LOGO_SIZE_PERCENT,
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      const truncated = truncateToCapacity(rawInput, errorCorrectionLevel)
      setCommittedInput(truncated)
      setInputWasTruncated(truncated.length < rawInput.length)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [rawInput, errorCorrectionLevel])

  useEffect(() => {
    const timer = setTimeout(
      () => setCommittedLogoSizePercent(clampLogoSizePercent(rawLogoSizePercent)),
      DEBOUNCE_MS,
    )
    return () => clearTimeout(timer)
  }, [rawLogoSizePercent])

  // Keeps logoConfig.sizePercent (the value the drag handler clamps against)
  // in sync with committedLogoSizePercent (the value actually rendered), and
  // re-clamps the stored position whenever the committed size changes. Without
  // this, growing the logo after dragging it near an edge at a smaller size
  // left the backing plate positioned for the old, smaller half-width — so
  // the enlarged plate could clip against the QR frame's edge.
  useEffect(() => {
    setLogoConfig((current) => {
      if (!current.isActive || current.sizePercent === committedLogoSizePercent) return current
      return {
        ...current,
        sizePercent: committedLogoSizePercent,
        positionPercent: clampLogoPosition(
          current.positionPercent.x,
          current.positionPercent.y,
          committedLogoSizePercent,
        ),
      }
    })
  }, [committedLogoSizePercent])

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
      setUploadMessageKind('error')
      setUploadMessage(sizeCheck.message)
      return
    }

    setIsProcessingUpload(true)
    try {
      const bytes = await readFileBytes(file)
      const result = processUploadedFile(file.name, bytes, errorCorrectionLevel)

      if (result.outcome === 'accepted') {
        // Uploading a file replaces any typed input (mutually exclusive
        // sources) — but only once the upload actually succeeds, so a
        // rejected upload never wipes out previously-typed or previously-
        // uploaded content.
        setRawInput('')
        setCommittedInput('')
        setFollowLinkState({ outcome: 'notAttempted' })
        setUploadedFile(result.file)
        if (result.minificationApplied) {
          setUploadMessageKind('info')
          setUploadMessage('File was minified to fit QR capacity.')
        } else {
          setUploadMessageKind(null)
          setUploadMessage(null)
        }
      } else {
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
      [name]: !resolveToggleState(name, current),
    }))
  }

  async function handleLogoSelected(file: File) {
    if (isProcessingLogo) return

    const sizeCheck = checkRawLogoFileSize(file)
    if (!sizeCheck.ok) {
      setLogoMessage(sizeCheck.message)
      return
    }

    setIsProcessingLogo(true)
    try {
      const bytes = await readFileBytes(file)
      const result = processUploadedLogo(file.name, bytes)

      if (result.outcome === 'accepted') {
        setLogoMessage(null)
        setRawLogoSizePercent(DEFAULT_LOGO_SIZE_PERCENT)
        setCommittedLogoSizePercent(DEFAULT_LOGO_SIZE_PERCENT)
        // Functional updater: reads the logo's *current* committed state
        // rather than the `logoConfig` closed over before the `await` above,
        // which could otherwise be stale if the logo was removed (or
        // replaced again) while this upload was in flight.
        setLogoConfig((current) => ({
          isActive: true,
          fileName: file.name,
          extension: result.extension,
          mimeType: result.mimeType,
          imageData: result.imageData,
          sizePercent: DEFAULT_LOGO_SIZE_PERCENT,
          backingPlateColor: DEFAULT_BACKING_PLATE_COLOR,
          positionPercent: DEFAULT_LOGO_POSITION,
          errorCorrectionLevelBeforeLogo: current.isActive
            ? current.errorCorrectionLevelBeforeLogo
            : errorCorrectionLevelRef.current,
          ecLevelAutoSet: current.isActive ? current.ecLevelAutoSet : true,
        }))
        // Idempotent: if a logo was already active, the level is already
        // 'Q' and this is a no-op; if not, this is the initial auto-bump.
        setErrorCorrectionLevel('Q')
      } else {
        setLogoMessage(result.message)
      }
    } finally {
      setIsProcessingLogo(false)
    }
  }

  function handleLogoSizeChange(value: number) {
    setRawLogoSizePercent(clampLogoSizePercent(value))
  }

  function handleRemoveLogo() {
    if (logoConfig.ecLevelAutoSet && logoConfig.errorCorrectionLevelBeforeLogo) {
      setErrorCorrectionLevel(logoConfig.errorCorrectionLevelBeforeLogo)
    }
    setLogoConfig(EMPTY_LOGO_CONFIG)
    setLogoMessage(null)
    setRawLogoSizePercent(DEFAULT_LOGO_SIZE_PERCENT)
    setCommittedLogoSizePercent(DEFAULT_LOGO_SIZE_PERCENT)
  }

  function handleLogoImageError() {
    handleRemoveLogo()
    setLogoMessage(
      "This image couldn't be displayed (the file may be corrupted). The logo has been removed.",
    )
  }

  function handleLogoDragStart(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsRepositioningLogo(true)
  }

  function handleLogoDragMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isRepositioningLogo || logoConfig.sizePercent === null) return
    const frame = event.currentTarget.parentElement?.getBoundingClientRect()
    if (!frame) return

    const xPercent = ((event.clientX - frame.left) / frame.width) * 100
    const yPercent = ((event.clientY - frame.top) / frame.height) * 100
    const clamped = clampLogoPosition(xPercent, yPercent, logoConfig.sizePercent)
    setLogoConfig((current) => ({ ...current, positionPercent: clamped }))
  }

  function handleLogoDragEnd() {
    setIsRepositioningLogo(false)
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
  const capacityStatus = computeCapacityStatus(encodedContent, errorCorrectionLevel)

  const visibleTrackingParameterGroups = buildPresentParameterGroups(
    trimmedInput,
    typedContentType,
  )

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

  // Scaffold for story 006: contrast ratio stays null until color design
  // parameters exist (degrades gracefully per spec 004 section 5.4). Story
  // 005's logo coverage is now wired in below.
  const logoCoveragePercent = logoConfig.isActive
    ? computeLogoCoveragePercent(committedLogoSizePercent)
    : null
  const scannabilityRisk = computeScannabilityRisk(null, logoCoveragePercent)
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

    QRCode.toDataURL(encodedContent, { errorCorrectionLevel, margin: 1 })
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
  }, [encodedContent, isEmpty, errorCorrectionLevel])

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

      <div
        className={`upload-row logo-upload-row${isDraggingLogoFile ? ' upload-row--dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDraggingLogoFile(true)
        }}
        onDragLeave={() => setIsDraggingLogoFile(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDraggingLogoFile(false)
          const file = event.dataTransfer.files[0]
          if (file) handleLogoSelected(file)
        }}
      >
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.svg"
          aria-label="Upload a logo to overlay on the QR code"
          disabled={isProcessingLogo}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) handleLogoSelected(file)
            event.target.value = ''
          }}
        />
        <p className="upload-hint">or drag and drop a .png, .jpg, or .svg logo</p>
        {logoMessage && <p className="upload-error">{logoMessage}</p>}
        {logoConfig.isActive && (
          <div className="logo-controls">
            <label className="logo-size-label">
              Logo size: {committedLogoSizePercent}%
              <input
                type="range"
                min={1}
                max={MAX_LOGO_SIZE_PERCENT}
                value={rawLogoSizePercent}
                onChange={(event) => handleLogoSizeChange(Number(event.target.value))}
                aria-label="Logo size percentage"
              />
            </label>
            <button type="button" className="remove-logo-button" onClick={handleRemoveLogo}>
              Remove logo
            </button>
          </div>
        )}
      </div>

      {visibleTrackingParameterGroups.length > 0 && (
        <div className="tracking-params">
          <h2 className="tracking-params-heading">Tracking cleanup</h2>
          {visibleTrackingParameterGroups.map((group) => (
            <fieldset className="tracking-group" key={group.category}>
              <legend>{group.category}</legend>
              {group.params.map((param) => (
                <label className="tracking-toggle" key={param.name}>
                  <input
                    type="checkbox"
                    checked={resolveToggleState(param.name, trackingToggles)}
                    onChange={() => toggleTrackingParam(param.name)}
                  />
                  {param.name}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      )}

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
                <div
                  className="qr-zoom-scalable"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  <img
                    src={qrDataUrl}
                    alt="Generated QR code"
                    width={QR_FRAME_SIZE}
                    height={QR_FRAME_SIZE}
                  />
                  {logoConfig.isActive &&
                    logoConfig.imageData &&
                    logoConfig.mimeType &&
                    logoConfig.sizePercent !== null && (
                      <div
                        className="logo-backing-plate"
                        onPointerDown={handleLogoDragStart}
                        onPointerMove={handleLogoDragMove}
                        onPointerUp={handleLogoDragEnd}
                        onPointerCancel={handleLogoDragEnd}
                        style={{
                          width:
                            (computeLogoCoveragePercent(committedLogoSizePercent) / 100) *
                            QR_FRAME_SIZE,
                          height:
                            (computeLogoCoveragePercent(committedLogoSizePercent) / 100) *
                            QR_FRAME_SIZE,
                          left: `${logoConfig.positionPercent.x}%`,
                          top: `${logoConfig.positionPercent.y}%`,
                          backgroundColor: logoConfig.backingPlateColor ?? DEFAULT_BACKING_PLATE_COLOR,
                        }}
                      >
                        <img
                          className="logo-overlay-image"
                          src={toDataUri(logoConfig.mimeType, logoConfig.imageData)}
                          alt={`Logo: ${logoConfig.fileName}`}
                          style={{
                            width: (committedLogoSizePercent / 100) * QR_FRAME_SIZE,
                            height: (committedLogoSizePercent / 100) * QR_FRAME_SIZE,
                          }}
                          onError={handleLogoImageError}
                        />
                      </div>
                    )}
                </div>
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
                    src={encodedContent}
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
              {!hasUploadedFile && inputWasTruncated ? (
                <span className="capacity-warning">
                  Input was truncated to fit the absolute QR capacity (
                  {capacityStatus.capacityMaxBytes} bytes).
                </span>
              ) : (
                capacityStatus.status === 'warning' && (
                  <span className="capacity-warning">
                    Approaching QR capacity ({capacityStatus.capacityUsedBytes} /{' '}
                    {capacityStatus.capacityMaxBytes} bytes)
                  </span>
                )
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default App
