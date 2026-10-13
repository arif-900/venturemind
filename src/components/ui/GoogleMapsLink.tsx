import React from 'react'
import { MapPin, ExternalLink } from 'lucide-react'
import {
  buildGoogleMapsUrl,
  isValidCoordinatePair,
} from '@/lib/services/realtimeIntelligenceService'

interface GoogleMapsLinkProps {
  /** [lng, lat] tuple — used first when valid */
  coordinates?: [number, number] | null
  /** Plain address string — fallback when coordinates are absent or invalid */
  address?: string | null
  /** Name of the place — used in aria-label for accessibility */
  label?: string
  /** Display mode:
   *  - 'icon-text'  (default) — map pin icon + "View on Google Maps" text
   *  - 'address'    — renders the address text itself as the clickable link
   *  - 'icon-only'  — just the pin icon, no text (good for compact cards)
   */
  mode?: 'icon-text' | 'address' | 'icon-only'
  className?: string
  /** If true and no valid link can be built, renders a muted disabled span
   *  instead of null so the layout slot is always filled */
  showDisabled?: boolean
}

/**
 * Universal Google Maps navigation link for every business listing in VentureMind.
 *
 * Priority order:
 *  1. Valid [lng, lat] coordinates → precise pin-drop URL
 *  2. Non-empty address string     → address search URL
 *  3. Neither available            → renders `null` (or disabled span when showDisabled=true)
 *
 * Never generates a misleading link — if neither source is reliable the action is suppressed.
 */
export const GoogleMapsLink: React.FC<GoogleMapsLinkProps> = ({
  coordinates,
  address,
  label,
  mode = 'icon-text',
  className = '',
  showDisabled = false,
}) => {
  // Validate coordinates first
  const hasValidCoords =
    coordinates != null &&
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    isValidCoordinatePair(coordinates[0], coordinates[1])

  const mapsUrl = buildGoogleMapsUrl({
    coordinates: hasValidCoords ? coordinates : null,
    address,
  })

  const ariaLabel = label
    ? `View ${label} on Google Maps`
    : 'View on Google Maps'

  if (!mapsUrl) {
    if (!showDisabled) return null
    return (
      <span className={`text-[10px] text-slate-600 italic ${className}`}>
        No verifiable location for Maps link
      </span>
    )
  }

  const stopProp = (e: React.MouseEvent) => e.stopPropagation()

  if (mode === 'address') {
    return (
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={stopProp}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={`hover:text-blue-400 hover:underline transition-colors cursor-pointer ${className}`}
      >
        {address || 'View on Google Maps'}
      </a>
    )
  }

  if (mode === 'icon-only') {
    return (
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={stopProp}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={`inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors ${className}`}
      >
        <MapPin className="w-3.5 h-3.5" />
      </a>
    )
  }

  // Default: icon-text
  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={stopProp}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`inline-flex items-center gap-1.5 text-[10px] text-blue-400 hover:text-blue-300 hover:underline transition-colors w-fit ${className}`}
    >
      <MapPin className="w-3 h-3" />
      View on Google Maps
      <ExternalLink className="w-2.5 h-2.5" />
    </a>
  )
}
