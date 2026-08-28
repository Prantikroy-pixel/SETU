import React, { useMemo } from 'react';
import { Circle, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import {
  AlertTriangle,
  Flame,
  CloudRain,
  Waves,
  ShieldAlert,
  Clock,
  MapPin,
  Compass,
  CheckCircle2,
  Radio,
  Eye,
} from 'lucide-react';

/**
 * Severity Division Helper:
 * Evaluates risk score, status, and condition type into 4 high-contrast impact tiers.
 */
export function getIncidentSeverity(condition) {
  const score = typeof condition.risk_score === 'number' 
    ? (condition.risk_score > 1 ? condition.risk_score / 100 : condition.risk_score) 
    : 0;
  const val = String(condition.value || '').toLowerCase();
  const type = String(condition.condition_type || '').toLowerCase();

  // Tier 1: CRITICAL (Red) - Total Road Block, Landslide, Severe Inundation
  if (
    score >= 0.70 ||
    val.includes('blocked') ||
    val.includes('landslide') ||
    val.includes('closed') ||
    val.includes('impassable') ||
    val.includes('critical') ||
    type.includes('landslide')
  ) {
    return {
      tier: 'critical',
      label: 'Critical Road Disruption / Impassable',
      shortLabel: 'Blocked / Landslide',
      color: '#DC2626',       // Deep Crimson Red
      borderColor: '#991B1B',
      fillColor: '#EF4444',
      glowColor: 'rgba(239, 68, 68, 0.45)',
      badgeBg: 'bg-red-600 text-white',
      badgeBorder: 'border-red-700',
      pillBg: 'bg-red-50 text-red-700 border-red-200',
      radiusMeters: 1400,
      fillOpacity: 0.38,
      weight: 2.5,
      pulse: true,
      iconGlyph: '⛔',
      hazardIcon: 'landslide',
      score: Math.max(score, 0.88),
      percentage: Math.round(Math.max(score, 0.88) * 100),
    };
  }

  // Tier 2: HIGH (Orange / Amber) - Flood Inundation, Heavy Mudflow, Severe Weather
  if (
    score >= 0.45 ||
    val.includes('flooded') ||
    val.includes('inundated') ||
    val.includes('high') ||
    val.includes('warning') ||
    type.includes('flood')
  ) {
    return {
      tier: 'high',
      label: 'High Hazard / Severe Inundation',
      shortLabel: 'Flooded / High Hazard',
      color: '#EA580C',       // Vivid Amber Orange
      borderColor: '#C2410C',
      fillColor: '#F97316',
      glowColor: 'rgba(249, 115, 22, 0.4)',
      badgeBg: 'bg-orange-600 text-white',
      badgeBorder: 'border-orange-700',
      pillBg: 'bg-orange-50 text-orange-700 border-orange-200',
      radiusMeters: 1000,
      fillOpacity: 0.32,
      weight: 2,
      pulse: true,
      iconGlyph: '🌊',
      hazardIcon: 'flood',
      score: Math.max(score, 0.58),
      percentage: Math.round(Math.max(score, 0.58) * 100),
    };
  }

  // Tier 3: MODERATE (Yellow / Gold) - Speed Restricted, Debris, Caution
  if (
    score >= 0.25 ||
    val.includes('caution') ||
    val.includes('moderate') ||
    val.includes('slow') ||
    val.includes('debris') ||
    val.includes('warning')
  ) {
    return {
      tier: 'moderate',
      label: 'Moderate Risk / Speed Restricted',
      shortLabel: 'Caution / Active Watch',
      color: '#D97706',       // Golden Amber
      borderColor: '#B45309',
      fillColor: '#F59E0B',
      glowColor: 'rgba(245, 158, 11, 0.35)',
      badgeBg: 'bg-amber-500 text-white',
      badgeBorder: 'border-amber-600',
      pillBg: 'bg-amber-50 text-amber-800 border-amber-200',
      radiusMeters: 750,
      fillOpacity: 0.28,
      weight: 2,
      pulse: false,
      iconGlyph: '⚠️',
      hazardIcon: 'caution',
      score: Math.max(score, 0.35),
      percentage: Math.round(Math.max(score, 0.35) * 100),
    };
  }

  // Tier 4: CLEAR / SAFE (Green) - Open Corridors, Restored Passages
  return {
    tier: 'clear',
    label: 'Clear Transit / Low Risk Corridor',
    shortLabel: 'All Clear / Open',
    color: '#059669',         // Emerald Green
    borderColor: '#047857',
    fillColor: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.25)',
    badgeBg: 'bg-emerald-600 text-white',
    badgeBorder: 'border-emerald-700',
    pillBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    radiusMeters: 500,
    fillOpacity: 0.22,
    weight: 1.5,
    pulse: false,
    iconGlyph: '✅',
    hazardIcon: 'clear',
    score: score || 0.12,
    percentage: Math.round((score || 0.12) * 100),
  };
}

