import React from 'react';
import { Polyline, Popup, Marker } from 'react-leaflet';
import L from 'leaflet';
import { Navigation } from 'lucide-react';

/**
 * 3-Tier Risk Division Definitions:
 * 1. Red (Nearly Red / Crimson #DC2626): Risk >= 0.70 (Near Blockage / Imminent / Critical)
 * 2. Yellow (Amber / Gold #F59E0B): 0.35 <= Risk < 0.70 (Very High Disruption Probability / Caution)
 * 3. Green (Emerald #10B981): Risk < 0.35 (Little to No Risk / Safe Transit)
 */
export const RISK_TIERS = {
  CRITICAL: {
    key: 'critical',
    label: 'Nearly Blocked / Critical Risk',
    shortLabel: 'Near-Blockage',
    color: '#DC2626',
    glowColor: 'rgba(220, 38, 38, 0.4)',
    badgeBg: 'bg-red-100 text-red-800 border-red-300',
    dotBg: 'bg-red-600',
    strokeWidth: 6,
    opacity: 0.95,
    dashArray: undefined,
    description: 'Imminent blockage / high disruption likelihood (< 3 hrs). Transit halted or severely obstructed.',
  },
  WARNING: {
    key: 'warning',
    label: 'High Probability Warning',
    shortLabel: 'High Risk',
    color: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    dotBg: 'bg-amber-500',
    strokeWidth: 5,
    opacity: 0.9,
    dashArray: '8, 6',
    description: 'Elevated hazard probability. Heavy rainfall or steep slope alert. High risk of delay.',
  },
  SAFE: {
    key: 'safe',
    label: 'Safe / Clear Corridor',
    shortLabel: 'Safe Route',
    color: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.3)',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dotBg: 'bg-emerald-600',
    strokeWidth: 4,
    opacity: 0.85,
    dashArray: undefined,
    description: 'Optimal road conditions. Little to no risk detected. Clear transit recommended.',
  },
};

/**
 * Classify any risk value (0.0 to 1.0 or 0 to 100) or status into the 3 Divisions
 */
export function getRiskDivision(score, conditionType = '', status = '') {
  const normScore = typeof score === 'number' ? (score > 1 ? score / 100 : score) : 0;
  const statusLower = String(status || '').toLowerCase();
  const typeLower = String(conditionType || '').toLowerCase();

  const isBlocked = ['blocked', 'flooded', 'landslide', 'closed', 'impassable', 'critical', 'severe_bottleneck'].some(
    (kw) => statusLower.includes(kw) || typeLower.includes(kw)
  );

  if (isBlocked || normScore >= 0.70) {
    return {
      ...RISK_TIERS.CRITICAL,
      score: Math.max(normScore, isBlocked ? 0.88 : normScore),
      percentage: Math.round(Math.max(normScore, isBlocked ? 0.88 : normScore) * 100),
    };
  }

  if (statusLower.includes('moderate_stress') || statusLower.includes('warning') || normScore >= 0.35) {
    return {
      ...RISK_TIERS.WARNING,
      score: normScore,
      percentage: Math.round(normScore * 100),
    };
  }

  return {
    ...RISK_TIERS.SAFE,
    score: normScore,
    percentage: Math.round(normScore * 100),
  };
}

/**
 * Key Arterial Highway Lifeline Corridors Across Northeast India (NER)
 */
