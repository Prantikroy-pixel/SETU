import React, { useState, useEffect } from 'react';
import { Activity, Radio, CloudRain, Wind, Compass, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function RealtimeTelemetryBanner({
  conditions = [],
  districtName = 'Barak Valley / NER',
  onRefresh = null,
  isRefreshing = false,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [liveWeather, setLiveWeather] = useState({
    rainfallMm: 38.4,
    windKmh: 16.2,
    humidity: 91,
    status: 'Monsoon Runoff Watch',
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const criticalCount = (conditions || []).filter((c) => {
    const s = c.risk_score || 0;
    const v = String(c.value || '').toLowerCase();
    return s >= 0.7 || ['blocked', 'landslide', 'closed', 'critical'].some((k) => v.includes(k));
  }).length;

  const highCount = (conditions || []).filter((c) => {
    const s = c.risk_score || 0;
    const v = String(c.value || '').toLowerCase();
    return (s >= 0.45 && s < 0.7) || ['flooded', 'inundated', 'high', 'warning'].some((k) => v.includes(k));
  }).length;

  return (
    <div className="bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs mb-3 transition-all duration-300">
      {/* Left: Pulse Indicator & Live Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-black tracking-wider uppercase text-emerald-700 font-mono">LIVE FEED</span>
        </div>

        <div>
          <div className="flex items-center gap-1.5 font-black text-xs text-slate-800 tracking-tight">
            <span>REAL-TIME TELEMETRY STREAM</span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            <span className="font-mono text-slate-600 font-bold">
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} IST
            </span>
            <span className="mx-1.5 text-slate-300">|</span>
            <span>Sector: <strong className="text-slate-700">{districtName}</strong></span>
          </div>
        </div>
      </div>

      {/* Middle: Active Impact Badges */}
      <div className="flex items-center gap-2">
        {criticalCount > 0 ? (
          <div className="px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-red-700 flex items-center gap-1.5 font-extrabold text-[11px] shadow-2xs animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-600"></span>
            <span>{criticalCount} Critical Blockages</span>
          </div>
        ) : (
          <div className="px-2.5 py-1 rounded-lg border border-slate-200/80 bg-slate-50 text-slate-600 flex items-center gap-1.5 font-bold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>0 Critical Hazards</span>
          </div>
        )}

        {highCount > 0 ? (
          <div className="px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 flex items-center gap-1.5 font-extrabold text-[11px] shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>{highCount} Flooded Sectors</span>
          </div>
        ) : (
          <div className="px-2.5 py-1 rounded-lg border border-slate-200/80 bg-slate-50 text-slate-600 flex items-center gap-1.5 font-bold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <span>0 Flooded Sectors</span>
          </div>
        )}
      </div>

      {/* Right: Live Environment Telemetry & Refresh */}
      <div className="flex items-center gap-2.5">
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg text-slate-700 text-[11px] font-semibold">
            <CloudRain className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-mono">{liveWeather.rainfallMm} mm/24h</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg text-slate-700 text-[11px] font-semibold">
            <Wind className="w-3.5 h-3.5 text-teal-600" />
            <span className="font-mono">{liveWeather.windKmh} km/h</span>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 hover:text-slate-900 transition-all cursor-pointer disabled:opacity-50 shadow-2xs active:scale-95"
            title="Poll Latest Ground Reports"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
}
