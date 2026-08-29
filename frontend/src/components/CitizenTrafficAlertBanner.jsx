import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Radio,
  X,
  Volume2,
  VolumeX,
  ChevronRight,
  ShieldAlert,
  MapPin,
  Clock,
  Compass,
} from 'lucide-react';
import { subscribeToRealtimeEvents, getActivityLogs } from '../utils/notificationSystem';

export default function CitizenTrafficAlertBanner({ onFocusMapLocation }) {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dismissedIds, setDismissedIds] = useState(new Set());

  // Load existing disruption events from activity log on mount
  useEffect(() => {
    const logs = getActivityLogs();
    const disruptions = logs.filter(
      (l) => l.type === 'DISRUPTION_REPORTED' || l.severity === 'critical'
    );
    setActiveAlerts(disruptions.slice(0, 3));
  }, []);

  // Listen to incoming live push events
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeEvents((event) => {
      if (event.type === 'DISRUPTION_REPORTED' || event.data?.type === 'DISRUPTION_REPORTED') {
        const item = event.data || event;
        setActiveAlerts((prev) => [item, ...prev.filter((a) => a.id !== item.id)].slice(0, 5));
      }
    });
    return () => unsubscribe();
  }, []);

  const handleDismiss = (id) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  const visibleAlerts = activeAlerts.filter((a) => !dismissedIds.has(a.id));

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-6 select-none animate-in fade-in slide-in-from-top-4 duration-300">
      {visibleAlerts.map((alert, index) => {
        const condition = alert.condition || {};
        const isCritical =
          alert.severity === 'critical' ||
          condition.value === 'blocked' ||
          condition.value === 'landslide' ||
          condition.value === 'flooded';

        const lat = condition.latitude || condition.location?.coordinates?.[1] || 24.83;
        const lon = condition.longitude || condition.location?.coordinates?.[0] || 92.78;

        return (
          <div
            key={alert.id || index}
            className={`rounded-2xl border p-4 shadow-lg transition-all ${
              isCritical
                ? 'bg-gradient-to-r from-red-950/95 via-red-900/90 to-slate-900 text-white border-red-500/80 ring-1 ring-red-500/50'
                : 'bg-gradient-to-r from-amber-950/90 via-amber-900/85 to-slate-900 text-white border-amber-500/80 ring-1 ring-amber-500/50'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Left Side: Pulsing Radar & Message */}
              <div className="flex items-start gap-3">
                <div className="relative mt-0.5 shrink-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-md ${
                      isCritical ? 'bg-red-500 text-white' : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <span
                    className={`absolute -top-1 -right-1 w-3 h-3 rounded-full animate-ping ${
                      isCritical ? 'bg-red-400' : 'bg-amber-400'
                    }`}
                  ></span>
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider ${
                        isCritical
                          ? 'bg-red-500/30 text-red-200 border border-red-400/40'
                          : 'bg-amber-500/30 text-amber-200 border border-amber-400/40'
                      }`}
                    >
                      {isCritical ? '🚨 CRITICAL ROAD DISRUPTION' : '⚠️ HIGHWAY TRAFFIC ADVISORY'}
                    </span>
                    <span className="text-[11px] text-slate-300 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{new Date(alert.timestamp || Date.now()).toLocaleTimeString()}</span>
                    </span>
                  </div>

                  <h4 className="text-sm font-black tracking-tight text-white">
                    {alert.title || 'Road Hazard Detected on Lifeline Corridor'}
                  </h4>

                  <p className="text-xs text-slate-200 font-medium leading-relaxed">
                    {alert.message ||
                      'Field Officer logged active road impassability. Rerouting traffic onto alternate highway.'}
                  </p>
                </div>
              </div>

              {/* Right Side: Quick Action & Dismiss */}
              <div className="flex items-center gap-2 sm:self-center shrink-0">
                {onFocusMapLocation && (
                  <button
                    type="button"
                    onClick={() => onFocusMapLocation(lat, lon)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-102 active:scale-98"
                  >
                    <MapPin className="w-3.5 h-3.5 text-red-300" />
                    <span>View on Map</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDismiss(alert.id)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Dismiss alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