/**
 * Helper to format relative time dynamically
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return 'Real-time telemetry (Live)';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Reported just now';
    if (diffMins < 60) return `Reported ${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `Reported ${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return 'Live telemetry active';
  }
}

/**
 * Creates custom pulsing Leaflet divIcon for incident centers
 */
function createIncidentMarkerIcon(severity) {
  const pulseHtml = severity.pulse
    ? `<div style="
        position: absolute;
        top: -8px; left: -8px;
        width: 44px; height: 44px;
        border-radius: 50%;
        background-color: ${severity.glowColor};
        animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
        pointer-events: none;
      "></div>`
    : '';

  return L.divIcon({
    className: 'custom-incident-marker',
    html: `
      <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
        ${pulseHtml}
        <div style="
          width: 28px; height: 28px;
          border-radius: 50%;
          background-color: ${severity.color};
          border: 2px solid #ffffff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          color: #ffffff;
          z-index: 10;
        ">
          ${severity.iconGlyph}
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

/**
 * Resilient Coordinate Extraction Helper
 * Extracts latitude and longitude from flat objects, nested GeoJSON Point objects, or coordinate arrays.
 */
export function parseCoords(obj) {
  if (!obj) return { lat: null, lon: null };
  const rawLat =
    obj.latitude ??
    obj.lat ??
    obj.location?.latitude ??
    (Array.isArray(obj.location?.coordinates) ? obj.location.coordinates[1] : null) ??
    (Array.isArray(obj.coordinates) ? obj.coordinates[1] : null);

  const rawLon =
    obj.longitude ??
    obj.lon ??
    obj.location?.longitude ??
    (Array.isArray(obj.location?.coordinates) ? obj.location.coordinates[0] : null) ??
    (Array.isArray(obj.coordinates) ? obj.coordinates[0] : null);

  const lat = parseFloat(rawLat);
  const lon = parseFloat(rawLon);

  return {
    lat: isNaN(lat) ? null : lat,
    lon: isNaN(lon) ? null : lon,
  };
}

/**
 * Main Incident Impact Zone Map Layer:
 * Plots real-time color-coded impact zones & affected radii for every active incident.
 */
export function IncidentImpactZoneLayer({
  conditions = [],
  selectedIncidentId = null,
  onIncidentSelect = null,
  showRadiusBuffers = true,
  previewLocation = null, // { lat, lon, risk_score, value, condition_type, radiusMeters } for live report previews
}) {
  return (
    <>
      {/* 1. Render Live Incident Affected Zones */}
      {conditions.map((condition) => {
        const { lat, lon } = parseCoords(condition);

        if (!lat || !lon) return null;

        const severity = getIncidentSeverity(condition);
        const isSelected = selectedIncidentId === condition.id;
        const icon = createIncidentMarkerIcon(severity);

        return (
          <React.Fragment key={`incident-zone-${condition.id || `${lat}-${lon}`}`}>
            {/* Shaded Impact Area Buffer Circle */}
            {showRadiusBuffers && (
              <>
                {/* Outer halo boundary */}
                <Circle
                  center={[lat, lon]}
                  radius={severity.radiusMeters}
                  pathOptions={{
                    color: severity.borderColor,
                    weight: isSelected ? 3.5 : severity.weight,
                    fillColor: severity.fillColor,
                    fillOpacity: isSelected ? 0.48 : severity.fillOpacity,
                    dashArray: severity.tier === 'critical' ? undefined : '6, 6',
                  }}
                  eventHandlers={{
                    click: () => {
                      if (onIncidentSelect) onIncidentSelect(condition);
                    },
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                    <span className="font-extrabold text-xs">
                      {severity.iconGlyph} {condition.condition_type ? condition.condition_type.replace('_', ' ').toUpperCase() : 'INCIDENT'}: {condition.value} ({severity.percentage}% Risk)
                    </span>
                  </Tooltip>
                </Circle>

                {/* Inner Core Danger Zone (for Critical & High incidents) */}
                {(severity.tier === 'critical' || severity.tier === 'high') && (
                  <Circle
                    center={[lat, lon]}
                    radius={Math.round(severity.radiusMeters * 0.45)}
                    pathOptions={{
                      color: severity.color,
                      weight: 1.5,
                      fillColor: severity.color,
                      fillOpacity: 0.55,
                    }}
                  />
                )}
              </>
            )}

            {/* Central Interactive Pin Marker with Rich Real-time Popup */}
            <Marker
              position={[lat, lon]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  if (onIncidentSelect) onIncidentSelect(condition);
                },
              }}
            >
              <Popup className="incident-impact-popup" minWidth={260} maxWidth={320}>
                <div className="p-1 space-y-2.5 text-xs text-slate-800 font-sans select-none">
                  {/* Header Badge & Title */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Real-time Incident
                        </span>
                      </div>
                      <h3 className="font-black text-sm text-slate-900 leading-tight capitalize">
                        {(condition.condition_type || 'Road Condition').replace('_', ' ')}
                      </h3>
                      <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                        Status: <span className="font-extrabold capitalize text-slate-900">{condition.value || 'Reported'}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow-xs shrink-0 ${severity.badgeBg}`}>
                      {severity.percentage}% RISK
                    </span>
                  </div>

                  {/* Impact Zone Summary Card */}
                  <div className={`p-2 rounded-lg border text-[11px] font-medium leading-relaxed ${severity.pillBg}`}>
                    <div className="font-bold flex items-center gap-1 mb-1">
                      <span>{severity.iconGlyph}</span>
                      <span>{severity.label}</span>
                    </div>
                    <div className="text-[10px] opacity-90">
                      Impact Radius: <strong>{(severity.radiusMeters / 1000).toFixed(1)} km</strong> buffer around road corridor.
                    </div>
                  </div>

                  {/* Location & Metadata Details */}
                  <div className="space-y-1 text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Coordinates:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {lat.toFixed(4)}° N, {lon.toFixed(4)}° E
                      </span>
                    </div>
                    {condition.district_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">District:</span>
                        <span className="font-bold text-slate-800">{condition.district_name}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Verified Source:</span>
                      <span className="font-bold text-slate-800 capitalize">{condition.source || 'Field Officer Report'}</span>
                    </div>
                  </div>

                  {/* Timestamp & Real-time status */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100 font-semibold">
                    <span className="flex items-center gap-1 text-slate-600">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatRelativeTime(condition.reported_at)}</span>
                    </span>
                    <span className="font-bold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">
                      Live Telemetry
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        );
      })}

      {/* 2. Live Target Incident Preview (When Officer/Citizen is picking coordinates) */}
      {previewLocation && (() => {
        const { lat, lon } = parseCoords(previewLocation);
        if (!lat || !lon) return null;
        const previewSeverity = getIncidentSeverity(previewLocation);
        const radius = previewLocation.radiusMeters || previewSeverity.radiusMeters;
        return (
          <Circle
            center={[lat, lon]}
            radius={radius}
            pathOptions={{
              color: previewSeverity.color,
              weight: 2.5,
              fillColor: previewSeverity.fillColor,
              fillOpacity: 0.45,
              dashArray: '4, 4',
            }}
          >
            <Tooltip permanent direction="top" offset={[0, -10]}>
              <div className="text-[10px] font-black text-slate-900 bg-white/95 px-1 rounded shadow-xs">
                Target Impact Zone: {(radius / 1000).toFixed(1)} km ({previewSeverity.shortLabel})
              </div>
            </Tooltip>
          </Circle>
        );
      })()}
    </>
  );
}

