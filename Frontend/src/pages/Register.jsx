import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { districtAPI } from '../api';
import { ShieldAlert, Compass, CheckCircle2, Clock } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    role: 'citizen',
    preferred_language: 'en',
    district_id: '',
  });
  const [districts, setDistricts] = useState([]);
  const [error, setError] = useState('');
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredNgoPending, setRegisteredNgoPending] = useState(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDistricts = async () => {
      setLoadingDistricts(true);
      try {
        const data = await districtAPI.list();
        const results = data.results || data || [];
        setDistricts(results);
      } catch (err) {
        console.error('Failed to load districts', err);
      } finally {
        setLoadingDistricts(false);
      }
    };
    fetchDistricts();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      setError('Username and password are required.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    const payload = {
      ...formData,
      district_id: formData.district_id ? parseInt(formData.district_id, 10) : null,
    };

    try {
      const user = await register(payload);
      if (user.role === 'ngo') {
        // If NGO registered, show pending approval notification
        setRegisteredNgoPending(user);
      } else if (user.role === 'district_admin' || user.role === 'admin') {
        navigate('/dashboard');
      } else if (user.role === 'field_officer') {
        navigate('/officer');
      } else if (user.role === 'transport_operator') {
        navigate('/operator');
      } else {
        navigate('/citizen');
      }
    } catch (err) {
      setError(
        Object.values(err.response?.data || {})
          .flat()
          .join(' ') || 'Registration failed. Try a different username.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registeredNgoPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm border border-slate-100 text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">NGO Registration Submitted</h2>
          <p className="text-sm text-slate-600">
            Thank you, <span className="font-semibold text-slate-800">{registeredNgoPending.username}</span>. Your relief depot registration is currently <span className="font-semibold text-amber-600">Pending Verification</span> by the District/Command Administrator.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800 text-left">
            Once approved by the District Administrator, your organization will gain full access to register stockpile resources and participate in emergency resource matching.
          </div>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-block w-full py-2 px-4 rounded-md text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm"
            >
              Proceed to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-command-bg-start to-command-bg-end py-12 px-4 sm:px-6 lg:px-8 font-body-md">
      <div className="max-w-lg w-full space-y-8 bg-surface-container-lowest p-8 rounded-xl shadow-lg border border-outline-variant/30 relative overflow-hidden">
        <div className="flex flex-col items-center text-center">
          <img
            src="/Setu_logo.png"
            alt="SETU Logo"
            className="w-20 h-20 object-contain rounded-2xl shadow-md mb-3 hover:scale-105 transition-transform"
          />
          <h2 className="text-headline-md font-headline-md text-on-surface uppercase tracking-widest">Register Account</h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Create an official profile for SETU Strategic Command System
          </p>
        </div>

        {/* Informative RBAC notice */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded text-xs text-blue-700">
          <span className="font-bold">Public Registration:</span> Available for Citizens & NGOs. Field Officers & Vehicle Operators are provisioned directly by the District Administrator.
        </div>

        {error && (
          <div className="bg-error-container/30 border border-error/20 p-4 rounded-lg text-body-sm text-error flex items-center gap-2 font-medium">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label-caps font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                First Name
              </label>
              <input
                name="first_name"
                type="text"
                className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:border-primary text-body-sm"
                value={formData.first_name}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-label-caps font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                Last Name
              </label>
              <input
                name="last_name"
                type="text"
                className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:border-primary text-body-sm"
                value={formData.last_name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-label-caps font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              Username *
            </label>
            <input
              name="username"
              type="text"
              required
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:border-primary text-body-sm"
              value={formData.username}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-label-caps font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              Password *
            </label>
            <input
              name="password"
              type="password"
              required
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:border-primary text-body-sm"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-label-caps font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              Phone Number
            </label>
            <input
              name="phone_number"
              type="text"
              placeholder="+91"
              className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface focus:outline-none focus:border-primary text-body-sm"
              value={formData.phone_number}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label-caps font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                Account Type *
              </label>
              <CustomSelect
                name="role"
                value={formData.role}
                onChange={handleChange}
                options={[
                  { value: 'citizen', label: 'Citizen (Public)', icon: '👤' },
                  { value: 'ngo', label: 'Relief Depot / NGO', icon: '🏢' },
                ]}
              />
              <p className="text-[10px] text-on-surface-variant mt-1">
                Note: Field Officers & Transport Operators are registered directly by District Command Admins.
              </p>
            </div>

            <div>
              <label className="block text-label-caps font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                Language
              </label>
              <CustomSelect
                name="preferred_language"
                value={formData.preferred_language}
                onChange={handleChange}
                options={[
                  { value: 'en', label: 'English', icon: '🌐' },
                  { value: 'as', label: 'অসমীয়া (Assamese)', icon: '🗣️' },
                  { value: 'bn', label: 'বাংলা (Bengali)', icon: '🗣️' },
                  { value: 'hi', label: 'हिन्दी (Hindi)', icon: '🗣️' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-label-caps font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              Duty / Home District
            </label>
            <CustomSelect
              name="district_id"
              value={formData.district_id}
              onChange={handleChange}
              disabled={loadingDistricts}
              placeholder="Select District (None/General)"
              options={[
                { value: '', label: 'Select District (None/General)', icon: '🌐' },
                ...districts.map((d) => ({
                  value: d.id,
                  label: `${d.name}, ${d.state}`,
                  icon: '📍',
                })),
              ]}
            />
            {loadingDistricts && <p className="text-xs text-on-surface-variant mt-1">Loading districts...</p>}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-full text-label-caps font-bold uppercase tracking-wider text-on-primary bg-primary hover:bg-primary/90 focus:outline-none transition-all shadow-md disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Profile...' : 'Complete Registration'}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <span className="text-body-sm text-on-surface-variant">Already have a command account? </span>
          <Link to="/login" className="text-body-sm font-bold text-primary hover:underline">
            Login Here
          </Link>
        </div>
      </div>
    </div>
  );
}
