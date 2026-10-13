import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { MapPin, Navigation, Layers, Compass, Moon, Globe } from 'lucide-react'
import { RealCompetitorPOI, CandidateAlternativeArea } from '@/lib/services/realtimeIntelligenceService'
import { getAppEnv } from '@/lib/env'

export type MapStyleType = 'streets' | 'dark' | 'satellite' | 'osm'

interface InteractiveAreaMapProps {
  center: [number, number] // [lng, lat]
  radiusMeters: number
  locationName?: string
  competitors: RealCompetitorPOI[]
  alternativeCandidates?: CandidateAlternativeArea[]
  selectedCompetitorId?: string | null
  onSelectCoordinates?: (coords: [number, number]) => void
  onSelectAlternative?: (candidate: CandidateAlternativeArea) => void
  onSelectCompetitor?: (competitor: RealCompetitorPOI) => void
  className?: string
}

interface TileConfig {
  name: string
  url: string
  options: L.TileLayerOptions
}

const getTileLayerConfig = (style: MapStyleType, token: string): TileConfig => {
  const hasValidMapboxToken = Boolean(
    token &&
    !token.startsWith('pk.your') &&
    !token.includes('placeholder')
  )

  // Standard OpenStreetMap configuration (universal free fallback)
  const osmConfig: TileConfig = {
    name: 'OpenStreetMap Standard',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    },
  }

  if (!hasValidMapboxToken || style === 'osm') {
    return osmConfig
  }

  const mapboxAttribution = '&copy; <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener noreferrer">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'

  switch (style) {
    case 'dark':
      return {
        name: 'Mapbox Dark',
        url: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}?access_token=${token}`,
        options: {
          attribution: mapboxAttribution,
          maxZoom: 19,
          tileSize: 256,
        },
      }
    case 'satellite':
      return {
        name: 'Mapbox Satellite',
        url: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}?access_token=${token}`,
        options: {
          attribution: mapboxAttribution,
          maxZoom: 19,
          tileSize: 256,
        },
      }
    case 'streets':
    default:
      return {
        name: 'Mapbox Streets',
        url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}?access_token=${token}`,
        options: {
          attribution: mapboxAttribution,
          maxZoom: 19,
          tileSize: 256,
        },
      }
  }
}

export const InteractiveAreaMap: React.FC<InteractiveAreaMapProps> = ({
  center,
  radiusMeters,
  locationName = 'Selected Epicenter',
  competitors,
  alternativeCandidates = [],
  selectedCompetitorId = null,
  onSelectCoordinates,
  onSelectAlternative,
  onSelectCompetitor,
  className = 'h-96 w-full rounded-xl',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const layerGroupRef = useRef<L.LayerGroup | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const competitorMarkersRef = useRef<Map<string, L.Marker>>(new Map())

  const [mapStyle, setMapStyle] = useState<MapStyleType>('streets')
  const { mapboxToken } = getAppEnv()

  const [lng, lat] = center
  const hasValidCoords = lat !== 0 || lng !== 0

  const onSelectCoordinatesRef = useRef(onSelectCoordinates)
  onSelectCoordinatesRef.current = onSelectCoordinates

  // Initialize map instance
  useEffect(() => {
    if (!mapContainerRef.current) return

    if (!mapInstanceRef.current) {
      const initialLat = lat !== 0 || lng !== 0 ? lat : 20.5937
      const initialLng = lat !== 0 || lng !== 0 ? lng : 78.9629
      const initialZoom = radiusMeters > 3000 ? 13 : 14

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: initialZoom,
        zoomControl: false,
      })

      // Attach tile layer
      const config = getTileLayerConfig(mapStyle, mapboxToken)
      const tileLayer = L.tileLayer(config.url, config.options).addTo(map)

      tileLayer.on('tileerror', () => {
        if (mapStyle !== 'osm') {
          console.warn('Map tile failed to load. Falling back to OpenStreetMap.')
          setMapStyle('osm')
        }
      })

      tileLayerRef.current = tileLayer

      // Zoom control top right
      L.control.zoom({ position: 'topright' }).addTo(map)

      const layerGroup = L.layerGroup().addTo(map)
      layerGroupRef.current = layerGroup
      mapInstanceRef.current = map

      // Map click handler to relocate search epicenter
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (onSelectCoordinatesRef.current) {
          onSelectCoordinatesRef.current([e.latlng.lng, e.latlng.lat])
        }
      })

      // Ensure proper sizing after DOM layout
      const timer = setTimeout(() => {
        map.invalidateSize()
      }, 150)

      const resizeObserver = new ResizeObserver(() => {
        map.invalidateSize()
      })
      resizeObserver.observe(mapContainerRef.current)

      return () => {
        clearTimeout(timer)
        resizeObserver.disconnect()
        map.remove()
        mapInstanceRef.current = null
        tileLayerRef.current = null
      }
    }
  }, [])

  // Switch tile layer whenever mapStyle changes
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    const config = getTileLayerConfig(mapStyle, mapboxToken)

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current)
    }

    const newTiles = L.tileLayer(config.url, config.options).addTo(map)
    newTiles.on('tileerror', () => {
      if (mapStyle !== 'osm') {
        console.warn(`Tile load error for ${mapStyle}, falling back to OpenStreetMap`)
        setMapStyle('osm')
      }
    })

    tileLayerRef.current = newTiles
  }, [mapStyle, mapboxToken])

  // Update layers and viewport when coordinates, radius, or competitors change
  useEffect(() => {
    const map = mapInstanceRef.current
    const layerGroup = layerGroupRef.current
    if (!map || !layerGroup) return

    layerGroup.clearLayers()
    competitorMarkersRef.current.clear()

    if (!hasValidCoords) return

    // Fly to updated center if not focusing on a specific competitor
    if (!selectedCompetitorId) {
      const targetZoom = radiusMeters > 4000 ? 12 : radiusMeters > 2000 ? 13 : 14
      map.setView([lat, lng], targetZoom)
    }

    // 1. Search Radius Circle
    const radiusCircle = L.circle([lat, lng], {
      radius: radiusMeters,
      color: '#6366f1',
      fillColor: '#4f46e5',
      fillOpacity: 0.12,
      weight: 2,
      dashArray: '5, 5',
    })
    radiusCircle.bindTooltip(
      `Search Boundary: ${(radiusMeters / 1000).toFixed(1)} km Radius`,
      { permanent: false, direction: 'top', className: 'text-[11px] font-mono' }
    )
    layerGroup.addLayer(radiusCircle)

    // 2. Epicenter Marker
    const epicenterIcon = L.divIcon({
      className: 'epicenter-pin',
      html: `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(99, 102, 241, 0.35); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 20px; height: 20px; border-radius: 50%; background: #4f46e5; border: 3px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.5);"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })

    const epicenterMarker = L.marker([lat, lng], { icon: epicenterIcon })
    epicenterMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 12px; color: #0f172a; min-width: 180px;">
        <div style="font-weight: 700; color: #4338ca; margin-bottom: 2px;">Search Epicenter</div>
        <div style="font-weight: 600; margin-bottom: 4px;">${locationName}</div>
        <div style="font-size: 10px; color: #64748b; font-family: monospace;">[${lng.toFixed(4)}, ${lat.toFixed(4)}]</div>
        <div style="margin-top: 6px; font-size: 10px; color: #475569; background: #e0e7ff; padding: 2px 6px; border-radius: 4px; display: inline-block;">
          Radius: ${(radiusMeters / 1000).toFixed(1)} km
        </div>
      </div>
    `)
    layerGroup.addLayer(epicenterMarker)

    // 3. Competitor POI Markers with Relevance Coloring
    competitors.forEach((biz, index) => {
      const [bLng, bLat] = biz.coordinates
      const isSelected = selectedCompetitorId === biz.id

      // Color scheme based on relevance
      const isDirect = biz.relevance === 'direct'
      const isIndirect = biz.relevance === 'indirect'
      const pinBg = isDirect ? '#d97706' : isIndirect ? '#2563eb' : '#64748b'
      const pinBorder = isSelected ? '#ffffff' : '#f8fafc'
      const pinShadow = isSelected ? '0 0 0 3px #f59e0b, 0 4px 12px rgba(0,0,0,0.6)' : '0 2px 8px rgba(0,0,0,0.4)'

      const compIcon = L.divIcon({
        className: 'competitor-pin',
        html: `
          <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
            <div style="width: 20px; height: 20px; border-radius: 50%; background: ${pinBg}; border: 2px solid ${pinBorder}; box-shadow: ${pinShadow}; display: flex; align-items: center; justify-content: center; color: white; font-size: 9px; font-weight: bold;">
              ${index + 1}
            </div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      })

      const marker = L.marker([bLat, bLng], { icon: compIcon })
      const distText = biz.distanceKm !== undefined ? ` • ${biz.distanceKm} km away` : ''
      const badgeBg = isDirect ? '#fef3c7' : isIndirect ? '#dbeafe' : '#f1f5f9'
      const badgeColor = isDirect ? '#b45309' : isIndirect ? '#1d4ed8' : '#475569'

      const contactHtml = biz.contactPhone
        ? `<div style="margin-top: 4px; font-size: 10px; color: #1e293b;"><strong>Phone:</strong> ${biz.contactPhone}</div>`
        : ''
      const websiteHtml = biz.website
        ? `<div style="margin-top: 2px; font-size: 10px;"><a href="${biz.website}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">Visit Website ↗</a></div>`
        : ''

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 11px; color: #0f172a; max-width: 240px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 3px;">
            <span style="font-weight: 700; font-size: 12px; color: #0f172a;">${biz.name}</span>
          </div>
          <div style="margin-bottom: 4px;">
            <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 1px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; text-transform: uppercase;">
              ${biz.relevanceLabel || biz.relevance}
            </span>
          </div>
          <div style="font-size: 10px; color: #475569; margin-bottom: 4px; line-height: 1.3;">
            ${biz.relevanceReason || ''}
          </div>
          <div style="color: #334155; font-size: 10px; line-height: 1.3; border-top: 1px solid #e2e8f0; padding-top: 4px;">
            ${biz.address}
          </div>
          ${contactHtml}
          ${websiteHtml}
          <div style="margin-top: 6px; font-size: 9px; color: #64748b; background: #f8fafc; padding: 2px 6px; border-radius: 4px; display: flex; align-items: center; justify-content: space-between;">
            <span>${biz.sourceId || biz.provenance.source}</span>
            <span>${distText}</span>
          </div>
        </div>
      `)

      marker.on('click', () => {
        if (onSelectCompetitor) {
          onSelectCompetitor(biz)
        }
      })

      layerGroup.addLayer(marker)
      competitorMarkersRef.current.set(biz.id, marker)
    })

    // If selected competitor provided, focus and open its popup
    if (selectedCompetitorId) {
      const selectedMarker = competitorMarkersRef.current.get(selectedCompetitorId)
      if (selectedMarker) {
        const targetBiz = competitors.find((c) => c.id === selectedCompetitorId)
        if (targetBiz) {
          map.setView([targetBiz.coordinates[1], targetBiz.coordinates[0]], 15)
          selectedMarker.openPopup()
        }
      }
    }

    // 4. Alternative Candidate Area Markers
    alternativeCandidates.forEach((alt) => {
      const [aLng, aLat] = alt.coordinates
      const altIcon = L.divIcon({
        className: 'alternative-pin',
        html: `
          <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
            <div style="width: 20px; height: 20px; border-radius: 6px; background: #8b5cf6; border: 2px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">
              Alt
            </div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      })

      const altMarker = L.marker([aLat, aLng], { icon: altIcon })
      altMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 11px; color: #0f172a; max-width: 220px;">
          <div style="font-weight: 700; font-size: 12px; color: #6d28d9; margin-bottom: 2px;">Candidate Alternative</div>
          <div style="font-weight: 600; font-size: 11px;">${alt.areaName}</div>
          <div style="color: #64748b; font-size: 10px;">${alt.distanceKm} km away • ${alt.directCompetitorsCount !== undefined ? `${alt.directCompetitorsCount} direct / ${alt.indirectCompetitorsCount ?? 0} indirect` : `${alt.competitorCount} competitor(s)`}</div>
          <div style="margin-top: 6px;">
            <button id="btn-select-alt-${alt.id}" style="background: #7c3aed; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; cursor: pointer;">
              Evaluate This Area Instead
            </button>
          </div>
        </div>
      `)

      altMarker.on('popupopen', () => {
        const btn = document.getElementById(`btn-select-alt-${alt.id}`)
        if (btn && onSelectAlternative) {
          btn.onclick = () => onSelectAlternative(alt)
        }
      })

      layerGroup.addLayer(altMarker)
    })
  }, [lat, lng, hasValidCoords, radiusMeters, locationName, competitors, alternativeCandidates, selectedCompetitorId, onSelectAlternative, onSelectCompetitor])

  const handleRecenter = () => {
    if (mapInstanceRef.current && hasValidCoords) {
      mapInstanceRef.current.setView([lat, lng], radiusMeters > 3000 ? 13 : 14)
    }
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
      <div ref={mapContainerRef} className={className} />

      {/* Floating map HUD overlay (Top-Left) */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] text-slate-300 shadow-md">
        <MapPin className="w-3.5 h-3.5 text-indigo-400" />
        <span className="font-medium text-white truncate max-w-[130px] sm:max-w-[220px]">
          {hasValidCoords ? locationName : 'Click on map or search above'}
        </span>
        {hasValidCoords && (
          <span className="text-[10px] text-indigo-400 font-mono border-l border-slate-700 pl-2">
            {(radiusMeters / 1000).toFixed(1)} km zone
          </span>
        )}
      </div>

      {/* Map Style Switcher (Top-Right, next to zoom controls) */}
      <div className="absolute top-3 right-14 z-[1000] flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-0.5 text-[10px] shadow-md">
        <button
          type="button"
          onClick={() => setMapStyle('streets')}
          className={`px-2 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
            mapStyle === 'streets'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Mapbox Streets (Clear roads & POIs)"
        >
          <Compass className="w-3 h-3 text-indigo-300" />
          <span className="hidden sm:inline">Streets</span>
        </button>
        <button
          type="button"
          onClick={() => setMapStyle('dark')}
          className={`px-2 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
            mapStyle === 'dark'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Mapbox Dark (Dashboard theme)"
        >
          <Moon className="w-3 h-3 text-blue-300" />
          <span className="hidden sm:inline">Dark</span>
        </button>
        <button
          type="button"
          onClick={() => setMapStyle('satellite')}
          className={`px-2 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
            mapStyle === 'satellite'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Mapbox Satellite (Aerial Imagery)"
        >
          <Globe className="w-3 h-3 text-emerald-300" />
          <span className="hidden sm:inline">Satellite</span>
        </button>
        <button
          type="button"
          onClick={() => setMapStyle('osm')}
          className={`px-2 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
            mapStyle === 'osm'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="OpenStreetMap Standard (Free community map)"
        >
          <Layers className="w-3 h-3 text-amber-300" />
          <span className="hidden sm:inline">OSM</span>
        </button>
      </div>

      {/* Map Action Buttons (Bottom-Right) */}
      <div className="absolute bottom-3 right-3 z-[1000] flex items-center gap-1.5">
        {hasValidCoords && (
          <button
            type="button"
            onClick={handleRecenter}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 backdrop-blur-md shadow-md text-xs flex items-center gap-1.5 transition-colors"
            title="Recenter Map on Epicenter"
          >
            <Navigation className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-medium hidden sm:inline">Recenter</span>
          </button>
        )}
      </div>

      {/* Map Interactive Hint (Bottom-Left) */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/80 backdrop-blur-sm border border-slate-800/80 rounded-md px-2.5 py-1 text-[10px] text-slate-400 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
        Click anywhere on map to reposition search area
      </div>
    </div>
  )
}
