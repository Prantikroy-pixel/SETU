import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const user = await login({ username, password });
      
      if (user.role === 'district_admin' || user.role === 'admin') {
        navigate('/dashboard');
      } else if (user.role === 'field_officer') {
        navigate('/officer');
      } else if (user.role === 'ngo') {
        navigate('/ngo');
      } else if (user.role === 'transport_operator') {
        navigate('/operator');
      } else {
        navigate('/citizen');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid username or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-command-bg-start to-command-bg-end px-4 sm:px-6 lg:px-8 font-body-md">
      <div className="max-w-md w-full space-y-8 bg-surface-container-lowest p-8 rounded-xl shadow-lg border border-outline-variant/30 relative overflow-hidden">
        {/* Top ambient glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary-container/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col items-center text-center">
          <img
            src="/Setu_logo.png"
            alt="SETU Logo"
            className="w-20 h-20 object-contain rounded-2xl shadow-md mb-3 hover:scale-105 transition-transform"
          />
          <h2 className="text-headline-md font-headline-md text-on-surface uppercase tracking-widest">SETU</h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Strategic Disaster Response Command Portal (MDoNER)
          </p>
        </div>

        {error && (
          <div className="bg-error-container/30 border border-error/20 p-4 rounded-lg text-body-sm text-error flex items-center gap-2 font-medium">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-label-caps font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary text-body-sm transition-all"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-label-caps font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/40 rounded-lg text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary text-body-sm transition-all"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-full text-label-caps font-bold uppercase tracking-wider text-on-primary bg-primary hover:bg-primary/90 focus:outline-none transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In to Portal'}
            </button>
          </div>
        </form>

        {/* Quick Demo Credentials Panel */}
        <div className="pt-2 border-t border-outline-variant/30">
          <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant text-center mb-2">
            Quick Fill Demo Accounts (Password: Password123!)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setUsername('admin_aryan');
                setPassword('Password123!');
              }}
              className="px-2.5 py-1.5 bg-surface-container-high hover:bg-primary/10 hover:text-primary rounded-lg border border-outline-variant/40 text-on-surface font-semibold text-left transition-all flex items-center justify-between"
            >
              <span>District Admin</span>
              <span className="text-[10px] text-on-surface-variant font-mono">@admin</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('officer_ananda');
                setPassword('Password123!');
              }}
              className="px-2.5 py-1.5 bg-surface-container-high hover:bg-primary/10 hover:text-primary rounded-lg border border-outline-variant/40 text-on-surface font-semibold text-left transition-all flex items-center justify-between"
            >
              <span>Field Officer</span>
              <span className="text-[10px] text-on-surface-variant font-mono">@officer</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('operator_rajesh');
                setPassword('Password123!');
              }}
              className="px-2.5 py-1.5 bg-surface-container-high hover:bg-primary/10 hover:text-primary rounded-lg border border-outline-variant/40 text-on-surface font-semibold text-left transition-all flex items-center justify-between"
            >
              <span>Fleet Operator</span>
              <span className="text-[10px] text-on-surface-variant font-mono">@operator</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('redcross_assam');
                setPassword('Password123!');
              }}
              className="px-2.5 py-1.5 bg-surface-container-high hover:bg-primary/10 hover:text-primary rounded-lg border border-outline-variant/40 text-on-surface font-semibold text-left transition-all flex items-center justify-between"
            >
              <span>NGO Depot</span>
              <span className="text-[10px] text-on-surface-variant font-mono">@ngo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('citizen_priya');
                setPassword('Password123!');
              }}
              className="col-span-2 px-2.5 py-1.5 bg-surface-container-high hover:bg-primary/10 hover:text-primary rounded-lg border border-outline-variant/40 text-on-surface font-semibold text-center transition-all flex items-center justify-center gap-2"
            >
              <span>Citizen Portal Account</span>
              <span className="text-[10px] text-on-surface-variant font-mono">@citizen_priya</span>
            </button>
          </div>
        </div>

        <div className="text-center mt-4">
          <span className="text-body-sm text-on-surface-variant">Don't have a command account? </span>
          <Link to="/register" className="text-body-sm font-bold text-primary hover:underline">
            Register Here
          </Link>
        </div>
      </div>
    </div>
  );
}