export const NER_HIGHWAY_CORRIDORS = [
  {
    id: 'corridor-nh6-shillong-silchar',
    name: 'NH-6 Meghalaya – Barak Lifeline',
    section: 'Shillong – Jowai – Lumshnong – Kalain – Silchar',
    baseRisk: 0.82, // Landslide prone mountain corridor
    hazardDetails: 'Severe slope grade (26°), heavy monsoon runoff, saturated hill cut soil.',
    lengthKm: 215,
    path: [
      [25.5788, 91.8933], // Shillong
      [25.5560, 92.0620], // Mawryngkneng
      [25.5010, 92.1480], // Ummulong
      [25.4450, 92.2080], // Jowai
      [25.4120, 92.2750], // Phramer
      [25.3350, 92.3380], // Lad Rymbai
      [25.3110, 92.3680], // Khliehriat
      [25.1812, 92.3800], // Lumshnong
      [25.1140, 92.3620], // Sonapur Tunnel
      [24.9980, 92.4410], // Malidor
      [24.9520, 92.5780], // Kalain
      [24.8980, 92.6050], // Badarpur
      [24.8720, 92.6680], // Panchgram
      [24.8333, 92.7789], // Silchar
    ],
  },
  {
    id: 'corridor-nh306-silchar-aizawl',
    name: 'NH-306 Silchar – Mizoram Lifeline',
    section: 'Silchar – Vairengte – Kolasib – Aizawl',
    baseRisk: 0.75, // Critical hillside cut
    hazardDetails: 'High mudflow probability, active road breach reports near Vairengte.',
    lengthKm: 140,
    path: [
      [24.8333, 92.7789], // Silchar
      [24.6200, 92.7400], // Dholai
      [24.5050, 92.7600], // Vairengte Checkpost
      [24.2250, 92.6780], // Kolasib
      [23.9500, 92.7100], // Sairang
      [23.7271, 92.7176], // Aizawl
    ],
  },
  {
    id: 'corridor-nh27-guwahati-nagaon-jorhat',
    name: 'NH-27 Upper Assam Arterial',
    section: 'Guwahati – Nagaon – Kaziranga – Jorhat – Dibrugarh',
    baseRisk: 0.22, // Mostly clear 4-lane plain
    hazardDetails: 'Optimal drainage, low grade, minor flood buffer alert near Kaziranga bypass.',
    lengthKm: 440,
    path: [
      [26.1445, 91.7362], // Guwahati
      [26.2000, 92.1500], // Jagiroad
      [26.3450, 92.6840], // Nagaon
      [26.5800, 93.1700], // Kaziranga
      [26.6500, 93.9700], // Bokakhat
      [26.8000, 94.2600], // Jorhat
      [27.4728, 94.9120], // Dibrugarh
    ],
  },
  {
    id: 'corridor-nh8-silchar-agartala',
    name: 'NH-8 Tripura National Highway',
    section: 'Silchar – Karimganj – Churaibari – Dharmanagar – Agartala',
    baseRisk: 0.48, // Moderate-High rain hazard
    hazardDetails: 'Moderate rain accumulation (45mm/24h), cautionary bottleneck at Churaibari border.',
    lengthKm: 270,
    path: [
      [24.8333, 92.7789], // Silchar
      [24.8650, 92.3580], // Karimganj
      [24.6400, 92.2400], // Churaibari
      [24.3800, 92.1600], // Dharmanagar
      [24.1600, 91.7800], // Teliamura
      [23.8315, 91.2868], // Agartala
    ],
  },
  {
    id: 'corridor-nh29-dimapur-kohima',
    name: 'NH-29 Nagaland Mountain Pass',
    section: 'Dimapur – Chumukedima – Phesama – Kohima',
    baseRisk: 0.78, // High landslide vulnerability
    hazardDetails: 'Active rockfall hazard, steep mountain inclines (30°), rain-triggered fissures.',
    lengthKm: 74,
    path: [
      [25.9090, 93.7266], // Dimapur
      [25.8200, 93.7900], // Chumukedima
      [25.7500, 93.9200], // Medziphema
      [25.6751, 94.1086], // Kohima
    ],
  },
  {
    id: 'corridor-nh37-jiribam-imphal',
    name: 'NH-37 Manipur Mountain Lifeline',
    section: 'Silchar – Jiribam – Noney – Imphal',
    baseRisk: 0.68, // Elevated hazard
    hazardDetails: 'River bridge crossing bottleneck, moderate rockslide risk in Noney hills.',
    lengthKm: 220,
    path: [
      [24.8333, 92.7789], // Silchar
      [24.8000, 93.1200], // Jiribam
      [24.8100, 93.4500], // Nungba
      [24.7800, 93.7000], // Noney
      [24.8170, 93.9368], // Imphal
    ],
  },
  {
    id: 'corridor-nh415-itanagar-gateway',
    name: 'NH-415 Arunachal Pradesh Artery',
    section: 'Banderdewa – Naharlagun – Itanagar',
    baseRisk: 0.28, // Low to moderate
    hazardDetails: 'Stable road surface, clear mountain cut, minor culvert maintenance.',
    lengthKm: 42,
    path: [
      [27.1200, 93.8100], // Banderdewa
      [27.1000, 93.6900], // Nirjuli
      [27.0900, 93.6400], // Naharlagun
      [27.0844, 93.6053], // Itanagar
    ],
  },
  {
    id: 'corridor-nh10-siliguri-gangtok',
    name: 'NH-10 Teesta Landslide Highway',
    section: 'Siliguri – Sevoke – Teesta Bazaar – Rangpo – Gangtok',
    baseRisk: 0.85, // Critical landslide zone
    hazardDetails: 'Teesta river surge risk, high active rockfall zone at 29th Mile.',
    lengthKm: 114,
    path: [
      [26.7271, 88.3953], // Siliguri
      [26.8800, 88.4700], // Sevoke
      [27.0500, 88.4900], // Teesta Bazaar
      [27.1800, 88.5300], // Rangpo
      [27.3389, 88.6065], // Gangtok
    ],
  },
  {
    id: 'corridor-barak-internal-cachar',
    name: 'Barak Valley Arterial Link',
    section: 'Silchar – Udharbond – Kumbhirgram Airport – Badarpur',
    baseRisk: 0.32,
    hazardDetails: 'Minor waterlogging in low-lying tea estate sections, overall clear passage.',
    lengthKm: 55,
    path: [
      [24.8333, 92.7789], // Silchar
      [24.8900, 92.8900], // Udharbond
      [24.9100, 92.9800], // Kumbhirgram
      [24.8700, 92.5800], // Badarpur
    ],
  },
  {
    id: 'corridor-brahmaputra-flood-corridor',
    name: 'Brahmaputra Flood Plain Route',
    section: 'Guwahati – Hajo – Barpeta – Bongaigaon',
    baseRisk: 0.55,
    hazardDetails: 'Elevated river flood basin risk, heavy 24h catchment rainfall alert.',
    lengthKm: 175,
    path: [
      [26.1445, 91.7362], // Guwahati
      [26.2500, 91.5300], // Hajo
      [26.3079, 90.9971], // Barpeta
      [26.4603, 90.6464], // Bongaigaon
    ],
  },
];

