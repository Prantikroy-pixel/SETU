import React from 'react';
import { Circle, Popup } from 'react-leaflet';
import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * Classifies risk score into 3 tiers: safe, warning, critical
 * Returns { key, percentage, label, shortLabel, badgeBg, circleColor }
 */
export function getRiskDivision(score) {
  if (score === undefined || score === null) score = 0.2;
  const pct = Math.round(score * 100);

  if (pct >= 70) {
    return {
      key: 'critical',
      percentage: pct,
      label: 'Critical Risk',
      shortLabel: 'CRITICAL',
      badgeBg: 'bg-red-100 text-red-700 font-black',
      circleColor: '#DC2626',
    };
  } else if (pct >= 45) {
    return {
      key: 'warning',
      percentage: pct,
      label: 'High Risk',
      shortLabel: 'WARNING',
      badgeBg: 'bg-amber-100 text-amber-700 font-black',
      circleColor: '#F59E0B',
    };
  } else {
    return {
      key: 'safe',
      percentage: pct,
      label: 'Low Risk',
      shortLabel: 'SAFE',
      badgeBg: 'bg-emerald-100 text-emerald-700 font-black',
      circleColor: '#10B981',
    };
  }
}

/**
 * IncidentImpactZoneLayer: Renders condition-based incident zones on map
 */
export function IncidentImpactZoneLayer({ conditions = [] }) {
  return (
    <>
      {conditions.map((condition, idx) => {
        const div = getRiskDivision(condition.risk_score);
        const radius = condition.radius_km ? condition.radius_km * 1000 : 2000;

        return (
          <Circle
            key={`incident-zone-${idx}`}
            center={[condition.latitude, condition.longitude]}
            radius={radius}
            pathOptions={{
              color: div.circleColor,
              fillColor: div.circleColor,
              fillOpacity: 0.15,
              weight: 2,
              dashArray: '5,5',
            }}
          >
            <Popup>
              <div className="text-xs p-2 space-y-1">
                <div className="font-bold text-slate-900">{condition.condition_type}</div>
                <div className="text-slate-600">
                  {condition.latitude?.toFixed(4)}°N, {condition.longitude?.toFixed(4)}°E
                </div>
                <div className={`text-[10px] font-black uppercase ${div.badgeBg} px-2 py-0.5 rounded inline-block`}>
                  {div.shortLabel}
                </div>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </>
  );
}

/**
 * IncidentSeverityLegend: Visual legend for risk severity classification
 */
export function IncidentSeverityLegend({ totalIncidents = 0, className = '' }) {
  const severities = [
    { key: 'critical', label: 'Critical', color: '#DC2626', count: 0 },
    { key: 'warning', label: 'Warning', color: '#F59E0B', count: 0 },
    { key: 'safe', label: 'Safe', color: '#10B981', count: 0 },
  ];

  return (
    <div className={`bg-white rounded-lg border border-slate-200 p-3 space-y-2 ${className}`}>
      <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
        Risk Legend
      </div>
      {severities.map((sev) => (
        <div key={sev.key} className="flex items-center gap-2 text-xs">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: sev.color, opacity: 0.7 }}
          />
          <span className="text-slate-600">{sev.label}</span>
        </div>
      ))}
      <div className="text-[10px] text-slate-500 font-semibold border-t border-slate-100 pt-2 mt-2">
        Total Incidents: {totalIncidents}
      </div>
    </div>
  );
}
