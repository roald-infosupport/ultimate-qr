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
import './App.css'

const DEBOUNCE_MS = 150
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

  useEffect(() => {
    const timer = setTimeout(() => setCommittedInput(rawInput), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [rawInput])

  function handleRawInputChange(value: string) {
    setRawInput(value)
    setFollowLinkState({ outcome: 'notAttempted' })
  }

  function applyResolvedInput(destination: string) {
    setRawInput(destination)
    setCommittedInput(destination)
  }

  function toggleTrackingParam(name: string) {
    setTrackingToggles((current) => ({
      ...current,
      [name]: current[name] === false,
    }))
  }

  const trimmedInput = trimInput(committedInput)
  const contentType = classify(trimmedInput)
  const encodedContent = computeEncodedContent(
    trimmedInput,
    contentType,
    schemeAutoAddEnabled,
    trackingToggles,
  )
  const isEmpty = trimmedInput === ''

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

  useEffect(() => {
    if (isEmpty) {
      setQrDataUrl(null)
      setQrError(false)
      return
    }

    let cancelled = false
    QRCode.toDataURL(encodedContent, { errorCorrectionLevel: 'M', margin: 1 })
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url)
          setQrError(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl(null)
          setQrError(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [encodedContent, isEmpty])

  return (
    <section id="center">
      <h1>QR Maker</h1>
      <p>Paste a link or type some text to get an instant QR code.</p>

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
          <div className="error-state">Couldn't generate a QR code for this content.</div>
        ) : (
          <>
            {qrDataUrl && <img src={qrDataUrl} alt="Generated QR code" width={220} height={220} />}
            <div className="meta">
              <span className="content-type">{contentType}</span>
              {isClickableLink(contentType, encodedContent) ? (
                <a href={encodedContent} target="_blank" rel="noopener noreferrer">
                  {encodedContent}
                </a>
              ) : (
                <span className="content-text">{encodedContent}</span>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default App
