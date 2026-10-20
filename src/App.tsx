import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import {
  classify,
  computeEncodedContent,
  trimInput,
  type ContentType,
} from './lib/qrContent'
import './App.css'

const DEBOUNCE_MS = 150

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

function isClickableLink(contentType: ContentType, content: string): boolean {
  return contentType === 'Link' && /^https?:\/\//i.test(content)
}

function App() {
  const [rawInput, setRawInput] = useState('')
  const debouncedInput = useDebouncedValue(rawInput, DEBOUNCE_MS)
  const [schemeAutoAddEnabled, setSchemeAutoAddEnabled] = useState(true)

  const trimmedInput = trimInput(debouncedInput)
  const contentType = classify(trimmedInput)
  const encodedContent = computeEncodedContent(
    trimmedInput,
    contentType,
    schemeAutoAddEnabled,
  )
  const isEmpty = trimmedInput === ''

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
          onChange={(event) => setRawInput(event.target.value)}
          placeholder="https://example.com or any text"
          aria-label="Content to encode"
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