/**
 * Floating 3-Tier Risk Path Legend Control
 */
export function RiskLegendControl({ className = '', compact = false }) {
  return (
    <div
      className={`bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200/90 shadow-lg text-xs z-[1000] pointer-events-auto transition-all select-none ${className}`}
      style={{ minWidth: compact ? '200px' : '260px' }}
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
        <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-primary-600" />
          <span>Corridor Risk Divisions</span>
        </span>
        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">3-TIER PATH</span>
      </div>

      <div className="space-y-1.5">
        {/* Tier 1: Red */}
        <div className="flex items-center justify-between p-1.5 rounded-lg bg-red-50/70 border border-red-200/80">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1.5 rounded-full bg-red-600 shadow-sm animate-pulse"></div>
            <div>
              <div className="text-[11px] font-extrabold text-red-900 leading-tight">Nearly Blocked / Critical</div>
              {!compact && <div className="text-[9px] text-red-700 font-medium">Imminent blockage (Risk ≥ 70%)</div>}
            </div>
          </div>
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-red-600 text-white shadow-xs">
            ≥ 70%
          </span>
        </div>

        {/* Tier 2: Yellow */}
        <div className="flex items-center justify-between p-1.5 rounded-lg bg-amber-50/70 border border-amber-200/80">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1.5 rounded-full bg-amber-500 shadow-sm"></div>
            <div>
              <div className="text-[11px] font-extrabold text-amber-900 leading-tight">High Probability Warning</div>
              {!compact && <div className="text-[9px] text-amber-700 font-medium">High disruption risk (35% – 69%)</div>}
            </div>
          </div>
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500 text-white shadow-xs">
            35–69%
          </span>
        </div>

        {/* Tier 3: Green */}
        <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1.5 rounded-full bg-emerald-600 shadow-sm"></div>
            <div>
              <div className="text-[11px] font-extrabold text-emerald-900 leading-tight">Safe / Clear Corridor</div>
              {!compact && <div className="text-[9px] text-emerald-700 font-medium">Optimal transit (Risk &lt; 35%)</div>}
            </div>
          </div>
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-600 text-white shadow-xs">
            &lt; 35%
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders all Highway Corridors across the Map with dynamic 3-tier risk coloring and popups
 */
export function RiskCorridorMapLayer({
  conditions = [],
  highlightCorridorId = null,
  onCorridorSelect = null,
}) {
  // Compute real-time risk for each corridor based on active conditions and base factors
  const corridorsWithLiveRisk = NER_HIGHWAY_CORRIDORS.map((corridor) => {
    let effectiveRisk = corridor.baseRisk;

    // Check if any active condition matches or is near this corridor
    const matchingHazards = (conditions || []).filter((c) => {
      const val = String(c.value || '').toLowerCase();
      const isRoadBlock = c.condition_type === 'road_status' && ['blocked', 'landslide', 'flooded', 'closed'].includes(val);
      if (isRoadBlock && c.district_name) {
        return corridor.section.toLowerCase().includes(c.district_name.toLowerCase());
      }
      return false;
    });

    if (matchingHazards.length > 0) {
      effectiveRisk = Math.max(effectiveRisk, 0.88);
    }

    const division = getRiskDivision(effectiveRisk);

    return {
      ...corridor,
      effectiveRisk,
      division,
      activeHazardsCount: matchingHazards.length,
    };
  });

  return (
    <>
      {corridorsWithLiveRisk.map((corridor) => {
        const isHighlighted = highlightCorridorId === corridor.id;
        const { division } = corridor;

        return (
          <React.Fragment key={corridor.id}>
            {/* Background halo for high visibility and contrast */}
            <Polyline
              positions={corridor.path}
              pathOptions={{
                color: '#ffffff',
                weight: (division.strokeWidth || 5) + 3,
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />

            {/* Main Risk-Colored Path */}
            <Polyline
              positions={corridor.path}
              pathOptions={{
                color: division.color,
                weight: isHighlighted ? (division.strokeWidth || 5) + 2 : division.strokeWidth || 5,
                opacity: division.opacity || 0.9,
                dashArray: division.dashArray,
                lineCap: 'round',
                lineJoin: 'round',
              }}
              eventHandlers={{
                click: () => {
                  if (onCorridorSelect) onCorridorSelect(corridor);
                },
              }}
            >
              <Popup>
                <div className="text-xs p-1 space-y-2" style={{ minWidth: '220px' }}>
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5">
                    <div>
                      <div className="font-extrabold text-slate-900 text-sm">{corridor.name}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{corridor.section}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border shrink-0 ${division.badgeBg}`}
                    >
                      {division.percentage}% RISK
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${division.dotBg} ${
                        division.key === 'critical' ? 'animate-pulse' : ''
                      }`}
                    ></span>
                    <span className="font-extrabold text-slate-800">{division.label}</span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[11px] text-slate-700 leading-relaxed font-medium">
                    {corridor.hazardDetails}
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-100 font-semibold">
                    <span>Corridor Length: {corridor.lengthKm} km</span>
                    <span className="font-bold text-slate-700">
                      {division.key === 'critical'
                        ? '⚠️ Bypass Advised'
                        : division.key === 'warning'
                        ? '⚡ Proceed with Caution'
                        : '✅ Clear Transit'}
                    </span>
                  </div>
                </div>
              </Popup>
            </Polyline>
          </React.Fragment>
        );
      })}
    </>
  );
}

/**
 * Breaks a multi-point route into individual stretch segments [P_i, P_{i+1}]
 * and evaluates localized risk for each stretch so an isolated blockage at point D
 * only blocks C->D without falsely coloring the clear A->B or B->C stretches red.
 */
export function buildDynamicRouteSegments(routeCoordinates, conditions = [], waypointAnalysis = [], defaultRisk = 0.2) {
  if (!routeCoordinates || routeCoordinates.length < 2) return [];

  const segments = [];
  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const p1 = routeCoordinates[i];
    const p2 = routeCoordinates[i + 1];
    const segMidLat = (p1[0] + p2[0]) / 2.0;
    const segMidLon = (p1[1] + p2[1]) / 2.0;

    // Check if any active ground blockage/hazard is on or near this specific stretch
    let segmentRisk = defaultRisk;
    let matchingHazard = null;
    let minHazardDistKm = Infinity;

    if (Array.isArray(conditions) && conditions.length > 0) {
      for (const cond of conditions) {
        const cLat = cond.location?.latitude || cond.latitude;
        const cLon = cond.location?.longitude || cond.longitude;
        if (cLat && cLon) {
          const dLatMid = (cLat - segMidLat) * 111.0;
          const dLonMid = (cLon - segMidLon) * 111.0 * Math.cos((segMidLat * Math.PI) / 180);
          const distMid = Math.sqrt(dLatMid * dLatMid + dLonMid * dLonMid);

          const dLat1 = (cLat - p1[0]) * 111.0;
          const dLon1 = (cLon - p1[1]) * 111.0 * Math.cos((p1[0] * Math.PI) / 180);
          const dist1 = Math.sqrt(dLat1 * dLat1 + dLon1 * dLon1);

          const dLat2 = (cLat - p2[0]) * 111.0;
          const dLon2 = (cLon - p2[1]) * 111.0 * Math.cos((p2[0] * Math.PI) / 180);
          const dist2 = Math.sqrt(dLat2 * dLat2 + dLon2 * dLon2);

          const distMin = Math.min(distMid, dist1, dist2);
          const impactRadiusKm = (cond.radius_meters || 1400) / 1000.0;

          if (distMin <= Math.max(impactRadiusKm, 2.0) && distMin < minHazardDistKm) {
            minHazardDistKm = distMin;
            matchingHazard = cond;
          }
        }
      }
    }

    if (matchingHazard) {
      const val = (matchingHazard.value || matchingHazard.condition_type || '').toLowerCase();
      const isBlocked = val.includes('block') || val.includes('landslide') || val.includes('closed') || val.includes('impassable');
      const isFlood = val.includes('flood') || val.includes('inundat');
      segmentRisk = isBlocked ? 0.92 : isFlood ? 0.76 : (matchingHazard.risk_score || 0.70);
    } else if (Array.isArray(waypointAnalysis) && waypointAnalysis.length > i) {
      const wp = waypointAnalysis[i];
      segmentRisk = wp.risk_score || 0.15;
    } else {
      segmentRisk = 0.15; // Unobstructed stretch defaults to safe
    }

    const division = getRiskDivision(segmentRisk);

    segments.push({
      index: i + 1,
      startCoord: p1,
      endCoord: p2,
      coordinates: [p1, p2],
      riskScore: segmentRisk,
      division,
      hazard: matchingHazard,
      hazardDistanceKm: minHazardDistKm !== Infinity ? minHazardDistKm : null,
      statusLabel: division.key === 'critical' ? 'BLOCKED / CRITICAL OBSTRUCTION' : division.key === 'warning' ? 'CAUTION / ELEVATED RISK' : 'OPEN & SAFE TRANSIT',
    });
  }

  return segments;
}

/**
 * Renders any route broken down into dynamic, color-coded stretch segments.
 * Only the specific blocked segment (e.g. C-D) is painted Red, while clear segments
 * (e.g. A-B, B-C) remain Green and safe for sub-route transit.
 */
export function RiskSegmentedRoute({
  routeCoordinates = [],
  riskScore = 0.2,
  conditions = [],
  waypointAnalysis = [],
  label = 'Transit Corridor Stretch',
  statusText = 'Active Dispatch',
  originName = 'Origin',
  destName = 'Destination',
  interactive = true,
}) {
  if (!routeCoordinates || routeCoordinates.length < 2) return null;

  // Break route into localized sub-segments
  const segments = buildDynamicRouteSegments(routeCoordinates, conditions, waypointAnalysis, riskScore);

  return (
    <>
      {segments.map((seg) => {
        const { division } = seg;

        return (
          <React.Fragment key={`seg-${seg.index}-${seg.startCoord[0]}-${seg.startCoord[1]}`}>
            {/* White Background Halo for High Contrast */}
            <Polyline
              positions={seg.coordinates}
              pathOptions={{
                color: '#ffffff',
                weight: 8,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />

            {/* Stretch Segment Polyline in its specific tier color */}
            <Polyline
              positions={seg.coordinates}
              pathOptions={{
                color: division.color,
                weight: 6,
                opacity: 0.95,
                dashArray: division.dashArray,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            >
              {interactive && (
                <Popup>
                  <div className="text-xs p-1 space-y-2" style={{ minWidth: '230px' }}>
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5">
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">
                          Stretch #{seg.index}: {label}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {seg.index === 1 ? originName : `Checkpoint ${seg.index}`} →{' '}
                          {seg.index === segments.length ? destName : `Checkpoint ${seg.index + 1}`}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border shrink-0 ${division.badgeBg}`}
                      >
                        {division.percentage}% RISK
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${division.dotBg} ${
                          division.key === 'critical' ? 'animate-pulse' : ''
                        }`}
                      ></span>
                      <span className="font-extrabold text-slate-800">{seg.statusLabel}</span>
                    </div>

                    <div
                      className={`p-2 rounded text-[11px] font-medium leading-relaxed border ${
                        division.key === 'critical'
                          ? 'bg-red-50 border-red-200 text-red-800'
                          : division.key === 'warning'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      {seg.hazard
                        ? `🚨 Active Disruption: ${seg.hazard.condition_type?.replace('_', ' ').toUpperCase()} (${seg.hazard.value}) reported within ${seg.hazardDistanceKm < 1 ? Math.round(seg.hazardDistanceKm * 1000) + 'm' : seg.hazardDistanceKm.toFixed(1) + 'km'}. This specific stretch is obstructed.`
                        : division.key === 'safe'
                        ? '✅ This stretch of the roadway is fully CLEAR and unobstructed. Sub-route transit on this section is safe.'
                        : '⚠️ Moderate terrain / slope caution on this stretch.'}
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-100 font-semibold">
                      <span>Status: {statusText}</span>
                      <span className="font-bold text-slate-700">
                        {division.key === 'critical'
                          ? '⚠️ Bypass Stretch'
                          : division.key === 'warning'
                          ? '⚡ Cautionary Transit'
                          : '🟢 Open For Transit'}
                      </span>
                    </div>
                  </div>
                </Popup>
              )}
            </Polyline>
          </React.Fragment>
        );
      })}
    </>
  );
}

export function LiveGpsSimulationMapLayer({ simulationState }) {
  if (!simulationState || !simulationState.vehiclePos) return null;

  const { vehiclePos, currentPath, isRerouted, injectedHazard, scanMetrics } = simulationState;

  const pathCoordinates = currentPath.map((pt) => [pt.lat, pt.lon]);

  // Create pulsing Vehicle Marker Icon
  const createVehicleDivIcon = () => {
    const iconHtml = `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <!-- Pulsing Radar Glow Ring -->
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: ${
          isRerouted ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'
        }; border: 2px solid ${
          isRerouted ? '#10B981' : '#3B82F6'
        }; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <!-- Inner Convoy Badge -->
        <div style="width: 26px; height: 26px; border-radius: 50%; background: ${
          isRerouted ? '#059669' : '#2563EB'
        }; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13"></rect>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
            <circle cx="5.5" cy="18.5" r="2.5"></circle>
            <circle cx="18.5" cy="18.5" r="2.5"></circle>
          </svg>
        </div>
      </div>
    `;
    return L.divIcon({
      html: iconHtml,
      className: 'custom-vehicle-div-icon',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  };

  // Create Hazard Alert Icon
  const createHazardDivIcon = () => {
    const iconHtml = `
      <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: rgba(220, 38, 38, 0.4); border: 2px solid #DC2626; animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 28px; height: 28px; border-radius: 50%; background: #DC2626; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(220,38,38,0.6);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
      </div>
    `;
    return L.divIcon({
      html: iconHtml,
      className: 'custom-hazard-div-icon',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });
  };

  return (
    <>
      {/* Dynamic Active Simulation Route Polyline */}
      <Polyline
        positions={pathCoordinates}
        pathOptions={{
          color: '#ffffff',
          weight: 7,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      <Polyline
        positions={pathCoordinates}
        pathOptions={{
          color: isRerouted ? '#10B981' : scanMetrics?.riskScore >= 0.70 ? '#EF4444' : '#3B82F6',
          weight: 5,
          opacity: 0.95,
          dashArray: isRerouted ? '8, 6' : undefined,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      >
        <Popup>
          <div className="text-xs p-1 space-y-1">
            <div className="font-bold text-slate-900">
              {isRerouted ? 'NH-27 Lumding Safe Bypass Corridor' : 'NH-6 Meghalaya – Barak Lifeline'}
            </div>
            <div className="text-slate-600">
              Status: {isRerouted ? 'Active Automated Bypass' : 'Primary Convoy Path'}
            </div>
          </div>
        </Popup>
      </Polyline>

      {/* Injected Hazard Obstruction Marker */}
      {injectedHazard && (
        <Marker position={[injectedHazard.lat, injectedHazard.lon]} icon={createHazardDivIcon()}>
          <Popup>
            <div className="text-xs p-1 space-y-1.5" style={{ maxWidth: '200px' }}>
              <div className="font-bold text-red-600 flex items-center gap-1">
                <span>⚠️</span> {injectedHazard.title}
              </div>
              <p className="text-slate-700 text-[11px]">
                Active landslide blockage on NH-6 Lumshnong pass. Road impassable.
              </p>
              <div className="bg-red-50 text-red-800 text-[10px] font-bold p-1 rounded border border-red-200">
                AI Reroute Triggered
              </div>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Moving Convoy Vehicle GPS Marker */}
      <Marker position={[vehiclePos.lat, vehiclePos.lon]} icon={createVehicleDivIcon()}>
        <Popup>
          <div className="text-xs p-1 space-y-1">
            <div className="font-extrabold text-blue-700 text-sm">AS-11-BC-4401</div>
            <div className="text-slate-700 font-medium">5-Ton 4x4 Heavy Relief Convoy</div>
            <div className="text-slate-500 text-[10px]">{vehiclePos.name}</div>
            <div className="text-slate-600 text-[11px] pt-1 border-t border-slate-100 font-semibold">
              Location: {vehiclePos.lat.toFixed(4)}°N, {vehiclePos.lon.toFixed(4)}°E
            </div>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

export default RiskCorridorMapLayer;

