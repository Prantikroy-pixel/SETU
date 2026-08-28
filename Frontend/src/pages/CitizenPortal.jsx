import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { useAuth } from '../context/AuthContext';
import { needAPI, alertAPI, conditionAPI, districtAPI } from '../api';
import { IncidentImpactZoneLayer, IncidentSeverityLegend, parseCoords } from '../components/IncidentImpactZoneLayer';
import RealtimeTelemetryBanner from '../components/RealtimeTelemetryBanner';
import MapLocationInspector from '../components/MapLocationInspector';
import MapPlaceSearchControl from '../components/MapPlaceSearchControl';
import GoogleMapTileLayer from '../components/GoogleMapTileLayer';
import CustomSelect from '../components/CustomSelect';
import CitizenTrafficAlertBanner from '../components/CitizenTrafficAlertBanner';
import { AlertCircle, PlusCircle, CheckCircle, MapPin, Radio, Eye } from 'lucide-react';
import L from 'leaflet';

// Fix Leaflet marker icons issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for hazards
const hazardIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const needIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Map click handler helper component
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function CitizenPortal() {
  const { user, t } = useAuth();
  const [needs, setNeeds] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  
  // Submit Form States
  const [form, setForm] = useState({
    type: 'food',
    urgency: 'medium',
    quantity: 1,
    unit: 'packets',
    description: '',
    latitude: 24.83,
    longitude: 92.78,
    district: '',
  });

  const [message, setMessage] = useState({ text: '', type: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const distData = await districtAPI.list();
      setDistricts(distData.results || distData || []);
      
      const alertData = await alertAPI.list();
      setAlerts(alertData.results || alertData || []);
      
      const conditionsData = await conditionAPI.list({ condition_type: 'road_status' });
      setHazards(conditionsData.results || conditionsData || []);

      const needsData = await needAPI.list();
      setNeeds(needsData.results || needsData || []);
    } catch (err) {
      console.error('Error fetching citizen portal data', err);
    }
  };

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleMapClick = (lat, lng) => {
    setForm((prev) => ({
      ...prev,
      latitude: parseFloat(lat.toFixed(5)),
      longitude: parseFloat(lng.toFixed(5)),
    }));
  };

  const handleUseLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setForm((prev) => ({
            ...prev,
            latitude: parseFloat(position.coords.latitude.toFixed(5)),
            longitude: parseFloat(position.coords.longitude.toFixed(5)),
          }));
          setMessage({ text: 'GPS coordinates loaded successfully.', type: 'success' });
        },
        () => {
          setMessage({ text: 'Could not fetch geolocation. Please click on the map.', type: 'error' });
        }
      );
    }
  };

  const handleSubmitNeed = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ text: '', type: '' });
    try {
      const payload = {
        ...form,
        quantity: parseInt(form.quantity, 10),
        district: form.district ? parseInt(form.district, 10) : null,
      };
      
      const newNeed = await needAPI.create(payload);
      setNeeds([newNeed, ...needs]);
      setMessage({ text: 'Urgent need submitted successfully and is visible to disaster command.', type: 'success' });
      setForm({
        type: 'food',
        urgency: 'medium',
        quantity: 1,
        unit: 'packets',
        description: '',
        latitude: 24.83,
        longitude: 92.78,
        district: '',
      });
    } catch (err) {
      setMessage({ text: 'Failed to submit need. Ensure all fields are filled.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center space-x-2">
            <Radio className="h-6 w-6 text-primary-600 animate-pulse shrink-0" />
            <span>{t('citizen_portal')}</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Post emergency requests, monitor regional transport access, and receive multilingual disaster alerts.
          </p>
        </div>
      </div>

      {/* Real-time Highway Traffic Disruption Broadcast Banner */}
      <CitizenTrafficAlertBanner />

      {/* Real-time Live Telemetry Banner */}
      <RealtimeTelemetryBanner
        conditions={hazards}
        districtName={districts[0]?.name || 'Barak Valley / Assam'}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* left column: submit request */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2 mb-4 border-b border-slate-100 pb-2">
              <PlusCircle className="h-5 w-5 text-primary-600" />
              <span>Report Urgent Need</span>
            </h2>

            {message.text && (
              <div
                className={`p-3 rounded text-xs mb-4 flex items-center space-x-2 font-medium border ${
                  message.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmitNeed} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                  Resource Type
                </label>
                <CustomSelect
                  name="type"
                  value={form.type}
                  onChange={handleInputChange}
                  options={[
                    { value: 'food', label: 'Food Supplies', icon: '🍚' },
                    { value: 'water', label: 'Drinking Water', icon: '💧' },
                    { value: 'medicine', label: 'Medical Supplies & Medicines', icon: '💊' },
                    { value: 'construction_material', label: 'Construction & Shelter Material', icon: '🏗️' },
                    { value: 'agricultural_produce', label: 'Agricultural Produce / Seeds', icon: '🌾' },
                    { value: 'other', label: 'Other Essential Resource', icon: '📦' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                    Quantity
                  </label>
                  <input
                    name="quantity"
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={handleInputChange}
                    className="w-full text-sm border border-slate-200 rounded p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                    Unit
                  </label>
                  <input
                    name="unit"
                    type="text"
                    placeholder="e.g. packets, kg, litres"
                    value={form.unit}
                    onChange={handleInputChange}
                    className="w-full text-sm border border-slate-200 rounded p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                    Urgency
                  </label>
                  <CustomSelect
                    name="urgency"
                    value={form.urgency}
                    onChange={handleInputChange}
                    options={[
                      { value: 'critical', label: 'Critical (Immediate)', icon: '🚨' },
                      { value: 'high', label: 'High (Within 6-12h)', icon: '⚡' },
                      { value: 'medium', label: 'Medium (Within 24-48h)', icon: '⏳' },
                      { value: 'low', label: 'Low (Routine)', icon: '📋' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                    District
                  </label>
                  <CustomSelect
                    name="district"
                    value={form.district}
                    onChange={handleInputChange}
                    placeholder="Select District"
                    options={districts.map((d) => ({ value: d.id, label: d.name, icon: '📍' }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                  Select Location Coordinates
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    name="latitude"
                    type="number"
                    step="0.00001"
                    placeholder="Lat"
                    value={form.latitude}
                    onChange={handleInputChange}
                    className="w-1/2 text-sm border border-slate-200 rounded p-2"
                  />
                  <input
                    name="longitude"
                    type="number"
                    step="0.00001"
                    placeholder="Lon"
                    value={form.longitude}
                    onChange={handleInputChange}
                    className="w-1/2 text-sm border border-slate-200 rounded p-2"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleUseLocation}
                  className="w-full flex items-center justify-center space-x-1 py-1.5 border border-dashed border-primary-300 rounded text-xs font-bold text-primary-600 hover:bg-primary-50 transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Use My Location</span>
                </button>
                <p className="text-[10px] text-slate-400 mt-1">
                  Tip: You can also select the location by clicking anywhere on the map grid.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                  Needs Description
                </label>
                <textarea
                  name="description"
                  rows="3"
                  placeholder="Provide landmark details or specific requests (e.g. food packets for 50 people)"
                  value={form.description}
                  onChange={handleInputChange}
                  className="w-full text-sm border border-slate-200 rounded p-2"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-on-primary font-bold uppercase text-xs rounded-md shadow-md transition-all cursor-pointer disabled:opacity-50 tracking-wider mt-2"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>

        {/* middle column: Live map */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[520px]">
            <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-primary-600" />
                <span>Live Affected Road Zones & Accessibility Map</span>
              </h2>
              <div className="flex items-center space-x-3 text-xs font-semibold">
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block animate-pulse"></span>
                  <span className="text-slate-600">Disruption Zones ({hazards.length})</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 bg-orange-400 rounded-full inline-block"></span>
                  <span className="text-slate-600">Urgent Demands ({needs.length})</span>
                </span>
              </div>
            </div>

            <div className="grow relative">
              <MapContainer
                center={[24.83, 92.78]}
                zoom={10}
                className="w-full h-full"
              >
                {/* Google Maps Real-Time Road & Satellite Hybrid Base Layer */}
                <GoogleMapTileLayer defaultLayer="roadmap" />

                {/* Interactive Map Location & Area Search Bar */}
                <MapPlaceSearchControl
                  onSelectLocation={(lat, lon) => handleMapClick(lat, lon)}
                />

                {/* Real-time Color-Coded Incident Impact Area Layer */}
                <IncidentImpactZoneLayer
                  conditions={hazards}
                  previewLocation={{
                    lat: form.latitude,
                    lon: form.longitude,
                    risk_score: 0.5,
                    value: form.type,
                    condition_type: 'relief_demand',
                    radiusMeters: 800,
                  }}
                />

                <MapLocationInspector
                  conditions={hazards}
                  onLocationSelected={({ lat, lon }) => handleMapClick(lat, lon)}
                />

                {/* Open Needs Markers */}
                {needs.map((n) => {
                  const { lat, lon } = parseCoords(n);
                  if (!lat || !lon) return null;
                  return (
                    <Marker key={`need-${n.id}`} position={[lat, lon]} icon={needIcon}>
                      <Popup>
                        <div className="text-xs p-1">
                          <div className="font-bold text-orange-600 mb-1">RELIEF NEED</div>
                          <div><strong>Type:</strong> {n.type ? n.type.replace('_', ' ') : 'Relief'}</div>
                          <div><strong>Quantity:</strong> {n.quantity} {n.unit}</div>
                          <div><strong>Urgency:</strong> <span className="uppercase text-red-600 font-bold">{n.urgency}</span></div>
                          {n.description && <div className="mt-1 text-slate-600 border-t pt-1">"{n.description}"</div>}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* Real-time Incident Severity Legend */}
              <IncidentSeverityLegend totalIncidents={hazards.length} className="absolute bottom-2 right-2 shadow-md" />
            </div>
          </div>

          {/* Active Alerts Row */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2 mb-4 border-b border-slate-100 pb-2">
              <Eye className="h-5 w-5 text-primary-600" />
              <span>{t('active_alerts')}</span>
            </h2>
            {alerts.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No alerts reported in this corridor.</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {alerts.map((a) => (
                  <div
                    key={a.id}
                    className={`p-3 rounded border-l-4 text-xs font-semibold flex flex-col space-y-1 ${
                      a.severity === 'critical'
                        ? 'bg-red-50 border-red-500 text-red-800'
                        : a.severity === 'high'
                        ? 'bg-orange-50 border-orange-400 text-orange-800'
                        : 'bg-slate-50 border-slate-400 text-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="uppercase tracking-wider font-extrabold text-[10px]">
                        {a.alert_type ? a.alert_type.replace('_', ' ') : 'Alert'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(a.sent_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="font-medium">{a.message}</p>
                    {a.district_name && <p className="text-[10px] text-slate-500 font-bold">Location: {a.district_name}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
