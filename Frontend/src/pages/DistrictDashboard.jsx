import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { dashboardAPI, needAPI, vehicleAPI, matchAPI, boundaryAPI, authAPI, resourceAPI, conditionAPI } from '../api';
import { IncidentImpactZoneLayer, IncidentSeverityLegend } from '../components/IncidentImpactZoneLayer';
import RealtimeTelemetryBanner from '../components/RealtimeTelemetryBanner';
import { RiskCorridorMapLayer, RiskLegendControl, RiskSegmentedRoute, LiveGpsSimulationMapLayer } from '../components/RiskCorridorMapLayer';
import LiveGpsTrackerSimulation from '../components/LiveGpsTrackerSimulation';
import MapLocationInspector from '../components/MapLocationInspector';
import MapPlaceSearchControl from '../components/MapPlaceSearchControl';
import GoogleMapTileLayer from '../components/GoogleMapTileLayer';
import CustomSelect from '../components/CustomSelect';
import DistrictAdminNotificationFeed from '../components/DistrictAdminNotificationFeed';
import StockCategoryBadge from '../components/StockCategoryBadge';
import AiRiskAnalyzer from '../components/AiRiskAnalyzer';
import {
  Activity,
  Building,
  Truck,
  Users,
  UserPlus,
  ShieldCheck,
  Package,
  Globe,
  PlusCircle,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Heart,
  Cpu,
} from 'lucide-react';
import L from 'leaflet';

