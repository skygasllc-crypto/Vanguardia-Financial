'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/** Addresses still carrying the seed placeholder. Rendering a QR for one of
 * these would produce a scannable code that sends funds nowhere. */
const PLACEHOLDER_MARKER = 'REPLACE_WITH'

interface DepositQrCodeProps {
  address: string
  currency: string
  /** Bank-transfer "addresses" are a block of text, not a scannable target. */
  scannable?: boolean
  size?: number
}

/** QR for a crypto deposit address, generated in the browser.
 *
 * Deliberately not an image service (api.qrserver.com and similar): those
 * receive every address they render, which is exactly the data you least want
 * leaving the app. `qrcode` draws it locally, so nothing is transmitted.
 *
 * The raw address is encoded rather than a `bitcoin:`-style URI — every wallet
 * app scans a bare address, while URI schemes vary by chain and a mismatched
 * one risks sending funds over the wrong network. */
export function DepositQrCode({ address, currency, scannable = true, size = 176 }: DepositQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const isPlaceholder = address.includes(PLACEHOLDER_MARKER)
  const shouldRender = scannable && !isPlaceholder && address.trim().length > 0

  useEffect(() => {
    if (!shouldRender) {
      setDataUrl(null)
      return
    }
    let cancelled = false
    QRCode.toDataURL(address, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f2744', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url)
          setFailed(false)
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [address, size, shouldRender])

  if (!scannable) return null

  if (isPlaceholder) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-center"
      >
        <p className="text-xs font-semibold text-amber-800">No deposit address set</p>
        <p className="text-[11px] leading-snug text-amber-700">
          This {currency} wallet still holds a placeholder. Do not send funds.
        </p>
      </div>
    )
  }

  if (failed) return null

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a generated
          // data URI, so there is nothing for the image optimiser to fetch.
          <img src={dataUrl} alt={`${currency} deposit address QR code`} width={size} height={size} />
        ) : (
          <div style={{ width: size, height: size }} className="animate-pulse rounded bg-slate-100" />
        )}
      </div>
      <p className="text-[11px] text-slate-500">Scan with your {currency} wallet</p>
    </div>
  )
}