/**
 * Floating Severity Legend Control for Maps
 */
export function IncidentSeverityLegend({ className = '', totalIncidents = 0 }) {
  return (
    <div
      className={`bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200/90 shadow-xl text-xs z-[1000] pointer-events-auto select-none ${className}`}
      style={{ minWidth: '240px' }}
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
        <span className="font-black text-[11px] uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-red-600 animate-pulse" />
          <span>Incident Impact Zones</span>
        </span>
        {totalIncidents > 0 && (
          <span className="text-[10px] font-extrabold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full">
            {totalIncidents} Active
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {/* Critical */}
        <div className="flex items-center justify-between p-1.5 rounded-lg bg-red-50/80 border border-red-200/80">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-600 shadow-xs animate-pulse"></div>
            <div>
              <div className="text-[11px] font-black text-red-900 leading-tight">Critical / Blocked</div>
              <div className="text-[9px] text-red-700 font-semibold">Landslide / Road closed (&gt;1.4 km)</div>
            </div>
          </div>
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-600 text-white">≥70%</span>
        </div>

        {/* High */}
        <div className="flex items-center justify-between p-1.5 rounded-lg bg-orange-50/80 border border-orange-200/80">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500 shadow-xs"></div>
            <div>
              <div className="text-[11px] font-black text-orange-900 leading-tight">High Inundation</div>
              <div className="text-[9px] text-orange-700 font-semibold">Flooded / High risk (1.0 km)</div>
            </div>
          </div>
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-orange-500 text-white">45–69%</span>
        </div>

        {/* Moderate */}
        <div className="flex items-center justify-between p-1.5 rounded-lg bg-amber-50/80 border border-amber-200/80">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500 shadow-xs"></div>
            <div>
              <div className="text-[11px] font-black text-amber-900 leading-tight">Caution / Watch</div>
              <div className="text-[9px] text-amber-700 font-semibold">Speed restricted / Debris (750m)</div>
            </div>
          </div>
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-white">25–44%</span>
        </div>
      </div>
    </div>
  );
}

export default IncidentImpactZoneLayer;