export default function DistrictDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const [overview, setOverview] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [openNeeds, setOpenNeeds] = useState([]);
  const [selectedNeed, setSelectedNeed] = useState(null);
  const [matches, setMatches] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [loading, setLoading] = useState(false);
  const [matchingLoading, setMatchingLoading] = useState(false);

  // Live GPS Simulation state
  const [simulationState, setSimulationState] = useState(null);

  // Directory state lists
  const [ngoList, setNgoList] = useState([]);
  const [transporterList, setTransporterList] = useState([]);
  const [allVehiclesList, setAllVehiclesList] = useState([]);
  const [fieldOfficerList, setFieldOfficerList] = useState([]);
  const [resourceList, setResourceList] = useState([]);

  // Boundary & border analysis state
  const [syncStatus, setSyncStatus] = useState('');
  const [borderCheckpoints, setBorderCheckpoints] = useState([]);
  const [routeAnalysisCoords, setRouteAnalysisCoords] = useState('');
  const [routeAnalysisResult, setRouteAnalysisResult] = useState(null);
  const [parsedRouteCoords, setParsedRouteCoords] = useState([]);
  const [checkingRoute, setCheckingRoute] = useState(false);
  const [conditions, setConditions] = useState([]);

  // Shared alert status
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [stockFilter, setStockFilter] = useState('all');

  const handleApproveResource = async (id) => {
    // 1. Instant optimistic real-time UI state update
    setResourceList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, verification_status: 'approved' } : r))
    );
    setStatusMsg({ text: `Stockpile #${id} approved & verified for active distribution.`, type: 'success' });

    try {
      await resourceAPI.approve(id);
      // Background sync
      fetchDashboardData();
      fetchAdminListData();
    } catch (err) {
      console.error('Failed to approve resource', err);
    }
  };

  const handleDebarResource = async (id, passedReason) => {
    const reason = passedReason || window.prompt('Specify reason for debarring this stockpile:', 'Compliance standard check failed');
    if (reason === null) return;

    // 1. Instant optimistic real-time UI state update
    setResourceList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, verification_status: 'debarred', debar_reason: reason } : r))
    );
    setStatusMsg({ text: `Stockpile #${id} debarred (${reason}).`, type: 'info' });

    try {
      await resourceAPI.debar(id, reason);
      // Background sync
      fetchDashboardData();
      fetchAdminListData();
    } catch (err) {
      console.error('Failed to debar resource', err);
    }
  };

  // Provision Transporter Form State
  const [transporterForm, setTransporterForm] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    district_id: '',
  });
  const [transporterMsg, setTransporterMsg] = useState({ text: '', type: '' });
  const [addingTransporter, setAddingTransporter] = useState(false);
  const [showAddTransporterModal, setShowAddTransporterModal] = useState(false);

  // Provision Field Officer Form State
  const [officerForm, setOfficerForm] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    district_id: '',
  });
  const [officerMsg, setOfficerMsg] = useState({ text: '', type: '' });
  const [addingOfficer, setAddingOfficer] = useState(false);
  const [showAddOfficerModal, setShowAddOfficerModal] = useState(false);

  // Admin Add Vehicle Form State
  const [vehicleForm, setVehicleForm] = useState({
    registration_number: '',
    vehicle_type: '5-Ton Truck',
    operator_id: '',
  });
  const [vehicleCreateMsg, setVehicleCreateMsg] = useState({ text: '', type: '' });
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchAdminListData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [summaryRes, needsRes, vehiclesRes, bordersRes, conditionsRes] = await Promise.allSettled([
        dashboardAPI.getSummary(),
        needAPI.list({ status: 'open' }),
        vehicleAPI.list({ status: 'idle' }),
        boundaryAPI.getNerBorders(),
        conditionAPI.list(),
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        setOverview(summaryRes.value.overview || summaryRes.value);
        setDistricts(summaryRes.value.districts || []);
      }

      if (needsRes.status === 'fulfilled' && needsRes.value) {
        const nData = needsRes.value;
        setOpenNeeds(nData.results || (Array.isArray(nData) ? nData : []));
      }

      if (vehiclesRes.status === 'fulfilled' && vehiclesRes.value) {
        const vData = vehiclesRes.value;
        setVehicles(vData.results || (Array.isArray(vData) ? vData : []));
      }

      if (bordersRes.status === 'fulfilled' && bordersRes.value) {
        const bData = bordersRes.value;
        setBorderCheckpoints(bData.checkpoints || (Array.isArray(bData) ? bData : []));
      }

      if (conditionsRes.status === 'fulfilled' && conditionsRes.value) {
        const cData = conditionsRes.value;
        setConditions(cData.results || (Array.isArray(cData) ? cData : []));
      }
    } catch (err) {
      console.error('Error fetching command summary', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminListData = async () => {
    try {
      const [ngosRes, transportersRes, officersRes, vAllRes, rListRes] = await Promise.allSettled([
        authAPI.getUsers({ role: 'ngo' }),
        authAPI.getUsers({ role: 'transport_operator' }),
        authAPI.getUsers({ role: 'field_officer' }),
        vehicleAPI.list(),
        resourceAPI.list(),
      ]);

      if (ngosRes.status === 'fulfilled' && ngosRes.value) {
        const ngos = ngosRes.value;
        setNgoList(ngos.results || (Array.isArray(ngos) ? ngos : []));
      }
      if (transportersRes.status === 'fulfilled' && transportersRes.value) {
        const t = transportersRes.value;
        setTransporterList(t.results || (Array.isArray(t) ? t : []));
      }
      if (officersRes.status === 'fulfilled' && officersRes.value) {
        const o = officersRes.value;
        setFieldOfficerList(o.results || (Array.isArray(o) ? o : []));
      }
      if (vAllRes.status === 'fulfilled' && vAllRes.value) {
        const v = vAllRes.value;
        setAllVehiclesList(v.results || (Array.isArray(v) ? v : []));
      }
      if (rListRes.status === 'fulfilled' && rListRes.value) {
        const r = rListRes.value;
        setResourceList(r.results || (Array.isArray(r) ? r : []));
      }
    } catch (err) {
      console.error('Error fetching admin directory data', err);
    }
  };

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  const handleVerifyNgo = async (userId, newStatus) => {
    try {
      await authAPI.verifyUser(userId, newStatus);
      fetchAdminListData();
    } catch (err) {
      alert('Failed to update verification status.');
    }
  };

  const handleCreateTransporter = async (e) => {
    e.preventDefault();
    if (!transporterForm.username || !transporterForm.password) {
      setTransporterMsg({ text: 'Username and password are required.', type: 'error' });
      return;
    }
    setAddingTransporter(true);
    setTransporterMsg({ text: '', type: '' });
    try {
      const payload = {
        ...transporterForm,
        role: 'transport_operator',
        district_id: transporterForm.district_id ? parseInt(transporterForm.district_id, 10) : null,
      };
      await authAPI.adminCreateUser(payload);
      setTransporterMsg({ text: `Transporter Operator '${transporterForm.username}' registered successfully.`, type: 'success' });
      setTransporterForm({
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        district_id: '',
      });
      fetchAdminListData();
      setTimeout(() => setShowAddTransporterModal(false), 1200);
    } catch (err) {
      setTransporterMsg({
        text: Object.values(err.response?.data || {}).flat().join(' ') || 'Failed to create transporter account.',
        type: 'error',
      });
    } finally {
      setAddingTransporter(false);
    }
  };

  const handleCreateOfficer = async (e) => {
    e.preventDefault();
    if (!officerForm.username || !officerForm.password) {
      setOfficerMsg({ text: 'Username and password are required.', type: 'error' });
      return;
    }
    setAddingOfficer(true);
    setOfficerMsg({ text: '', type: '' });
    try {
      const payload = {
        ...officerForm,
        role: 'field_officer',
        district_id: officerForm.district_id ? parseInt(officerForm.district_id, 10) : null,
      };
      await authAPI.adminCreateUser(payload);
      setOfficerMsg({ text: `Field Officer '${officerForm.username}' provisioned successfully.`, type: 'success' });
      setOfficerForm({
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        district_id: '',
      });
      fetchAdminListData();
      setTimeout(() => setShowAddOfficerModal(false), 1200);
    } catch (err) {
      setOfficerMsg({
        text: Object.values(err.response?.data || {}).flat().join(' ') || 'Failed to create field officer account.',
        type: 'error',
      });
    } finally {
      setAddingOfficer(false);
    }
  };

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    if (!vehicleForm.registration_number) {
      setVehicleCreateMsg({ text: 'Registration number is required.', type: 'error' });
      return;
    }
    setAddingVehicle(true);
    setVehicleCreateMsg({ text: '', type: '' });
    try {
      const payload = {
        registration_number: vehicleForm.registration_number,
        vehicle_type: vehicleForm.vehicle_type,
        operator: vehicleForm.operator_id ? parseInt(vehicleForm.operator_id, 10) : null,
        status: 'idle',
        latitude: 24.83,
        longitude: 92.78,
      };
      await vehicleAPI.create(payload);
      setVehicleCreateMsg({ text: `Fleet Vehicle '${vehicleForm.registration_number}' added successfully.`, type: 'success' });
      setVehicleForm({
        registration_number: '',
        vehicle_type: '5-Ton Truck',
        operator_id: '',
      });
      fetchAdminListData();
      fetchDashboardData();
      setTimeout(() => setShowAddVehicleModal(false), 1200);
    } catch (err) {
      setVehicleCreateMsg({ text: 'Failed to add vehicle. Registration number must be unique.', type: 'error' });
    } finally {
      setAddingVehicle(false);
    }
  };

  const handleFetchMatches = async (needId) => {
    setMatchingLoading(true);
    setMatches([]);
    const foundNeed = openNeeds.find((n) => n.id === needId);
    setSelectedNeed(foundNeed);
    try {
      const res = await needAPI.getMatches(needId);
      setMatches(res.matches || []);
    } catch (err) {
      console.error('Failed to trigger matching score loop', err);
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleConfirmMatch = async (matchId) => {
    if (!selectedVehicle) {
      setStatusMsg({ text: 'Please assign a vehicle for transit dispatch.', type: 'error' });
      return;
    }
    setStatusMsg({ text: '', type: '' });
    try {
      await matchAPI.confirm(matchId, parseInt(selectedVehicle, 10));
      setStatusMsg({ text: 'Match confirmed. Route dispatched to vehicle operator.', type: 'success' });
      setSelectedNeed(null);
      setMatches([]);
      setSelectedVehicle('');
      fetchDashboardData();
    } catch (err) {
      setStatusMsg({ text: 'Failed to allocate match resources.', type: 'error' });
    }
  };

  const handleSyncBoundaries = async () => {
    setSyncStatus('Synchronizing state boundaries...');
    try {
      await boundaryAPI.syncBoundaries();
      setSyncStatus('State boundary polygons pre-seeded successfully.');
      fetchDashboardData();
    } catch (err) {
      setSyncStatus('Synchronization failed.');
    }
  };

  const handleAnalyzeRoute = async (e) => {
    e.preventDefault();
    if (!routeAnalysisCoords) return;
    setCheckingRoute(true);
    setRouteAnalysisResult(null);
    try {
      const points = routeAnalysisCoords
        .split('\n')
        .map((line) => {
          const parts = line.split(',');
          if (parts.length >= 2) {
            return { lat: parseFloat(parts[0].trim()), lon: parseFloat(parts[1].trim()) };
          }
          return null;
        })
        .filter((p) => p !== null);

      if (points.length === 0) {
        alert('Invalid coordinates format');
        setCheckingRoute(false);
        return;
      }

      setParsedRouteCoords(points.map((p) => [p.lat, p.lon]));
      const res = await boundaryAPI.analyzeRoute(points);
      setRouteAnalysisResult(res);
    } catch (err) {
      console.error('Border Analysis failed', err);
    } finally {
      setCheckingRoute(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 gap-5 pb-10 pt-3">
      {/* Sleek Header & Segmented Controller Navbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>District Command Control</span>
            <span className="inline-flex items-center text-emerald-700 bg-emerald-50 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              LIVE ACTIVE
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            North-Eastern Region Real-time Strategic Telemetry & Operations
          </p>
        </div>

        <div className="flex items-center gap-2 w-fit">
          {/* Real-time Operation Alerts & Verification Feed */}
          <DistrictAdminNotificationFeed
            onApproveStock={handleApproveResource}
            onDebarStock={handleDebarResource}
            onRefreshData={() => {
              fetchDashboardData();
              fetchAdminListData();
            }}
          />

          {/* Refresh Action */}
          <button
            onClick={() => {
              fetchDashboardData();
              fetchAdminListData();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Segmented Controller Tab Strip */}
      <div className="bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 flex items-center space-x-1 text-xs overflow-x-auto">
        <button
          onClick={() => handleTabChange('overview')}
          className={`font-semibold text-xs py-1.5 px-3.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-white text-slate-900 shadow-sm font-bold border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-slate-700" />
          <span>Command Overview</span>
        </button>

        <button
          onClick={() => handleTabChange('ai_risk')}
          className={`font-semibold text-xs py-1.5 px-3.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'ai_risk'
              ? 'bg-white text-slate-900 shadow-sm font-bold border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-primary-600" />
          <span>AI Risk Analyzer</span>
          <span className="bg-primary-100 text-primary-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
            ML
          </span>
        </button>

        <button
          onClick={() => handleTabChange('ngos')}
          className={`font-semibold text-xs py-1.5 px-3.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'ngos'
              ? 'bg-white text-slate-900 shadow-sm font-bold border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Building className="w-3.5 h-3.5 text-slate-700" />
          <span>Registered NGOs</span>
          <span className="bg-slate-200/70 text-slate-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
            {ngoList.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('transporters')}
          className={`font-semibold text-xs py-1.5 px-3.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'transporters'
              ? 'bg-white text-slate-900 shadow-sm font-bold border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Truck className="w-3.5 h-3.5 text-slate-700" />
          <span>Transporters</span>
          <span className="bg-slate-200/70 text-slate-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
            {transporterList.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('vehicles')}
          className={`font-semibold text-xs py-1.5 px-3.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'vehicles'
              ? 'bg-white text-slate-900 shadow-sm font-bold border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Package className="w-3.5 h-3.5 text-slate-700" />
          <span>Fleet Vehicles</span>
          <span className="bg-slate-200/70 text-slate-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
            {allVehiclesList.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('officers')}
          className={`font-semibold text-xs py-1.5 px-3.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'officers'
              ? 'bg-white text-slate-900 shadow-sm font-bold border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-slate-700" />
          <span>Field Officers</span>
          <span className="bg-slate-200/70 text-slate-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
            {fieldOfficerList.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('stock')}
          className={`font-semibold text-xs py-1.5 px-3.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'stock'
              ? 'bg-white text-slate-900 shadow-sm font-bold border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
          <span>Stockpile Verification Hub</span>
          <span
            className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              resourceList.some((r) => r.verification_status === 'pending' || !r.verification_status)
                ? 'bg-amber-500 text-slate-950 animate-pulse'
                : 'bg-slate-200/70 text-slate-700'
            }`}
          >
            {resourceList.length}
          </span>
        </button>
      </div>

      {/* VIEW 1: COMMAND OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-5">
          {/* Compact Stat Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:shadow transition-all relative overflow-hidden">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Fleets</span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">
                  {vehicles.length || overview?.total_available_resources || 34}
                </span>
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />+12%
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-1">Ready Dispatch Units</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:shadow transition-all relative overflow-hidden">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Relief Demands</span>
                <div className="w-7 h-7 rounded-lg bg-red-50 text-red-700 flex items-center justify-center">
                  <Heart className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">
                  {overview?.total_open_needs ?? openNeeds.length}
                </span>
                <span className="text-xs font-semibold text-red-600 flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" />
                  {overview?.total_critical_needs || 0} Urgent
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-1">Open Field Requests</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:shadow transition-all relative overflow-hidden">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Stockpile Units</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">
                  {overview?.total_available_resources ? (overview.total_available_resources * 125).toLocaleString() : '8,450'}
                </span>
                <span className="text-[11px] font-bold text-slate-500 uppercase">Units</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-1">Verified Inventory</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm hover:shadow transition-all relative overflow-hidden">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Available NGOs</span>
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">{ngoList.length || 27}</span>
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
                  <CheckCircle className="w-3 h-3" />Ready
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-1">Relief Agencies</div>
            </div>
          </div>

          {/* Main Grid Layout: GIS Map & AI Matcher vs Stress Index & Log */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 8 Columns */}
            <div className="lg:col-span-8 flex flex-col gap-5">
              {/* Live Real-time Telemetry Banner */}
              <RealtimeTelemetryBanner
                conditions={conditions}
                districtName="NER Strategic Command"
                onRefresh={fetchDashboardData}
              />

              {/* Tactical GIS Map Box */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col h-[460px]">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-slate-700" />
                      <span>Live Affected Impact Zone & Tactical GIS Map</span>
                    </h2>
                    <p className="text-[11px] text-slate-500">Real-time color-marked incident zones & border checkpoints</p>
                  </div>
                  <button
                    onClick={handleSyncBoundaries}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-md transition-colors"
                  >
                    Sync Borders
                  </button>
                </div>

                {syncStatus && <p className="text-xs text-slate-700 font-semibold mb-2">{syncStatus}</p>}

                <div className="w-full flex-1 rounded-lg overflow-hidden border border-slate-200/80 relative">
                  <MapContainer center={[24.83, 92.78]} zoom={8} className="w-full h-full">
                    {/* Google Maps Real-Time Road & Satellite Hybrid Base Layer */}
                    <GoogleMapTileLayer defaultLayer="roadmap" />

                    {/* Quick Interactive Map Search Control for Areas, Towns & Districts */}
                    <MapPlaceSearchControl />

                    {/* Real-time Color-Coded Incident Impact Area Layer */}
                    <IncidentImpactZoneLayer conditions={conditions} />

                    {/* Interactive Real-Time Map Location & AI Hazard Inspector */}
                    <MapLocationInspector conditions={conditions} />

                    {/* Live GPS Telemetry Convoy & Reroute Simulation Layer */}
                    <LiveGpsSimulationMapLayer simulationState={simulationState} />

                    {/* Audited Route Paths if present */}
                    {parsedRouteCoords.length >= 2 && (
                      <RiskSegmentedRoute
                        routeCoordinates={parsedRouteCoords}
                        conditions={conditions}
                        riskScore={routeAnalysisResult?.crosses_border_buffer ? 0.78 : 0.22}
                        label="Audited Border Route"
                        statusText={routeAnalysisResult?.requires_ilp ? 'Requires ILP Clearance' : 'Standard Border Route'}
                      />
                    )}

                    {borderCheckpoints.map((cp, idx) => (
                      <Marker key={`cp-${idx}`} position={[cp.latitude || 25.18, cp.longitude || 92.02]}>
                        <Popup>
                          <div className="text-xs p-1">
                            <div className="font-bold text-slate-900">{cp.name}</div>
                            <div>
                              <strong>Type:</strong> {cp.type} checkpoint
                            </div>
                            {cp.state && (
                              <div>
                                <strong>State:</strong> {cp.state}
                              </div>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    ))}

                    {districts.map((d) => {
                      if (!d.centroid) return null;
                      const isCritical = d.connectivity_status === 'severe_bottleneck';
                      const isModerate = d.connectivity_status === 'moderate_stress';
                      const color = isCritical ? '#DC2626' : isModerate ? '#F59E0B' : '#10B981';
                      return (
                        <Marker
                          key={`centroid-${d.district_id}`}
                          position={[d.centroid.latitude, d.centroid.longitude]}
                          icon={
                            new L.DivIcon({
                              className: 'custom-div-icon',
                              html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3)"></div>`,
                              iconSize: [14, 14],
                              iconAnchor: [7, 7],
                            })
                          }
                        >
                          <Popup>
                            <div className="text-xs p-1">
                              <div className="font-bold text-slate-900">
                                {d.name} ({d.state})
                              </div>
                              <div>
                                <strong>Bottleneck Index:</strong> {d.bottleneck_index}
                              </div>
                              <div>
                                <strong>Status:</strong> {d.connectivity_status ? d.connectivity_status.replace('_', ' ') : 'Normal'}
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>

                  {/* Real-Time Incident Severity Legend */}
                  <IncidentSeverityLegend totalIncidents={conditions.length} className="absolute bottom-3 right-3 shadow-xl" />
                </div>
              </div>

              {/* Live GPS Convoy Telemetry, AI Route Hazard Scanner & Auto-Reroute Simulation Engine */}
              <LiveGpsTrackerSimulation onUpdateSimulationState={setSimulationState} />

              {/* AI Matcher & Dispatcher */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-slate-700" />
                      <span>AI Demand-Supply Matcher</span>
                    </h2>
                    <p className="text-[11px] text-slate-500">Multi-criteria priority matching for optimal relief dispatch</p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    System Active
                  </span>
                </div>

                {statusMsg.text && (
                  <div
                    className={`p-2.5 rounded-md text-xs mb-3 font-semibold ${
                      statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {statusMsg.text}
                  </div>
                )}

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Select Relief Demand (Priority Ordered Queue):
                    </label>
                    <div className="flex items-center gap-2 text-[10px] font-bold">
                      <span className="flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span> Critical
                      </span>
                      <span className="flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> High
                      </span>
                      <span className="flex items-center gap-1 text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Medium
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {openNeeds.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No open demands queued for matching.</p>
                    ) : (
                      [...openNeeds]
                        .sort((a, b) => {
                          const urgencyRank = { critical: 1, urgent: 1, high: 2, medium: 3, low: 4 };
                          const rA = urgencyRank[a.urgency?.toLowerCase()] || 3;
                          const rB = urgencyRank[b.urgency?.toLowerCase()] || 3;
                          return rA - rB;
                        })
                        .map((n) => {
                          const isSelected = selectedNeed?.id === n.id;
                          const urgency = (n.urgency || 'medium').toLowerCase();

                          let badgeStyle = 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100';
                          let priorityTag = 'MED';
                          let tagBg = 'bg-blue-600 text-white';

                          if (urgency === 'critical' || urgency === 'urgent') {
                            badgeStyle = isSelected
                              ? 'bg-red-600 text-white border-red-700 shadow-sm font-bold ring-2 ring-red-300'
                              : 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100 font-bold';
                            priorityTag = 'CRITICAL';
                            tagBg = 'bg-red-600 text-white animate-pulse';
                          } else if (urgency === 'high') {
                            badgeStyle = isSelected
                              ? 'bg-amber-600 text-white border-amber-700 shadow-sm font-bold'
                              : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 font-semibold';
                            priorityTag = 'HIGH';
                            tagBg = 'bg-amber-600 text-white';
                          } else if (urgency === 'low') {
                            badgeStyle = isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm font-bold'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 font-medium';
                            priorityTag = 'LOW';
                            tagBg = 'bg-slate-400 text-white';
                          } else {
                            badgeStyle = isSelected
                              ? 'bg-blue-600 text-white border-blue-700 shadow-sm font-bold'
                              : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100 font-semibold';
                          }

                          return (
                            <button
                              key={n.id}
                              onClick={() => handleFetchMatches(n.id)}
                              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 ${badgeStyle}`}
                            >
                              <span className="uppercase font-bold">{n.type ? n.type.replace('_', ' ') : 'RESOURCE'}</span>
                              <span className="opacity-90">({n.quantity} {n.unit})</span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${tagBg}`}>
                                {priorityTag}
                              </span>
                            </button>
                          );
                        })
                    )}
                  </div>
                </div>

                {matchingLoading ? (
                  <p className="text-xs text-slate-500 italic text-center py-3">Calculating AI fit score...</p>
                ) : matches.length > 0 ? (
                  <div className="space-y-2">
                    {matches.map((m) => (
                      <div key={m.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                        <div>
                          <span className="font-bold text-slate-900">{m.resource_details?.provider_username || `Supplier #${m.resource}`}</span>
                          <span className="ml-2 text-slate-500">Qty: {m.resource_details?.quantity_available} {m.resource_details?.unit}</span>
                          <span className="ml-2 text-slate-500">Proximity: {m.score_breakdown?.distance_km} km</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{Math.round(m.score * 100)}% Fit</span>
                          <div className="w-44">
                            <CustomSelect
                              value={selectedVehicle}
                              onChange={(e) => setSelectedVehicle(e.target.value)}
                              placeholder="Assign Vehicle..."
                              options={vehicles.map((v) => ({
                                value: v.id,
                                label: `${v.registration_number} (${v.vehicle_type})`,
                                icon: '🚚',
                              }))}
                            />
                          </div>
                          <button
                            onClick={() => handleConfirmMatch(m.id)}
                            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-md shadow-sm transition-colors"
                          >
                            Deploy
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : selectedNeed ? (
                  <p className="text-xs text-slate-400 italic text-center py-3">No matching candidates in stockpiles.</p>
                ) : null}
              </div>
            </div>

            {/* Right 4 Columns */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              {/* District Stress Index */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                <h2 className="text-sm font-extrabold text-slate-900 mb-2">District Stress Index</h2>
                <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto pr-1">
                  {districts.map((d) => {
                    const isCritical = d.connectivity_status === 'severe_bottleneck';
                    const isModerate = d.connectivity_status === 'moderate_stress';
                    return (
                      <div
                        key={d.district_id}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                          isCritical ? 'bg-red-50/70 border-red-200 text-red-900' : isModerate ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        }`}
                      >
                        <div>
                          <span className="font-bold">{d.name}</span>
                          <span className="block text-[10px] opacity-80">Needs: {d.needs.open} | Index: {d.bottleneck_index}</span>
                        </div>
                        <span className={`w-2.5 h-2.5 rounded-full ${isCritical ? 'bg-red-600 animate-pulse' : isModerate ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Operational Log */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex-1 flex flex-col min-h-[220px]">
                <h2 className="text-sm font-extrabold text-slate-900 mb-2">Live Operational Log</h2>
                <div className="flex-1 overflow-y-auto space-y-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">14:28 UTC • Field Officer (Cachar)</div>
                    <div className="text-slate-700 mt-0.5">Water levels rising at Silchar bridge. Requesting sandbag shipment.</div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">14:15 UTC • Logistics Operator</div>
                    <div className="text-slate-700 mt-0.5">Medical kit drop completed at Sector 4 camp.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Border Corridor Analyzer */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5 mb-2">
              <Globe className="w-4 h-4 text-slate-700" />
              <span>Border Corridor Permit & Geofence Analyzer</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <form onSubmit={handleAnalyzeRoute} className="space-y-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Waypoints (Lat, Lon per line)
                  </label>
                  <textarea
                    rows="3"
                    placeholder="26.14, 91.73&#10;25.18, 92.02"
                    value={routeAnalysisCoords}
                    onChange={(e) => setRouteAnalysisCoords(e.target.value)}
                    className="w-full text-xs font-mono border border-slate-200 rounded-md p-2 bg-slate-50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={checkingRoute}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-md shadow-sm transition-colors"
                >
                  {checkingRoute ? 'Analyzing...' : 'Run Border Crossings Audit'}
                </button>
              </form>

              <div>
                {routeAnalysisResult ? (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                    <div><strong>Border Buffer Crossings:</strong> {routeAnalysisResult.crosses_border_buffer ? '⚠️ YES' : '✅ NO'}</div>
                    <div><strong>Requires Inner Line Permit (ILP):</strong> {routeAnalysisResult.requires_ilp ? '⚠️ YES' : '✅ NO'}</div>
                    <div><strong>Checkpoints Detected:</strong> {routeAnalysisResult.checkpoint_crossings || 0}</div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-6 border border-dashed border-slate-200 rounded-lg">
                    Input route waypoints to audit state border crossings.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: REGISTERED NGOS */}
      {activeTab === 'ngos' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-slate-700" />
                <span>Registered NGOs & Relief Depots</span>
              </h2>
              <p className="text-xs text-slate-500">
                Verified non-profit organizations, disaster relief depots, and verified stockpiles.
              </p>
            </div>
            <span className="bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold px-3 py-1 rounded-full">
              {ngoList.length} Active Organizations
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200/60">
                <tr>
                  <th className="p-3">Organization / Username</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Duty District</th>
                  <th className="p-3 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ngoList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-slate-400 italic">
                      No registered NGOs found in system.
                    </td>
                  </tr>
                ) : (
                  ngoList.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-bold text-slate-900">@{n.username}</td>
                      <td className="p-3 text-slate-700">{n.first_name || n.last_name ? `${n.first_name} ${n.last_name}` : 'N/A'}</td>
                      <td className="p-3 font-mono text-slate-600">{n.email || 'N/A'}</td>
                      <td className="p-3 font-mono text-slate-600">{n.phone_number || 'N/A'}</td>
                      <td className="p-3 font-semibold text-slate-700">{n.district_name || 'General NER'}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleVerifyNgo(n.id, !n.is_verified)}
                          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors shadow-sm ${
                            n.is_verified
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {n.is_verified ? 'Revoke Approval' : 'Approve & Verify'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: TRANSPORTERS */}
      {activeTab === 'transporters' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-slate-700" />
                <span>Transporters & Logistics Operators</span>
              </h2>
              <p className="text-xs text-slate-500">
                Registered freight operators, vehicle dispatch coordinators, and emergency transport contractors.
              </p>
            </div>
            <button
              onClick={() => setShowAddTransporterModal(!showAddTransporterModal)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-md shadow-sm flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Add Transporter
            </button>
          </div>

          {/* Compact Add Transporter Form */}
          {showAddTransporterModal && (
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-slate-700" /> Provision New Transport Operator Account
              </h3>

              {transporterMsg.text && (
                <div
                  className={`p-2.5 rounded-md text-xs font-medium border ${
                    transporterMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
                  }`}
                >
                  {transporterMsg.text}
                </div>
              )}

              <form onSubmit={handleCreateTransporter} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. operator_assam"
                    value={transporterForm.username}
                    onChange={(e) => setTransporterForm({ ...transporterForm, username: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-md p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Temporary Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 6 characters"
                    value={transporterForm.password}
                    onChange={(e) => setTransporterForm({ ...transporterForm, password: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-md p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="First Last Name"
                    value={transporterForm.first_name}
                    onChange={(e) => setTransporterForm({ ...transporterForm, first_name: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-md p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="operator@logistics.in"
                    value={transporterForm.email}
                    onChange={(e) => setTransporterForm({ ...transporterForm, email: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-md p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91..."
                    value={transporterForm.phone_number}
                    onChange={(e) => setTransporterForm({ ...transporterForm, phone_number: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-md p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Assigned Duty District</label>
                  <CustomSelect
                    name="district_id"
                    value={transporterForm.district_id}
                    onChange={(e) => setTransporterForm({ ...transporterForm, district_id: e.target.value })}
                    placeholder="General / All Districts"
                    options={[
                      { value: '', label: 'General / All Districts', icon: '🌐' },
                      ...districts.map((d) => ({
                        value: d.district_id,
                        label: `${d.name} (${d.state})`,
                        icon: '📍',
                      })),
                    ]}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddTransporterModal(false)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingTransporter}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-md shadow-sm transition-all"
                  >
                    {addingTransporter ? 'Provisioning...' : 'Save & Provision Transporter'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Transporter Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200/60">
                <tr>
                  <th className="p-3">Operator Username</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone Number</th>
                  <th className="p-3">Assigned District</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transporterList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-slate-400 italic">
                      No registered transporters found. Click "Add Transporter" to provision an operator.
                    </td>
                  </tr>
                ) : (
                  transporterList.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-bold text-slate-900">@{t.username}</td>
                      <td className="p-3 text-slate-700">{t.first_name || t.last_name ? `${t.first_name} ${t.last_name}` : 'N/A'}</td>
                      <td className="p-3 font-mono text-slate-600">{t.email || 'N/A'}</td>
                      <td className="p-3 font-mono text-slate-600">{t.phone_number || 'N/A'}</td>
                      <td className="p-3 font-semibold text-slate-700">{t.district_name || 'General NER'}</td>
                      <td className="p-3">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          Active Fleet Operator
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: FLEET VEHICLES */}
      {activeTab === 'vehicles' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-slate-700" />
                <span>Fleet Vehicles Registry</span>
              </h2>
              <p className="text-xs text-slate-500">
                Real-time registry of 4x4 trucks, boats, heavy machinery, and emergency dispatch vehicles.
              </p>
            </div>
            <button
              onClick={() => setShowAddVehicleModal(!showAddVehicleModal)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-md shadow-sm flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Add Vehicle
            </button>
          </div>

          {/* Compact Add Vehicle Form */}
          {showAddVehicleModal && (
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-slate-700" /> Add New Vehicle to Fleet Registry
              </h3>

              {vehicleCreateMsg.text && (
                <div
                  className={`p-2.5 rounded-md text-xs font-medium border ${
                    vehicleCreateMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
                  }`}
                >
                  {vehicleCreateMsg.text}
                </div>
              )}

              <form onSubmit={handleCreateVehicle} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Registration Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AS-01-HC-9921"
                    value={vehicleForm.registration_number}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, registration_number: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-md p-2 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vehicle Type *</label>
                  <CustomSelect
                    name="vehicle_type"
                    value={vehicleForm.vehicle_type}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })}
                    options={[
                      { value: '5-Ton Truck', label: '5-Ton Truck', icon: '🚚' },
                      { value: '4x4 Offroad Pickup', label: '4x4 Offroad Pickup', icon: '🛻' },
                      { value: 'Relief Boat', label: 'Relief Boat / Raft', icon: '🚤' },
                      { value: 'Ambulance / Medical Unit', label: 'Ambulance / Medical Unit', icon: '🚑' },
                      { value: 'Heavy Machinery', label: 'Heavy Excavator / Machinery', icon: '🚜' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Assigned Transporter (Optional)</label>
                  <CustomSelect
                    name="operator_id"
                    value={vehicleForm.operator_id}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, operator_id: e.target.value })}
                    placeholder="Select Transport Operator"
                    options={[
                      { value: '', label: 'Unassigned / Depot Standby', icon: '⚪' },
                      ...transporterList.map((t) => ({
                        value: t.id,
                        label: `@${t.username} (${t.first_name || 'Operator'})`,
                        icon: '👤',
                      })),
                    ]}
                  />
                </div>
                <div className="sm:col-span-3 flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddVehicleModal(false)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingVehicle}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-md shadow-sm transition-all"
                  >
                    {addingVehicle ? 'Registering...' : 'Save & Register Vehicle'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Vehicles Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200/60">
                <tr>
                  <th className="p-3">Registration Number</th>
                  <th className="p-3">Vehicle Type</th>
                  <th className="p-3">Assigned Operator</th>
                  <th className="p-3">Operational Status</th>
                  <th className="p-3">GPS Location</th>
                  <th className="p-3 text-right">Last Ping</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allVehiclesList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-slate-400 italic">
                      No fleet vehicles registered.
                    </td>
                  </tr>
                ) : (
                  allVehiclesList.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900">{v.registration_number}</td>
                      <td className="p-3 font-semibold text-slate-700">{v.vehicle_type}</td>
                      <td className="p-3 text-slate-600">{v.operator_username || `Operator #${v.operator || '—'}`}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            v.status === 'idle'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {v.status === 'idle' ? 'Available / Idle' : v.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {v.current_location?.latitude ? `${v.current_location.latitude.toFixed(4)}, ${v.current_location.longitude.toFixed(4)}` : 'Live Telemetry'}
                      </td>
                      <td className="p-3 text-right text-slate-500 text-[11px]">
                        {v.last_ping_at ? new Date(v.last_ping_at).toLocaleTimeString() : 'Active'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 5: FIELD OFFICERS */}
      {activeTab === 'officers' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-700" />
                <span>Field Officers Roster</span>
              </h2>
              <p className="text-xs text-slate-500">
                Official rapid assessment personnel and ground incident management reps.
              </p>
            </div>
            <button
              onClick={() => setShowAddOfficerModal(!showAddOfficerModal)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-md shadow-sm flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Add Field Officer
            </button>
          </div>

          {/* Compact Add Field Officer Form */}
          {showAddOfficerModal && (
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-slate-700" /> Provision New Field Officer Account
              </h3>

              {officerMsg.text && (
                <div
                  className={`p-2.5 rounded-md text-xs font-medium border ${
                    officerMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
                  }`}
                >
                  {officerMsg.text}
                </div>
              )}

              <form onSubmit={handleCreateOfficer} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. officer_guwahati"
                    value={officerForm.username}
                    onChange={(e) => setOfficerForm({ ...officerForm, username: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-md p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Temporary Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 6 characters"
                    value={officerForm.password}
                    onChange={(e) => setOfficerForm({ ...officerForm, password: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-md p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="First Last Name"
                    value={officerForm.first_name}
                    onChange={(e) => setOfficerForm({ ...officerForm, first_name: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-md p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="officer@disaster.gov.in"
                    value={officerForm.email}
                    onChange={(e) => setOfficerForm({ ...officerForm, email: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-md p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91..."
                    value={officerForm.phone_number}
                    onChange={(e) => setOfficerForm({ ...officerForm, phone_number: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-md p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Duty District</label>
                  <CustomSelect
                    name="district_id"
                    value={officerForm.district_id}
                    onChange={(e) => setOfficerForm({ ...officerForm, district_id: e.target.value })}
                    placeholder="General / All Districts"
                    options={[
                      { value: '', label: 'General / All Districts', icon: '🌐' },
                      ...districts.map((d) => ({
                        value: d.district_id,
                        label: `${d.name} (${d.state})`,
                        icon: '📍',
                      })),
                    ]}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddOfficerModal(false)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingOfficer}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-md shadow-sm transition-all"
                  >
                    {addingOfficer ? 'Provisioning...' : 'Save & Provision Officer'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Field Officers Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200/60">
                <tr>
                  <th className="p-3">Officer Username</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone Number</th>
                  <th className="p-3">Duty District</th>
                  <th className="p-3 text-right">Clearance Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fieldOfficerList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-slate-400 italic">
                      No field officers registered. Click "Add Field Officer" to provision an officer.
                    </td>
                  </tr>
                ) : (
                  fieldOfficerList.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-bold text-slate-900">@{o.username}</td>
                      <td className="p-3 text-slate-700">{o.first_name || o.last_name ? `${o.first_name} ${o.last_name}` : 'N/A'}</td>
                      <td className="p-3 font-mono text-slate-600">{o.email || 'N/A'}</td>
                      <td className="p-3 font-mono text-slate-600">{o.phone_number || 'N/A'}</td>
                      <td className="p-3 font-semibold text-slate-700">{o.district_name || 'General NER'}</td>
                      <td className="p-3 text-right">
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          Rapid Assessment Authorized
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 6: NGO & GOVT STOCKPILE VERIFICATION HUB */}
      {activeTab === 'stock' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-extrabold text-slate-900">
                  NGO & Relief Stockpile Verification & Quality Control
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review submitted NGO relief supplies, verify compliance standards, and authorize or debar stockpiles for emergency allocation matching.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs">
              {[
                { id: 'all', label: `All Stock (${resourceList.length})` },
                {
                  id: 'pending',
                  label: `Pending Verification (${resourceList.filter((r) => r.verification_status === 'pending' || !r.verification_status).length})`,
                  highlight: resourceList.some((r) => r.verification_status === 'pending' || !r.verification_status),
                },
                {
                  id: 'approved',
                  label: `Approved (${resourceList.filter((r) => r.verification_status === 'approved' || r.verification_status === 'verified_org').length})`,
                },
                {
                  id: 'debarred',
                  label: `Debarred (${resourceList.filter((r) => r.verification_status === 'debarred').length})`,
                },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStockFilter(f.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    stockFilter === f.id
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : f.highlight
                      ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stockpiles Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200/60">
                <tr>
                  <th className="p-3.5">Stockpile Item</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Available Quantity</th>
                  <th className="p-3.5">Depot Location</th>
                  <th className="p-3.5">Provider / NGO</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Verification Authority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {resourceList
                  .filter((r) => {
                    if (stockFilter === 'pending') return r.verification_status === 'pending' || !r.verification_status;
                    if (stockFilter === 'approved') return r.verification_status === 'approved' || r.verification_status === 'verified_org';
                    if (stockFilter === 'debarred') return r.verification_status === 'debarred';
                    return true;
                  })
                  .map((r) => {
                    const isApproved = r.verification_status === 'approved' || r.verification_status === 'verified_org';
                    const isDebarred = r.verification_status === 'debarred';
                    const isPending = !isApproved && !isDebarred;

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <StockCategoryBadge type={r.type} size="sm" showLabel={false} />
                            <span className="font-bold text-slate-900 text-xs">
                              {r.name || r.item_type || `${r.type ? r.type.replace('_', ' ') : 'Resource'} Stock #${r.id}`}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-700 uppercase text-[11px]">{r.type ? r.type.replace('_', ' ') : 'General'}</td>
                        <td className="p-3.5 font-black text-emerald-700 text-sm">
                          {r.quantity_available || r.quantity} <span className="text-xs font-normal text-slate-500">{r.unit || 'units'}</span>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-700">{r.district_name || 'Cachar / NER Hub'}</td>
                        <td className="p-3.5 text-slate-700 font-bold">
                          @{r.provider_username || r.provider || 'redcross_assam'}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1.5 ${
                              isApproved
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : isDebarred
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isApproved ? 'bg-emerald-600' : isDebarred ? 'bg-rose-600' : 'bg-amber-600'
                              }`}
                            ></span>
                            <span>{isApproved ? 'Approved & Active' : isDebarred ? 'Debarred' : 'Pending Review'}</span>
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveResource(r.id)}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDebarResource(r.id)}
                                  className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Debar</span>
                                </button>
                              </>
                            )}

                            {isApproved && (
                              <button
                                type="button"
                                onClick={() => handleDebarResource(r.id)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                Revoke / Debar
                              </button>
                            )}

                            {isDebarred && (
                              <button
                                type="button"
                                onClick={() => handleApproveResource(r.id)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                Re-verify & Restore
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Risk Analyzer Tab View */}
      {activeTab === 'ai_risk' && (
        <AiRiskAnalyzer
          conditions={conditions}
          title="District Command AI Risk Analyzer"
          subtitle="Real-time geoclimatic hazard prediction, road corridor threat assessment, and nearest point analysis."
        />
      )}
    </div>
  );
}
