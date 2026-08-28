import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { resourceAPI, matchAPI, districtAPI, conditionAPI } from '../api';
import { IncidentImpactZoneLayer, IncidentSeverityLegend, parseCoords } from '../components/IncidentImpactZoneLayer';
import RealtimeTelemetryBanner from '../components/RealtimeTelemetryBanner';
import { RiskLegendControl, RiskSegmentedRoute } from '../components/RiskCorridorMapLayer';
import MapPlaceSearchControl from '../components/MapPlaceSearchControl';
import GoogleMapTileLayer from '../components/GoogleMapTileLayer';
import CustomSelect from '../components/CustomSelect';
import StockCategoryBadge from '../components/StockCategoryBadge';
import { AlertCircle, CheckCircle, Package, PlusCircle, MapPin, Eye, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Fix Leaflet marker icons issue in React/Vite builds
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function NgoPortal() {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [matches, setMatches] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    type: 'food',
    quantity_available: 100,
    unit: 'packets',
    latitude: 24.83,
    longitude: 92.78,
    district: '',
  });

  const [message, setMessage] = useState({ text: '', type: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDepotData();
  }, [user?.id]);

  const fetchDepotData = async () => {
    setLoading(true);
    try {
      const [distRes, resRes, matchRes, condRes] = await Promise.allSettled([
        districtAPI.list(),
        resourceAPI.list(user?.id ? { provider: user?.id } : {}),
        matchAPI.list(),
        conditionAPI.list(),
      ]);

      if (distRes.status === 'fulfilled' && distRes.value) {
        const dData = distRes.value;
        setDistricts(dData.results || (Array.isArray(dData) ? dData : []));
      }
      if (resRes.status === 'fulfilled' && resRes.value) {
        const rData = resRes.value;
        const allResources = rData.results || (Array.isArray(rData) ? rData : []);
        const userResources = allResources.filter(
          (r) => r.provider === user?.id || r.provider_username === user?.username || !user
        );
        setResources(userResources.length > 0 ? userResources : allResources);
      }
      if (matchRes.status === 'fulfilled' && matchRes.value) {
        const mData = matchRes.value;
        const allMatches = mData.results || (Array.isArray(mData) ? mData : []);
        const ngoMatches = allMatches.filter(
          (m) =>
            m.resource_details?.provider === user?.id ||
            m.resource_details?.provider_username === user?.username ||
            m.resource_provider === user?.username ||
            allMatches.length > 0
        );
        setMatches(ngoMatches);
      }
      if (condRes.status === 'fulfilled' && condRes.value) {
        const cData = condRes.value;
        setConditions(cData.results || (Array.isArray(cData) ? cData : []));
      }
    } catch (err) {
      console.error('Error loading NGO data', err);
    } finally {
      setLoading(false);
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

  const handleSubmitResource = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ text: '', type: '' });
    try {
      const payload = {
        ...form,
        quantity_available: parseInt(form.quantity_available, 10),
        district: form.district ? parseInt(form.district, 10) : null,
      };

      const newResource = await resourceAPI.create(payload);
      setResources([newResource, ...resources]);
      setMessage({ text: 'Stockpile resource registered successfully.', type: 'success' });
      setForm({
        type: 'food',
        quantity_available: 100,
        unit: 'packets',
        latitude: 24.83,
        longitude: 92.78,
        district: '',
      });
    } catch (err) {
      setMessage({ text: 'Failed to register resource stockpile.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center space-x-2">
              <Package className="h-6 w-6 text-primary-600" />
              <span>Relief Depot & NGO Console</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Register emergency supplies, list depot inventories, and inspect pending allocation requests.
            </p>
          </div>
          <div>
            {user?.is_verified ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                Verified Relief Agency
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                Pending Admin Verification
              </span>
            )}
          </div>
        </div>
      </div>

      {!user?.is_verified && (
        <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md text-amber-800 text-sm flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold">Account Pending District Administrator Verification</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Your NGO registration has been received. Stockpiles registered while pending verification will be flagged as unverified in the matching ranker until an administrator approves your agency credentials.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* left column: inventory register */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2 mb-4 border-b border-slate-100 pb-2">
              <PlusCircle className="h-5 w-5 text-primary-600" />
              <span>Register Stockpile</span>
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

            <form onSubmit={handleSubmitResource} className="space-y-4">
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
                    Quantity Available
                  </label>
                  <input
                    name="quantity_available"
                    type="number"
                    min="1"
                    value={form.quantity_available}
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
                    required
                    placeholder="e.g. units, kg"
                    value={form.unit}
                    onChange={handleInputChange}
                    className="w-full text-sm border border-slate-200 rounded p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                  District Location
                </label>
                <CustomSelect
                  name="district"
                  value={form.district}
                  onChange={handleInputChange}
                  placeholder="Select District"
                  options={districts.map((d) => ({ value: d.id, label: d.name, icon: '📍' }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                  Location (Click Map below to set)
                </label>
                <div className="flex space-x-2">
                  <input
                    name="latitude"
                    type="number"
                    step="0.00001"
                    value={form.latitude}
                    onChange={handleInputChange}
                    className="w-1/2 text-sm border border-slate-200 rounded p-2"
                  />
                  <input
                    name="longitude"
                    type="number"
                    step="0.00001"
                    value={form.longitude}
                    onChange={handleInputChange}
                    className="w-1/2 text-sm border border-slate-200 rounded p-2"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-on-primary font-bold uppercase text-xs rounded-md shadow-md transition-all cursor-pointer disabled:opacity-50 tracking-wider mt-2"
              >
                {submitting ? 'Registering...' : 'Register Stockpile'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden h-[300px] relative">
            <MapContainer center={[24.83, 92.78]} zoom={10} className="w-full h-full">
              {/* Google Maps Real-Time Road & Satellite Hybrid Base Layer */}
              <GoogleMapTileLayer defaultLayer="roadmap" />

              {/* Interactive Area / Location Search Bar */}
              <MapPlaceSearchControl
                onSelectLocation={(lat, lon) =>
                  setForm((prev) => ({
                    ...prev,
                    latitude: parseFloat(lat.toFixed(5)),
                    longitude: parseFloat(lon.toFixed(5)),
                  }))
                }
              />

              {/* Real-time Color-Coded Incident Impact Area Layer */}
              <IncidentImpactZoneLayer conditions={conditions} />

              <MapClickHandler onMapClick={handleMapClick} />

              {/* Target Depot Placement Marker */}
              <Marker position={[form.latitude, form.longitude]}>
                <Popup>
                  <div className="text-xs p-1 font-bold text-slate-800">
                    📍 Target New Depot Placement ({form.latitude}, {form.longitude})
                  </div>
                </Popup>
              </Marker>

              {/* Existing NGO Depot Stockpiles */}
              {resources.map((r) => {
                const { lat, lon } = parseCoords(r);
                if (!lat || !lon) return null;
                return (
                  <Marker key={`depot-${r.id}`} position={[lat, lon]}>
                    <Popup>
                      <div className="text-xs p-1">
                        <div className="font-extrabold text-slate-900">📦 {r.type.replace('_', ' ').toUpperCase()} DEPOT</div>
                        <div className="text-slate-600">Stockpile: {r.quantity_available} {r.unit}</div>
                        <div className="text-slate-500 font-semibold mt-0.5">District: {r.district_name || 'General'}</div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* 3-Tier Corridor Risk Divisions Legend */}
            <RiskLegendControl compact={true} className="absolute bottom-2 right-2 shadow-md" />
          </div>
        </div>

        {/* middle/right column: current stockpiles and proposed allocations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stockpiles List */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2 mb-4 border-b border-slate-100 pb-2">
              <Package className="h-5 w-5 text-primary-600" />
              <span>Registered Stockpiles ({resources.length})</span>
            </h2>

            {loading ? (
              <p className="text-xs text-slate-400 italic">Loading supplies...</p>
            ) : resources.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No stockpiles registered yet for your depot account.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
                  <thead className="bg-slate-50 font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Resource Type</th>
                      <th className="px-4 py-3">Quantity</th>
                      <th className="px-4 py-3">District</th>
                      <th className="px-4 py-3">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {resources.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-400 font-mono">#{r.id}</td>
                        <td className="px-4 py-3">
                          <StockCategoryBadge type={r.type} size="sm" showLabel={true} />
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{r.quantity_available} {r.unit}</td>
                        <td className="px-4 py-3">{r.district_name || 'General'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                              r.verification_status === 'approved' || r.verification_status === 'verified_org'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : r.verification_status === 'debarred'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                r.verification_status === 'approved' || r.verification_status === 'verified_org'
                                  ? 'bg-emerald-600'
                                  : r.verification_status === 'debarred'
                                  ? 'bg-rose-600'
                                  : 'bg-amber-600'
                              }`}
                            ></span>
                            <span>
                              {r.verification_status === 'approved' || r.verification_status === 'verified_org'
                                ? 'Approved & Active'
                                : r.verification_status === 'debarred'
                                ? 'Debarred by Admin'
                                : 'Pending Approval'}
                            </span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Allocation Matches Watcher */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2 mb-4 border-b border-slate-100 pb-2">
              <Star className="h-5 w-5 text-primary-600" />
              <span>Proposed Allocations & Matches ({matches.length})</span>
            </h2>

            {loading ? (
              <p className="text-xs text-slate-400 italic">Loading proposals...</p>
            ) : matches.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No relief allocations or matching recommendations currently proposed.</p>
            ) : (
              <div className="space-y-4">
                {matches.map((m) => (
                  <div key={m.id} className="p-4 rounded-md border border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs font-semibold text-slate-700 shadow-sm">
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">
                          MATCH PROPOSAL #{m.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            m.status === 'confirmed'
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {m.status || 'Proposed'}
                        </span>
                      </div>
                      <div>
                        <strong>Resource Sent:</strong> {m.resource_details?.quantity_available} {m.resource_details?.unit} of{' '}
                        <span className="uppercase text-slate-900 font-bold">{m.need_details?.type ? m.need_details.type.replace('_', ' ') : 'Supplies'}</span>
                      </div>
                      <div>
                        <strong>Relief Target Need:</strong> #{m.need_details?.id} in {m.need_details?.district_name || 'Unknown'} (Urgency: {m.need_details?.urgency || 'Normal'})
                      </div>
                    </div>
                    <div className="mt-3 sm:mt-0 text-left sm:text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scoring Fit</div>
                      <div className="text-lg font-black text-primary-600">{Math.round((m.score || 0) * 100)}%</div>
                      <div className="text-[10px] text-slate-500 font-bold">Proximity distance: {m.score_breakdown?.distance_km ?? '—'} km</div>
                    </div>
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
