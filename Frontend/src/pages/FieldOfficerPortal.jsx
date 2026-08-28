import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { conditionAPI, districtAPI } from '../api';
import {
  IncidentImpactZoneLayer,
  IncidentSeverityLegend,
  getIncidentSeverity,
} from '../components/IncidentImpactZoneLayer';
import RealtimeTelemetryBanner from '../components/RealtimeTelemetryBanner';
import AiRiskAnalyzer from '../components/AiRiskAnalyzer';
import {
  RiskSegmentedRoute,
  getRiskDivision,
  NER_HIGHWAY_CORRIDORS,
} from '../components/RiskCorridorMapLayer';
import MapLocationInspector from '../components/MapLocationInspector';
import MapPlaceSearchControl from '../components/MapPlaceSearchControl';
import GoogleMapTileLayer from '../components/GoogleMapTileLayer';
import CustomSelect from '../components/CustomSelect';
import {
  AlertCircle,
  CheckCircle,
  MapPin,
  Cpu,
  Upload,
  Compass,
  Eye,
  ShieldAlert,
  Route,
  AlertTriangle,
  Activity,
  Navigation,
  ChevronRight,
  Layers,
  Radio,
} from 'lucide-react';
import L from 'leaflet';

// Leaflet click handler helper
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function FieldOfficerPortal() {
  const [activeTab, setActiveTab] = useState('report'); // 'report' or 'ai_predict'
  const [districts, setDistricts] = useState([]);
  const [conditions, setConditions] = useState([]);
  
  // Incident Report Form States
  const [reportForm, setReportForm] = useState({
    condition_type: 'road_status',
    value: 'blocked',
    latitude: 24.8333,
    longitude: 92.7789,
    district: '',
    risk_score: '0.85',
    radius_meters: 1400,
  });
  const [reportFile, setReportFile] = useState(null);
  const [reportMsg, setReportMsg] = useState({ text: '', type: '' });
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [isRefreshingTelemetry, setIsRefreshingTelemetry] = useState(false);

  // AI Predictor States
  const [predictMode, setPredictMode] = useState('route'); // 'route' (corridor range) or 'single' (point)
  const [selectedCorridorId, setSelectedCorridorId] = useState('corridor-nh6-shillong-silchar');
  const [routeWaypoints, setRouteWaypoints] = useState(NER_HIGHWAY_CORRIDORS[0]?.path || []);
  const [routeBufferKm, setRouteBufferKm] = useState(5.0);
  const [customWaypointText, setCustomWaypointText] = useState('');

  const [aiForm, setAiForm] = useState({
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
  const [predictMsg, setPredictMsg] = useState({ text: '', type: '' });
  const [predictLoading, setPredictLoading] = useState(false);
  const [predictStep, setPredictStep] = useState('');
  const [predictResult, setPredictResult] = useState(null);

  const fetchConditionsAndDistricts = useCallback(async () => {
    setIsRefreshingTelemetry(true);
    try {
      const data = await districtAPI.list();
      setDistricts(data.results || data || []);

      const cData = await conditionAPI.list();
      setConditions(cData.results || cData || []);
    } catch (err) {
      console.error('Failed to load districts/conditions', err);
    } finally {
      setIsRefreshingTelemetry(false);
    }
  }, []);

  useEffect(() => {
    fetchConditionsAndDistricts();
    // Real-time polling every 25 seconds
    const interval = setInterval(fetchConditionsAndDistricts, 25000);
    return () => clearInterval(interval);
  }, [fetchConditionsAndDistricts]);

  const handleReportChange = (e) => {
    setReportForm({ ...reportForm, [e.target.name]: e.target.value });
  };

  const handleReportMapClick = (lat, lng) => {
    setReportForm((prev) => ({
      ...prev,
      latitude: parseFloat(lat.toFixed(5)),
      longitude: parseFloat(lng.toFixed(5)),
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setReportFile(e.target.files[0]);
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setReportSubmitting(true);
    setReportMsg({ text: '', type: '' });
    try {
      const payload = {
        ...reportForm,
        risk_score: reportForm.risk_score ? parseFloat(reportForm.risk_score) : 0.85,
        district: reportForm.district ? parseInt(reportForm.district, 10) : null,
      };

      const condition = await conditionAPI.create(payload);
      
      // If file uploaded, trigger attachment endpoint
      if (reportFile) {
        setReportMsg({ text: 'Uploading media attachment...', type: 'info' });
        await conditionAPI.uploadAttachment(condition.id, reportFile, 'photo');
      }

      // Immediately show the new colored affected zone on the live map
      const districtObj = districts.find((d) => d.id === parseInt(reportForm.district, 10));
      const enrichedCondition = {
        ...condition,
        latitude: payload.latitude,
        longitude: payload.longitude,
        risk_score: payload.risk_score,
        condition_type: payload.condition_type,
        value: payload.value,
        district_name: districtObj?.name || 'Local Sector',
        reported_at: new Date().toISOString(),
      };
      setConditions((prev) => [enrichedCondition, ...prev]);

      setReportMsg({ text: 'Ground condition reported successfully! Impact zone color-marked on live map.', type: 'success' });
      setReportForm({
        condition_type: 'road_status',
        value: 'blocked',
        latitude: 24.8333,
        longitude: 92.7789,
        district: '',
        risk_score: '0.85',
        radius_meters: 1400,
      });
      setReportFile(null);
    } catch (err) {
      setReportMsg({ text: 'Failed to log condition. Verify coordinates.', type: 'error' });
    } finally {
      setReportSubmitting(false);
    }
  };

  // AI Predictor Logic
  const handleCorridorSelect = (corridorId) => {
    setSelectedCorridorId(corridorId);
    if (corridorId === 'custom') {
      return;
    }
    const found = NER_HIGHWAY_CORRIDORS.find((c) => c.id === corridorId);
    if (found) {
      setRouteWaypoints(found.path);
      setCustomWaypointText(found.path.map((p) => `${p[0]}, ${p[1]}`).join('\n'));
    }
  };

  const handleCustomWaypointChange = (e) => {
    const txt = e.target.value;
    setCustomWaypointText(txt);
    const pts = txt
      .split('\n')
      .map((l) => {
        const parts = l.split(',');
        if (parts.length >= 2) {
          const lat = parseFloat(parts[0].trim());
          const lon = parseFloat(parts[1].trim());
          if (!isNaN(lat) && !isNaN(lon)) return [lat, lon];
        }
        return null;
      })
      .filter(Boolean);
    if (pts.length > 0) {
      setRouteWaypoints(pts);
    }
  };

  const handleAiChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setAiForm({ ...aiForm, [e.target.name]: value });
  };

  const handleAiMapClick = (lat, lng) => {
    const latVal = parseFloat(lat.toFixed(5));
    const lonVal = parseFloat(lng.toFixed(5));
    if (predictMode === 'route') {
      const newPt = [latVal, lonVal];
      const updated = [...routeWaypoints, newPt];
      setRouteWaypoints(updated);
      setSelectedCorridorId('custom');
      setCustomWaypointText(updated.map((p) => `${p[0]}, ${p[1]}`).join('\n'));
    } else {
      setAiForm((prev) => ({
        ...prev,
        latitude: latVal,
        longitude: lonVal,
      }));
      // Auto-trigger prediction when clicking the map in single point mode!
      triggerAIPrediction(null, latVal, lonVal);
    }
  };

  const triggerAIPrediction = async (e, directLat = null, directLon = null) => {
    if (e) e.preventDefault();
    setPredictLoading(true);
    setPredictResult(null);
    setPredictMsg({ text: '', type: '' });

    const latVal = directLat !== null ? directLat : aiForm.latitude;
    const lonVal = directLon !== null ? directLon : aiForm.longitude;

    const stepMessages = predictMode === 'route' ? [
      `Sampling spatial corridor range nodes (${routeWaypoints.length} waypoints)...`,
      'Querying Open-Meteo rolling precipitation & NASA SRTM DEM for all corridor nodes...',
      'Executing Gradient Boosting inference pipeline & calculating spatial delta gradients...',
      'Evaluating localized micro-anomalies (rain surges, slope breaks, subgrade saturation)...',
      'Synthesizing composite corridor threat score and contiguous hazard sub-ranges...',
    ] : [
      'Establishing connection with Open-Meteo REST endpoint...',
      'Retrieving NASA Shuttle Radar Topography Mission (SRTM) DEM point sample...',
      'Extracting cloud-filtered Sentinel-2 NDVI vegetative composites...',
      'Calculating local terrain slope spatial finite difference gradient...',
      'Synthesizing features and executing Scikit-Learn Gradient Boosting Risk model...',
    ];

    let currentStep = 0;
    setPredictStep(stepMessages[0]);
    
    // Simulate pipeline stage indicators in the UI
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < stepMessages.length) {
        setPredictStep(stepMessages[currentStep]);
      }
    }, 600);

    try {
      if (predictMode === 'route') {
        const payload = {
          waypoints: routeWaypoints,
          buffer_km: routeBufferKm,
          use_realtime: aiForm.use_realtime,
        };
        const res = await conditionAPI.predictRouteRisk(payload);
        clearInterval(interval);
        setPredictResult(res);
      } else {
        const params = {
          lat: latVal,
          lon: lonVal,
          use_realtime: aiForm.use_realtime,
        };

        if (aiForm.rainfall) params.rainfall = parseFloat(aiForm.rainfall);
        if (aiForm.slope) params.slope = parseFloat(aiForm.slope);
        if (aiForm.elevation) params.elevation = parseFloat(aiForm.elevation);
        if (aiForm.soil_saturation) params.soil_saturation = parseFloat(aiForm.soil_saturation);
        if (aiForm.drainage) params.drainage = parseFloat(aiForm.drainage);
        if (aiForm.vegetation) params.vegetation = parseFloat(aiForm.vegetation);

        const res = await conditionAPI.predictRisk(params);
        clearInterval(interval);
        setPredictResult(res);
      }
    } catch (err) {
      clearInterval(interval);
      setPredictMsg({ text: 'AI inference pipeline failed. Check internet access or parameters.', type: 'error' });
    } finally {
      setPredictLoading(false);
      setPredictStep('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="border-b border-slate-200 pb-4 mb-6 flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center space-x-2">
            <Compass className="h-6 w-6 text-primary-600" />
            <span>Field Officer Portal</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Log active road blocks and trigger real-time geo-climatic risk predictions.
          </p>
        </div>

        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 mt-4 md:mt-0 font-semibold self-start">
          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-1.5 rounded-md text-xs transition-colors ${
              activeTab === 'report' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Report Incident
          </button>
          <button
            onClick={() => setActiveTab('ai_predict')}
            className={`px-4 py-1.5 rounded-md text-xs transition-colors flex items-center space-x-1.5 ${
              activeTab === 'ai_predict' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>AI Risk Analyzer</span>
          </button>
        </div>
      </div>

      {/* Real-Time Live Telemetry Bar */}
      <RealtimeTelemetryBanner
        conditions={conditions}
        districtName={districts[0]?.name || 'Cachar / Barak Valley'}
        onRefresh={fetchConditionsAndDistricts}
        isRefreshing={isRefreshingTelemetry}
      />

      {activeTab === 'report' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2 mb-4 border-b border-slate-100 pb-2">
                <Upload className="h-5 w-5 text-primary-600" />
                <span>Log Obstruction / Hazard</span>
              </h2>

              {reportMsg.text && (
                <div
                  className={`p-3 rounded text-xs mb-4 flex items-center space-x-2 font-medium border ${
                    reportMsg.type === 'success'
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : reportMsg.type === 'info'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  {reportMsg.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 shrink-0" />
                  ) : reportMsg.type === 'info' ? (
                    <Compass className="h-4 w-4 shrink-0 animate-spin" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{reportMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                    Condition Type
                  </label>
                  <CustomSelect
                    name="condition_type"
                    value={reportForm.condition_type}
                    onChange={handleReportChange}
                    options={[
                      { value: 'road_status', label: 'Road Status / Obstruction', icon: '🚧' },
                      { value: 'rainfall', label: 'Rainfall Ingress (mm)', icon: '🌧️' },
                      { value: 'landslide_risk', label: 'Landslide Risk Level', icon: '⛰️' },
                      { value: 'traffic', label: 'Traffic Corridor Congestion', icon: '🚗' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                    Status / Value
                  </label>
                  <CustomSelect
                    name="value"
                    value={reportForm.value}
                    onChange={handleReportChange}
                    options={[
                      { value: 'blocked', label: 'Blocked / Impassable', icon: '⛔' },
                      { value: 'flooded', label: 'Flooded / High Inundation', icon: '🌊' },
                      { value: 'landslide', label: 'Active Landslide Cut-off', icon: '⚠️' },
                      { value: 'clear', label: 'Clear / Passable', icon: '✅' },
                      { value: 'closed', label: 'Closed by SDRF/District Admin', icon: '🛑' },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                      District
                    </label>
                    <CustomSelect
                      name="district"
                      value={reportForm.district}
                      onChange={handleReportChange}
                      placeholder="Select District"
                      options={districts.map((d) => ({ value: d.id, label: d.name, icon: '📍' }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                      Assigned Risk Score (Optional)
                    </label>
                    <input
                      name="risk_score"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      placeholder="0.0 - 1.0"
                      value={reportForm.risk_score}
                      onChange={handleReportChange}
                      className="w-full text-sm border border-slate-200 rounded p-2"
                    />
                  </div>
                </div>

                {/* Impact Area Radius Buffer Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                    Affected Impact Area Radius
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    {[
                      { label: '500m', value: 500, desc: 'Spot Hazard' },
                      { label: '1.0 km', value: 1000, desc: 'Road Stretch' },
                      { label: '1.5 km', value: 1400, desc: 'Pass / Valley' },
                      { label: '2.5 km', value: 2500, desc: 'Wide Flood' },
                    ].map((rad) => (
                      <button
                        key={rad.value}
                        type="button"
                        onClick={() => setReportForm({ ...reportForm, radius_meters: rad.value })}
                        className={`p-1.5 rounded-lg border text-center font-bold transition-all cursor-pointer ${
                          reportForm.radius_meters === rad.value
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div>{rad.label}</div>
                        <div className="text-[9px] opacity-80 font-normal">{rad.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                    Coordinates (Click Map to autofill)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      name="latitude"
                      type="number"
                      step="0.00001"
                      value={reportForm.latitude}
                      onChange={handleReportChange}
                      className="w-1/2 text-sm border border-slate-200 rounded p-2"
                    />
                    <input
                      name="longitude"
                      type="number"
                      step="0.00001"
                      value={reportForm.longitude}
                      onChange={handleReportChange}
                      className="w-1/2 text-sm border border-slate-200 rounded p-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                    Photo / Video Evidence
                  </label>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 file:cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Upload tagged photos showing debris/blockages.</p>
                </div>

                <button
                  type="submit"
                  disabled={reportSubmitting}
                  className="w-full py-3 bg-primary hover:bg-primary/90 text-on-primary font-bold uppercase text-xs rounded-md shadow-md transition-all cursor-pointer disabled:opacity-50 tracking-wider mt-2 flex items-center justify-center gap-2"
                >
                  <Radio className="w-4 h-4 text-white animate-pulse" />
                  <span>{reportSubmitting ? 'Submitting...' : 'Log Condition & Broadcast Live Zone'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden h-[540px]">
              <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-primary-600" />
                  <span>Live Affected Impact Zone Map</span>
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                    {conditions.length} Active Zones
                  </span>
                  <span className="text-xs text-slate-400 font-semibold italic hidden sm:inline">Click map or search to target incident</span>
                </div>
              </div>
              <div className="w-full h-full relative" style={{ height: 'calc(100% - 55px)' }}>
                <MapContainer center={[24.8333, 92.7789]} zoom={11} className="w-full h-full">
                  {/* Google Maps Real-Time Road & Satellite Hybrid Base Layer */}
                  <GoogleMapTileLayer defaultLayer="roadmap" />

                  {/* Interactive Map Location & Area Search Bar */}
                  <MapPlaceSearchControl
                    onSelectLocation={(lat, lon) => handleReportMapClick(lat, lon)}
                  />

                  {/* Real-time Color-Coded Incident Impact Area Layer */}
                  <IncidentImpactZoneLayer
                    conditions={conditions}
                    previewLocation={{
                      lat: reportForm.latitude,
                      lon: reportForm.longitude,
                      risk_score: reportForm.risk_score ? parseFloat(reportForm.risk_score) : (reportForm.value === 'blocked' ? 0.88 : 0.55),
                      value: reportForm.value,
                      condition_type: reportForm.condition_type,
                      radiusMeters: reportForm.radius_meters || 1400,
                    }}
                  />

                  <MapLocationInspector
                    conditions={conditions}
                    onLocationSelected={({ lat, lon }) => handleReportMapClick(lat, lon)}
                  />
                </MapContainer>

                {/* Real-Time Severity Divisions Legend */}
                <IncidentSeverityLegend
                  totalIncidents={conditions.length}
                  className="absolute bottom-3 right-3 shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* AI Predictor tab */
        <AiRiskAnalyzer
          conditions={conditions}
          title="Field Disruption Risk Engine"
          subtitle="Real-time geo-climatic risk analysis over registered strategic highway corridors & point nearest areas."
        />
      )}
    </div>
  );
}
