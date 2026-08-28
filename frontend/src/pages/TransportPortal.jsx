import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { vehicleAPI, allocationAPI, conditionAPI } from '../api';
import { IncidentImpactZoneLayer, IncidentSeverityLegend, parseCoords } from '../components/IncidentImpactZoneLayer';
import RealtimeTelemetryBanner from '../components/RealtimeTelemetryBanner';
import MapPlaceSearchControl from '../components/MapPlaceSearchControl';
import GoogleMapTileLayer from '../components/GoogleMapTileLayer';
import CustomSelect from '../components/CustomSelect';

// Route data fallbacks (files removed due to build issues)
const SILCHAR_HAFLONG_HIGHWAY_ROUTE = [];
const SILCHAR_HAFLONG_GEOJSON = null;
import {
  AlertCircle,
  CheckCircle,
  Truck,
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  MapPin,
  Eye,
  Lock,
  Shield,
  Navigation,
  Activity,
  Gauge,
  Clock,
  Compass,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Custom dynamic moving cargo vehicle marker icon
const createFleetConvoyIcon = (isSimulating = false) => {
  return new L.DivIcon({
    className: 'live-cargo-gps-pin',
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <!-- Pulsing Radar Glow Ring -->
        <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(16, 185, 129, 0.35); border: 2px solid #10B981; animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <!-- Inner Convoy Badge -->
        <div style="width: 32px; height: 32px; border-radius: 50%; background: #064E3B; border: 2px solid #34D399; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.5); font-size: 16px;">
          🚚
        </div>
        <!-- Bottom Floating Tag -->
        <div style="position: absolute; bottom: -18px; background: rgba(15, 23, 42, 0.95); color: #34D399; font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(52, 211, 153, 0.5); white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.4); text-transform: uppercase; letter-spacing: 0.5px;">
          AS-11-BC-4401
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

export default function TransportPortal() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [loading, setLoading] = useState(false);

  // New vehicle form
  const [newVehicle, setNewVehicle] = useState({
    registration_number: '',
    vehicle_type: '5-Ton 4x4 Heavy Relief Truck',
  });
  const [vehicleMsg, setVehicleMsg] = useState({ text: '', type: '' });
  const [registering, setRegistering] = useState(false);

  // Real-time Silchar -> Haflong GPS Simulation State
  const [simStep, setSimStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simSpeedMs, setSimSpeedMs] = useState(350); // 350ms per road waypoint (1x speed)
  const [pingMsg, setPingMsg] = useState({ text: '', type: '' });

  const totalWaypoints = SILCHAR_HAFLONG_HIGHWAY_ROUTE.length; // 120
  const currentPos = SILCHAR_HAFLONG_HIGHWAY_ROUTE[Math.min(simStep, totalWaypoints - 1)];
  const progressPercent = Math.round((simStep / (totalWaypoints - 1)) * 100);

  // Extract path coordinates for Leaflet Polyline: [[lat, lon], ...]
  const routePolylineCoords = SILCHAR_HAFLONG_HIGHWAY_ROUTE.map((pt) => [pt.lat, pt.lon]);

  useEffect(() => {
    fetchLogisticsData();
  }, []);

  // Periodic GPS convoy motion simulation along Silchar-Haflong real road
  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setSimStep((prev) => {
          if (prev >= totalWaypoints - 1) {
            setIsPlaying(false);
            setPingMsg({
              text: 'Convoy reached Haflong Emergency Relief Terminal (100% Delivered).',
              type: 'success',
            });
            return prev;
          }
          const next = prev + 1;
          const pt = SILCHAR_HAFLONG_HIGHWAY_ROUTE[next];
          // Dispatch live telemetry ping to vehicle API
          if (selectedVehicle?.id || vehicles[0]?.id) {
            const vId = selectedVehicle?.id || vehicles[0]?.id;
            vehicleAPI.ping(vId, {
              latitude: pt.lat,
              longitude: pt.lon,
              status: next >= totalWaypoints - 1 ? 'idle' : 'en_route',
            }).catch(() => {});
          }
          return next;
        });
      }, simSpeedMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, simSpeedMs, totalWaypoints, selectedVehicle, vehicles]);

  const fetchLogisticsData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (user?.role === 'transport_operator') {
        params.operator = user.id;
      }
      const vData = await vehicleAPI.list(params);
      const vList = vData.results || vData || [];
      setVehicles(vList);
      if (vList.length > 0 && !selectedVehicle) {
        setSelectedVehicle(vList[0]);
      }

      const aData = await allocationAPI.list();
      const aList = aData.results || aData || [];
      // Enrich allocations with Silchar-Haflong highway route if route was generic
      const enrichedAllocs = aList.map((a) => {
        if (!a.route_geojson || (a.route_geojson.geometry?.coordinates?.length || 0) < 10) {
          return {
            ...a,
            route_geojson: SILCHAR_HAFLONG_GEOJSON,
          };
        }
        return a;
      });

      const opAllocs = user?.role === 'transport_operator'
        ? enrichedAllocs.filter((a) => vList.map((v) => v.id).includes(a.vehicle))
        : enrichedAllocs;

      setAllocations(opAllocs);
      if (opAllocs.length > 0 && !selectedAllocation) {
        setSelectedAllocation(opAllocs[0]);
      }

      const cData = await conditionAPI.list();
      setConditions(cData.results || cData || []);
    } catch (err) {
      console.error('Error fetching logistics data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterVehicle = async (e) => {
    e.preventDefault();
    if (!newVehicle.registration_number) {
      setVehicleMsg({ text: 'Registration number required.', type: 'error' });
      return;
    }
    setRegistering(true);
    setVehicleMsg({ text: '', type: '' });
    try {
      const payload = {
        ...newVehicle,
        operator: user?.id,
        latitude: 24.83319,
        longitude: 92.77888,
        status: 'idle',
      };
      const v = await vehicleAPI.create(payload);
      setVehicles([...vehicles, v]);
      setSelectedVehicle(v);
      setVehicleMsg({ text: `Vehicle ${v.registration_number} registered successfully.`, type: 'success' });
      setNewVehicle({ registration_number: '', vehicle_type: '5-Ton 4x4 Heavy Relief Truck' });
    } catch (err) {
      setVehicleMsg({ text: 'Registration failed. Registration number must be unique.', type: 'error' });
    } finally {
      setRegistering(false);
    }
  };

  const updateAllocationStatus = async (id, status) => {
    try {
      const updated = await allocationAPI.update(id, { delivery_status: status });
      setAllocations(allocations.map((a) => (a.id === id ? { ...updated, route_geojson: SILCHAR_HAFLONG_GEOJSON } : a)));
      if (selectedAllocation?.id === id) {
        setSelectedAllocation({ ...updated, route_geojson: SILCHAR_HAFLONG_GEOJSON });
      }
      if (status === 'delivered') {
        setSimStep(totalWaypoints - 1);
        setIsPlaying(false);
      }
    } catch (err) {
      console.error('Failed to update allocation milestone', err);
    }
  };

  const handleScrubProgress = (percent) => {
    const targetStep = Math.min(
      Math.max(Math.round((percent / 100) * (totalWaypoints - 1)), 0),
      totalWaypoints - 1
    );
    setSimStep(targetStep);
    const pt = SILCHAR_HAFLONG_HIGHWAY_ROUTE[targetStep];
    setPingMsg({
      text: `Scrubbed to ${percent}%: ${pt.name} (${pt.lat.toFixed(4)}°N, ${pt.lon.toFixed(4)}°E)`,
      type: 'info',
    });
  };

  const handleResetSimulation = () => {
    setIsPlaying(false);
    setSimStep(0);
    setPingMsg({
      text: 'Convoy simulation reset to Silchar Central Logistics Depot (Km 0).',
      type: 'info',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center space-x-2">
              <Truck className="h-6 w-6 text-emerald-600 shrink-0" />
              <span>Fleet Operator Telematics & Transit Command</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              Live highway GPS telemetry tracking, Silchar–Haflong paved route simulation, and fleet dispatch monitors.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              Paved Highway Telemetry Active
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Telemetry Status Stream Banner */}
      <RealtimeTelemetryBanner
        conditions={conditions}
        districtName="Cachar – Dima Hasao Corridor"
        onRefresh={fetchLogisticsData}
        isRefreshing={loading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Vehicle Registration & Fleet Overview */}
        <div className="space-y-6">
          {/* Register Vehicle Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                <Truck className="h-4 w-4 text-emerald-600" />
                <span>Register Heavy Relief Vehicle</span>
              </h2>
              <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Fleet Unit
              </span>
            </div>

            {vehicleMsg.text && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold border ${
                  vehicleMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {vehicleMsg.text}
              </div>
            )}

            <form onSubmit={handleRegisterVehicle} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Registration Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. AS-11-BC-4401"
                  value={newVehicle.registration_number}
                  onChange={(e) => setNewVehicle({ ...newVehicle, registration_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Classification</label>
                <CustomSelect
                  name="vehicle_type"
                  value={newVehicle.vehicle_type}
                  onChange={(e) => setNewVehicle({ ...newVehicle, vehicle_type: e.target.value })}
                  options={[
                    { value: '5-Ton 4x4 Heavy Relief Truck', label: '5-Ton 4x4 Heavy Relief Truck', icon: '🚚' },
                    { value: '10-Ton Logistics Carrier', label: '10-Ton Logistics Carrier', icon: '🚛' },
                    { value: 'Amphibious All-Terrain Unit', label: 'Amphibious All-Terrain Unit', icon: '🚤' },
                    { value: 'Emergency Medical Van', label: 'Emergency Medical Van', icon: '🚐' },
                  ]}
                />
              </div>

              <button
                type="submit"
                disabled={registering}
                className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-lg shadow-xs transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Truck className="h-4 w-4" />
                <span>{registering ? 'Enrolling Unit...' : 'Enroll Vehicle into Fleet'}</span>
              </button>
            </form>
          </div>

          {/* Registered Fleet List */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Registered Transport Units ({vehicles.length})
              </h3>
              <button
                onClick={fetchLogisticsData}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {vehicles.length === 0 ? (
                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 italic text-center">
                  Default Convoy Unit Active: AS-11-BC-4401
                </div>
              ) : (
                vehicles.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVehicle(v)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                      selectedVehicle?.id === v.id
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-mono font-black text-slate-900">{v.registration_number}</span>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          v.status === 'en_route'
                            ? 'bg-blue-100 text-blue-800'
                            : v.status === 'dispatched'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {v.status ? v.status.replace('_', ' ') : 'Ready'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">{v.vehicle_type}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      Assigned: Silchar ➔ Haflong NH-27 Corridor
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Live Highway Simulation & Tactical Map */}
        <div className="lg:col-span-2 space-y-5">
          {/* Mission Details & District Admin Reroute Notice Banner */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h3 className="text-sm font-black text-slate-900">
                    NH-27 Silchar – Haflong Paved Highway Lifeline (87.3 km)
                  </h3>
                </div>
                <div className="text-xs text-slate-600 font-medium mt-1 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 font-bold text-slate-800">
                    📦 Origin: <span className="font-normal text-slate-600">Silchar Central Logistics Depot (Km 0)</span>
                  </span>
                  <span>➔</span>
                  <span className="flex items-center gap-1 font-bold text-slate-800">
                    🎯 Target: <span className="font-normal text-slate-600">Haflong Emergency Relief Terminal (Km 87.3)</span>
                  </span>
                </div>
              </div>

              {/* Reroute Restriction Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold shrink-0 shadow-2xs">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <div>
                  <div className="text-[11px] font-black uppercase tracking-tight text-amber-900">Reroute Control</div>
                  <div className="text-[10px] font-semibold text-amber-700">District Admin Authorization Only</div>
                </div>
              </div>
            </div>

            {/* Notification / Ping status */}
            {pingMsg.text && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center space-x-2 font-bold border ${
                  pingMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                <Activity className="h-3.5 w-3.5 shrink-0 animate-pulse" />
                <span>{pingMsg.text}</span>
              </div>
            )}

            {/* Interactive Vehicle Simulation Control Panel */}
            <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md space-y-4">
              {/* Play / Controls Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md">
                    🚚
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                      <span>AS-11-BC-4401 Live Convoy Simulation</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40 font-mono font-bold">
                        {progressPercent}% Complete
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Waypoint: {simStep + 1} of {totalWaypoints} ({currentPos.name})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Play / Pause */}
                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-sm cursor-pointer ${
                      isPlaying
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 ring-2 ring-amber-400'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4 fill-current" />
                        <span>Pause Simulation</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>Play GPS Simulation</span>
                      </>
                    )}
                  </button>

                  {/* Reset */}
                  <button
                    type="button"
                    onClick={handleResetSimulation}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                    title="Reset to Silchar Depot"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Highway Scrubber Range Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-slate-400">
                  <span>Silchar Depot (0%)</span>
                  <span className="text-emerald-400 font-mono font-black">
                    Current: {progressPercent}% ({((progressPercent / 100) * 87.3).toFixed(1)} / 87.3 km)
                  </span>
                  <span>Haflong Terminal (100%)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={progressPercent}
                  onChange={(e) => handleScrubProgress(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-500 cursor-pointer h-2.5 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Speed Multiplier & Waypoint Quick Jumps */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Corridor Stops:</span>
                  <button
                    type="button"
                    onClick={() => handleScrubProgress(0)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                      progressPercent === 0 ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    Silchar (0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScrubProgress(28)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                      progressPercent >= 25 && progressPercent <= 32 ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    Balacherra (28%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScrubProgress(48)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                      progressPercent >= 45 && progressPercent <= 52 ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    Harangajao (48%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScrubProgress(72)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                      progressPercent >= 70 && progressPercent <= 76 ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    Jatinga Pass (72%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScrubProgress(100)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                      progressPercent === 100 ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    Haflong (100%)
                  </button>
                </div>

                {/* Speed Multiplier */}
                <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-lg border border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 px-1">Speed:</span>
                  {[
                    { label: '1x', ms: 350 },
                    { label: '2x', ms: 180 },
                    { label: '4x', ms: 80 },
                  ].map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setSimSpeedMs(s.ms)}
                      className={`px-2 py-0.5 rounded text-[10px] font-black transition-all ${
                        simSpeedMs === s.ms ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Convoy Telemetry HUD */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">GPS Coordinates</div>
                  <div className="font-mono font-bold text-emerald-400">
                    {currentPos.lat.toFixed(4)}°N, {currentPos.lon.toFixed(4)}°E
                  </div>
                </div>
                <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Convoy Speed</div>
                  <div className="font-mono font-bold text-white">
                    {isPlaying ? (simSpeedMs === 80 ? '78 km/h' : simSpeedMs === 180 ? '54 km/h' : '38 km/h') : '0 km/h (Standby)'}
                  </div>
                </div>
                <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Distance Remaining</div>
                  <div className="font-mono font-bold text-amber-300">
                    {Math.max((87.3 - (progressPercent / 100) * 87.3), 0).toFixed(1)} km
                  </div>
                </div>
                <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/60">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Estimated ETA</div>
                  <div className="font-mono font-bold text-emerald-300">
                    {progressPercent >= 100 ? 'Delivered' : `~${Math.round(Math.max((87.3 - (progressPercent / 100) * 87.3) * 0.8, 2))} mins`}
                  </div>
                </div>
              </div>
            </div>

            {/* Tactical Map Container */}
            <div className="w-full h-[460px] relative rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <MapContainer
                center={[25.00, 92.90]}
                zoom={10}
                className="w-full h-full"
              >
                {/* Google Maps Road & Satellite Hybrid Base Layer */}
                <GoogleMapTileLayer defaultLayer="roadmap" />

                {/* Interactive Map Place Search */}
                <MapPlaceSearchControl />

                {/* Real-time Color-Coded Incident Impact Area Layer */}
                <IncidentImpactZoneLayer conditions={conditions} />

                {/* Real Paved Highway Road Centerline Polyline (Silchar -> Haflong NH-27) */}
                <Polyline
                  positions={routePolylineCoords}
                  pathOptions={{
                    color: '#ffffff',
                    weight: 7,
                    opacity: 0.95,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
                <Polyline
                  positions={routePolylineCoords}
                  pathOptions={{
                    color: '#2563EB', // Vibrant Blue Asphalt Highway Color
                    weight: 5,
                    opacity: 0.95,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                >
                  <Popup>
                    <div className="text-xs p-1 space-y-1">
                      <div className="font-bold text-slate-900">NH-27 Silchar – Haflong Lifeline Corridor</div>
                      <div className="text-slate-600">Total Length: 87.3 km • 120 Paved Highway Vertices</div>
                    </div>
                  </Popup>
                </Polyline>

                {/* Start Marker: Silchar Logistics Depot */}
                <Marker position={[24.83319, 92.77888]}>
                  <Popup>
                    <div className="text-xs p-1">
                      <div className="font-extrabold text-slate-900">📦 Silchar Central Logistics Depot</div>
                      <div className="text-slate-600 mt-0.5">Corridor Origin (Km 0)</div>
                    </div>
                  </Popup>
                </Marker>

                {/* Destination Marker: Haflong Relief Sector */}
                <Marker position={[25.16810, 93.02474]}>
                  <Popup>
                    <div className="text-xs p-1">
                      <div className="font-extrabold text-slate-900">🎯 Haflong Emergency Relief Terminal</div>
                      <div className="text-slate-600 mt-0.5">Destination Relief Sector (Km 87.3)</div>
                    </div>
                  </Popup>
                </Marker>

                {/* Dynamic Moving Convoy Vehicle GPS Pin */}
                <Marker position={[currentPos.lat, currentPos.lon]} icon={createFleetConvoyIcon(isPlaying)}>
                  <Popup>
                    <div className="text-xs p-1 space-y-1 text-slate-900 font-sans">
                      <div className="font-black text-emerald-700 flex items-center gap-1">
                        <span>🚚 AS-11-BC-4401</span>
                        <span className="text-[10px] text-slate-500 font-normal">5-Ton Relief Convoy</span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-800">
                        {currentPos.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        GPS: {currentPos.lat.toFixed(4)}°N, {currentPos.lon.toFixed(4)}°E
                      </div>
                      <div className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 p-1 rounded border border-emerald-200">
                        Progress: {progressPercent}% ({((progressPercent / 100) * 87.3).toFixed(1)} / 87.3 km)
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>

              {/* Floating Severity Legend */}
              <IncidentSeverityLegend
                totalIncidents={conditions.length}
                className="absolute bottom-3 right-3 shadow-xl"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
