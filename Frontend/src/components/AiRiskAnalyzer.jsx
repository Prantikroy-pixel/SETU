import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import { conditionAPI } from '../api';
import {
  IncidentImpactZoneLayer,
  IncidentSeverityLegend,
} from './IncidentImpactZoneLayer';
import {
  RiskSegmentedRoute,
  getRiskDivision,
  buildDynamicRouteSegments,
  NER_HIGHWAY_CORRIDORS,
} from './RiskCorridorMapLayer';
import MapLocationInspector from './MapLocationInspector';
import MapPlaceSearchControl from './MapPlaceSearchControl';
import GoogleMapTileLayer from './GoogleMapTileLayer';
import CustomSelect from './CustomSelect';
import {
  Cpu,
  Navigation,
  MapPin,
  Route,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Activity,
  Layers,
  ShieldAlert,
  CloudRain,
  Mountain,
  Compass,
  ArrowRight,
  RefreshCw,
  Thermometer,
  Wind,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import L from 'leaflet';

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function AiRiskAnalyzer({
  conditions = [],
  title = 'AI Disruption Risk Engine',
  subtitle = 'Geoclimatic risk prediction & real-time highway corridor disruption analysis.',
}) {
  // Scope Mode: 'corridor' (Real Highway) or 'single' (Point Nearest Area)
  const [scopeMode, setScopeMode] = useState('corridor');
  const [selectedCorridorId, setSelectedCorridorId] = useState(NER_HIGHWAY_CORRIDORS[0]?.id || 'corridor-nh6-shillong-silchar');
  const [bufferKm, setBufferKm] = useState(5.0);

  // Single Point Form (Nearest Area)
  const [pointForm, setPointForm] = useState({
    latitude: 24.8333,
    longitude: 92.7789,
    rainfall: '',
    slope: '',
    elevation: '',
    soil_saturation: '',
    drainage: '',
    vegetation: '',
    use_realtime: true,
  });

  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [predictionResult, setPredictionResult] = useState(null);

  // Get currently selected real corridor object
  const activeCorridor = NER_HIGHWAY_CORRIDORS.find((c) => c.id === selectedCorridorId) || NER_HIGHWAY_CORRIDORS[0];

  const handlePointChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPointForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleMapPointSelect = (lat, lon, hazard = null) => {
    setPointForm((prev) => ({
      ...prev,
      latitude: parseFloat(lat.toFixed(5)),
      longitude: parseFloat(lon.toFixed(5)),
    }));
    if (hazard) {
      setPredictionResult(hazard);
    }
  };

  const handleRunAnalysis = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setPredictionResult(null);

    const steps = [
      'Ingesting live satellite DEM & Open-Meteo precipitation...',
      'Computing soil saturation, slope gradients & runoff vectors...',
      'Evaluating Random Forest & XGBoost hazard disruption models...',
      'Synthesizing real-time risk profile...',
    ];

    let stepIdx = 0;
    setProgressStep(steps[0]);
    const stepInterval = setInterval(() => {
      stepIdx++;
      if (stepIdx < steps.length) {
        setProgressStep(steps[stepIdx]);
      }
    }, 450);

    try {
      if (scopeMode === 'corridor') {
        // Evaluate Real Existing Road Corridor
        const payload = {
          waypoints: activeCorridor.path,
          corridor_name: activeCorridor.name,
          buffer_km: parseFloat(bufferKm),
          use_realtime: true,
        };

        const res = await conditionAPI.predictRouteRisk(payload);
        clearInterval(stepInterval);
        setPredictionResult({
          ...res,
          corridor: activeCorridor,
        });
      } else {
        // Evaluate Single Point Nearest Area
        const params = {
          lat: parseFloat(pointForm.latitude),
          lon: parseFloat(pointForm.longitude),
          use_realtime: pointForm.use_realtime,
        };

        if (pointForm.rainfall) params.rainfall = parseFloat(pointForm.rainfall);
        if (pointForm.slope) params.slope = parseFloat(pointForm.slope);
        if (pointForm.elevation) params.elevation = parseFloat(pointForm.elevation);
        if (pointForm.soil_saturation) params.soil_saturation = parseFloat(pointForm.soil_saturation);
        if (pointForm.drainage) params.drainage = parseFloat(pointForm.drainage);
        if (pointForm.vegetation) params.vegetation = parseFloat(pointForm.vegetation);

        const res = await conditionAPI.predictRisk(params);
        clearInterval(stepInterval);
        setPredictionResult(res);
      }
    } catch (err) {
      clearInterval(stepInterval);
      setErrorMsg('AI inference pipeline failed. Verify network connectivity or coordinates.');
    } finally {
      setLoading(false);
      setProgressStep('');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center shadow-sm">
              <Cpu className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black text-slate-900">{title}</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">{subtitle}</p>
        </div>

        {/* Scope Selector */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 self-start text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setScopeMode('corridor');
              setPredictionResult(null);
            }}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              scopeMode === 'corridor'
                ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Route className="w-3.5 h-3.5 text-primary-600" />
            <span>Real Highway Corridor</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setScopeMode('single');
              setPredictionResult(null);
            }}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              scopeMode === 'single'
                ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-primary-600" />
            <span>Point Nearest Area</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Controls / Right Map & Report */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Controls (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <span>{scopeMode === 'corridor' ? 'Highway Corridor Selector' : 'Nearest Area Coordinates'}</span>
            </h3>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRunAnalysis} className="space-y-4">
              {scopeMode === 'corridor' ? (
                <>
                  {/* Real Highway Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Select Strategic Road Corridor
                    </label>
                    <CustomSelect
                      value={selectedCorridorId}
                      onChange={(e) => {
                        setSelectedCorridorId(e.target.value);
                        setPredictionResult(null);
                      }}
                      options={NER_HIGHWAY_CORRIDORS.map((c) => ({
                        value: c.id,
                        label: `${c.name} (${c.lengthKm} km)`,
                        icon: '🛣️',
                      }))}
                    />
                  </div>

                  {/* Highway Details Summary Card */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
                    <div className="font-extrabold text-slate-900">{activeCorridor.name}</div>
                    <div className="text-[11px] text-slate-600 font-medium">
                      <strong>Sector:</strong> {activeCorridor.section}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      <strong>Length:</strong> {activeCorridor.lengthKm} km | <strong>Base Hazard:</strong> {Math.round(activeCorridor.baseRisk * 100)}%
                    </div>
                    <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200 italic">
                      {activeCorridor.hazardDetails}
                    </div>
                  </div>

                  {/* Buffer Radius */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Corridor Buffer Geofence ({bufferKm} km)
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="15"
                      step="1"
                      value={bufferKm}
                      onChange={(e) => setBufferKm(parseFloat(e.target.value))}
                      className="w-full accent-primary-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-0.5">
                      <span>2 km</span>
                      <span>5 km (Standard)</span>
                      <span>15 km</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Single Point Coordinates */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Point Coordinates (Click Map to auto-fill)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold">Latitude</span>
                        <input
                          type="number"
                          step="0.00001"
                          name="latitude"
                          value={pointForm.latitude}
                          onChange={handlePointChange}
                          className="w-full text-xs font-mono font-bold border border-slate-300 rounded p-2 bg-slate-50 focus:bg-white"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold">Longitude</span>
                        <input
                          type="number"
                          step="0.00001"
                          name="longitude"
                          value={pointForm.longitude}
                          onChange={handlePointChange}
                          className="w-full text-xs font-mono font-bold border border-slate-300 rounded p-2 bg-slate-50 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live Satellite Realtime Checkbox */}
                  <div className="flex items-center gap-2 p-2.5 bg-primary-50/60 rounded-lg border border-primary-200/80">
                    <input
                      type="checkbox"
                      id="use_realtime_point"
                      name="use_realtime"
                      checked={pointForm.use_realtime}
                      onChange={handlePointChange}
                      className="w-4 h-4 text-primary-600 rounded cursor-pointer"
                    />
                    <label htmlFor="use_realtime_point" className="text-xs font-bold text-slate-800 cursor-pointer">
                      Auto-ingest Live Real-Time Data (DEM + Open-Meteo)
                    </label>
                  </div>
                </>
              )}

              {/* Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Cpu className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>
                  {loading
                    ? progressStep || 'Evaluating Geoclimatic ML Pipeline...'
                    : scopeMode === 'corridor'
                    ? 'Evaluate Highway Corridor Disruption'
                    : 'Calculate Nearest Area Risk'}
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Map & Results (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Interactive Map Box */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[440px] flex flex-col">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-primary-600" />
                <span>
                  {scopeMode === 'corridor'
                    ? `Live Corridor Path: ${activeCorridor.name}`
                    : 'Nearest Area Inspection Map'}
                </span>
              </h3>
              <span className="text-[11px] text-slate-400 font-semibold italic">
                {scopeMode === 'corridor' ? 'Highway road trace' : 'Click map to inspect point'}
              </span>
            </div>

            <div className="grow relative">
              <MapContainer
                center={
                  scopeMode === 'corridor'
                    ? activeCorridor.path[Math.floor(activeCorridor.path.length / 2)] || [25.18, 92.20]
                    : [pointForm.latitude || 24.83, pointForm.longitude || 92.78]
                }
                zoom={scopeMode === 'corridor' ? 8 : 11}
                className="w-full h-full"
              >
                {/* Google Maps Real-Time Road & Satellite Hybrid Base Layer */}
                <GoogleMapTileLayer defaultLayer="roadmap" />

                {/* Interactive Map Place Search */}
                <MapPlaceSearchControl onSelectLocation={handleMapPointSelect} />

                {/* Real-time Incident Impact Zones Layer */}
                <IncidentImpactZoneLayer conditions={conditions} />

                {/* Scope: Corridor - Render Selected Real Highway Path */}
                {scopeMode === 'corridor' && (
                  <RiskSegmentedRoute
                    routeCoordinates={activeCorridor.path}
                    conditions={conditions}
                    waypointAnalysis={predictionResult?.waypoint_analysis || []}
                    riskScore={
                      predictionResult?.route_composite_risk !== undefined
                        ? predictionResult.route_composite_risk
                        : activeCorridor.baseRisk
                    }
                    interactive={true}
                    label={activeCorridor.name}
                    originName={activeCorridor.section.split('–')[0]?.trim()}
                    destName={activeCorridor.section.split('–').slice(-1)[0]?.trim()}
                  />
                )}

                {/* Scope: Single Point - Render Point Marker and Buffer */}
                {scopeMode === 'single' && (
                  <>
                    <MapLocationInspector conditions={conditions} onLocationSelected={handleMapPointSelect} />
                    <Marker position={[pointForm.latitude, pointForm.longitude]}>
                      <Popup>
                        <div className="text-xs p-1">
                          <div className="font-bold text-slate-900">📍 Inspected Target Point</div>
                          <div className="font-mono text-slate-600">
                            {pointForm.latitude.toFixed(4)}° N, {pointForm.longitude.toFixed(4)}° E
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                    <Circle
                      center={[pointForm.latitude, pointForm.longitude]}
                      radius={1500}
                      pathOptions={{
                        color: '#2563EB',
                        fillColor: '#3B82F6',
                        fillOpacity: 0.2,
                        weight: 1.5,
                      }}
                    />
                  </>
                )}
              </MapContainer>

              {/* Severity Legend */}
              <IncidentSeverityLegend
                totalIncidents={conditions.length}
                className="absolute bottom-3 right-3 shadow-xl"
              />
            </div>
          </div>

          {/* Analysis Report Card (If Prediction Result Available) */}
          {predictionResult && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2">
              {/* Header Score & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    AI Disruption Risk Assessment
                  </span>
                  <h4 className="text-base font-black text-slate-900 mt-0.5">
                    {scopeMode === 'corridor'
                      ? activeCorridor.name
                      : `Nearest Area at (${pointForm.latitude.toFixed(3)}°N, ${pointForm.longitude.toFixed(3)}°E)`}
                  </h4>
                </div>

                {(() => {
                  const score =
                    predictionResult.route_composite_risk !== undefined
                      ? predictionResult.route_composite_risk
                      : predictionResult.predicted_risk_score !== undefined
                      ? predictionResult.predicted_risk_score
                      : predictionResult.risk_score || 0.2;
                  const div = getRiskDivision(score);

                  return (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-black text-slate-900">{div.percentage}% RISK</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase">{div.label}</div>
                      </div>
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider shadow-xs ${div.badgeBg}`}>
                        {div.shortLabel}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Live Satellite Data Source Tag */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-200 gap-2">
                <span className="flex items-center gap-2 text-primary-800 font-bold">
                  <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Ground Telemetry: {predictionResult.data_source || 'Open-Meteo GPM + SRTM DEM Ingestion'}</span>
                </span>
                {predictionResult.weather && (
                  <span className="font-mono text-slate-600 text-[10px] flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-amber-500" />
                      {predictionResult.weather.temperature_c}°C
                    </span>
                    <span className="flex items-center gap-1">
                      <Droplets className="w-3 h-3 text-sky-500" />
                      {predictionResult.weather.relative_humidity_pct}% RH
                    </span>
                    <span className="flex items-center gap-1">
                      <Wind className="w-3 h-3 text-slate-400" />
                      {predictionResult.weather.wind_speed_kmh} km/h
                    </span>
                  </span>
                )}
              </div>

              {/* Urban Flash Flood Alert Banner */}
              {(predictionResult.features?.is_urban_flash_flood || predictionResult.explanation?.includes('Urban flash flood') || predictionResult.explanation?.includes('URBAN FLASH FLOOD')) && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-900 flex items-start gap-2.5 shadow-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold uppercase tracking-wider text-[10px] text-amber-800 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-amber-700" />
                      <span>Urban Flash Flood Alert (Guwahati / Silchar Sector)</span>
                    </div>
                    <div className="text-[11px] font-medium mt-0.5 text-amber-900 leading-relaxed">
                      Elevated waterlogging risk due to rain sustained over{' '}
                      <strong>{predictionResult.features?.rainfall_duration_hours || 4.5} consecutive hours</strong> combined with low drainage capacity ({predictionResult.features?.drainage_quality || '1.10'} km/km²) and sparse vegetation cover ({predictionResult.features?.vegetation_cover || '0.25'} NDVI).
                    </div>
                  </div>
                </div>
              )}

              {/* Environmental Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                    <CloudRain className="w-3.5 h-3.5 text-sky-500" />
                    <span>24h Rainfall</span>
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-1">
                    {predictionResult.features?.rainfall_mm ??
                      predictionResult.range_metrics?.max_rainfall_mm ??
                      predictionResult.realtime_factors?.rainfall_24h_mm ??
                      predictionResult.input_features?.rainfall ??
                      '0.0'} mm
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-blue-500" />
                    <span>Rain Duration</span>
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-1">
                    {predictionResult.features?.rainfall_duration_hours ?? '1.0'} hrs
                    {predictionResult.features?.rainfall_intensity_mm_hr ? (
                      <span className="text-[10px] font-semibold text-slate-500 block text-slate-500">
                        ({predictionResult.features.rainfall_intensity_mm_hr} mm/h)
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                    <Mountain className="w-3.5 h-3.5 text-amber-500" />
                    <span>Slope Gradient</span>
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-1">
                    {predictionResult.features?.slope_degrees ??
                      predictionResult.range_metrics?.max_slope_degrees ??
                      predictionResult.realtime_factors?.slope_deg ??
                      predictionResult.input_features?.slope ??
                      '0.0'}°
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Drainage Quality</span>
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-1">
                    {predictionResult.features?.drainage_quality ?? '2.1'} km/km²
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-green-500" />
                    <span>Vegetation NDVI</span>
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-1">
                    {predictionResult.features?.vegetation_cover ? `${Math.round(predictionResult.features.vegetation_cover * 100)}%` : '58%'}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-slate-400 font-bold uppercase text-[10px] flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-teal-500" />
                    <span>Soil Saturation</span>
                  </div>
                  <div className="text-sm font-black text-slate-900 mt-1">
                    {typeof (predictionResult.features?.soil_saturation ?? predictionResult.realtime_factors?.soil_saturation) === 'number'
                      ? `${Math.round((predictionResult.features?.soil_saturation ?? predictionResult.realtime_factors?.soil_saturation) * 100)}%`
                      : predictionResult.features?.soil_saturation || predictionResult.realtime_factors?.soil_saturation || '35%'}
                  </div>
                </div>
              </div>

              {/* Real-time AI Explanation */}
              {predictionResult.explanation && (
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg text-xs text-blue-900 font-medium leading-relaxed">
                  {predictionResult.explanation}
                </div>
              )}

              {/* Corridor Sub-Stretch Transit Availability Breakdown */}
              {scopeMode === 'corridor' && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Route className="w-3.5 h-3.5 text-primary-600" />
                      <span>Section-By-Section Stretch Status (A → E Breakdown)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">Click stretch on map for details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {buildDynamicRouteSegments(
                      activeCorridor.path,
                      conditions,
                      predictionResult?.waypoint_analysis || [],
                      predictionResult?.route_composite_risk || activeCorridor.baseRisk
                    ).map((seg) => {
                      const isClear = seg.division.key === 'safe';
                      const isBlocked = seg.division.key === 'critical';
                      const parts = activeCorridor.section.split('–').map((s) => s.trim());
                      const segOrigin = parts[seg.index - 1] || `Checkpoint ${seg.index}`;
                      const segDest = parts[seg.index] || `Checkpoint ${seg.index + 1}`;

                      return (
                        <div
                          key={`sub-seg-${seg.index}`}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all ${
                            isBlocked
                              ? 'bg-red-50/70 border-red-200 text-red-900'
                              : isClear
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                              : 'bg-amber-50/70 border-amber-200 text-amber-900'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="font-black flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isBlocked ? 'bg-red-600 animate-pulse' : isClear ? 'bg-emerald-600' : 'bg-amber-500'
                                }`}
                              />
                              <span>
                                Stretch #{seg.index}: {segOrigin} → {segDest}
                              </span>
                            </div>
                            <div className="text-[10px] font-medium opacity-90">
                              {seg.hazard
                                ? `🚨 Disruption: ${seg.hazard.value} at this sector`
                                : isClear
                                ? '✅ Open & Safe for Sub-Route Transit'
                                : '⚠️ Cautionary Incline Section'}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0 ${seg.division.badgeBg}`}
                          >
                            {seg.division.shortLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actionable Dispatch Advisory */}
              <div className="p-3 bg-slate-900 text-white rounded-lg text-xs flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold uppercase text-[11px] text-amber-300">Strategic Dispatch Recommendation</div>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed font-medium">
                    {predictionResult.recommendation ||
                      (scopeMode === 'corridor'
                        ? 'Corridor hill cuts show elevated saturation. Maintain satellite GPS pings and prepare bypass convoy routes if rain exceeds 45mm/24h.'
                        : 'Local sector terrain is stable. Monitor drainage culverts for sudden debris runoff.')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
