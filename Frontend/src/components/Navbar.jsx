import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Compass,
  LogOut,
  Globe,
  User,
  ChevronDown,
  Check,
} from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout, language, setLanguage, t } = useAuth();

  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langRef.current && !langRef.current.contains(event.target)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languages = [
    { key: 'en', label: 'English' },
    { key: 'as', label: 'অসমীয়া' },
    { key: 'bn', label: 'বাংলা' },
    { key: 'hi', label: 'हिन्दी' },
  ];

  const handleSelectLanguage = (langKey) => {
    setLanguage(langKey);
    setLangOpen(false);
  };

  const navItemClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
      isActive
        ? 'bg-slate-900 text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const currentLangObj = languages.find((l) => l.key === language) || languages[0];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Logo & Main Nav Links */}
          <div className="flex items-center space-x-6">
            <div
              className="flex items-center space-x-2.5 text-slate-900 cursor-pointer group"
              onClick={() => navigate('/')}
            >
              <img
                src="/Setu_logo.png"
                alt="SETU Logo"
                className="h-10 w-10 object-contain rounded-xl shadow-xs group-hover:scale-105 transition-transform"
              />
              <div>
                <span className="text-base font-black tracking-tight leading-none block text-slate-900">SETU</span>
                <span className="text-[9px] uppercase tracking-widest font-extrabold text-primary-700 block leading-none mt-0.5">
                  Command Portal
                </span>
              </div>
            </div>

            {user && (
              <div className="hidden md:flex items-center space-x-1 border-l border-slate-200/80 pl-6">
                {(user.role === 'district_admin' || user.role === 'admin') && (
                  <NavLink to="/dashboard" className={navItemClass}>
                    {t('command_center') || 'Command Dashboard'}
                  </NavLink>
                )}

                {user.role === 'field_officer' && (
                  <NavLink to="/officer" className={navItemClass}>
                    {t('field_officer') || 'Field Officer'}
                  </NavLink>
                )}

                {user.role === 'ngo' && (
                  <NavLink to="/ngo" className={navItemClass}>
                    {t('ngo_console') || 'NGO Hub'}
                  </NavLink>
                )}

                {user.role === 'transport_operator' && (
                  <NavLink to="/operator" className={navItemClass}>
                    {t('fleet_operator') || 'Transport Operator'}
                  </NavLink>
                )}

                {user.role === 'citizen' && (
                  <NavLink to="/citizen" className={navItemClass}>
                    {t('citizen_portal') || 'Citizen Portal'}
                  </NavLink>
                )}
              </div>
            )}
          </div>

          {/* Right Utility Controls */}
          <div className="flex items-center space-x-3">
            {/* Custom Language Dropdown Popover */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/80 hover:bg-slate-200/80 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200/60 shadow-sm transition-all cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>{currentLangObj.label}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>

              {langOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">Select Language</div>
                  {languages.map((l) => (
                    <button
                      key={l.key}
                      onClick={() => handleSelectLanguage(l.key)}
                      className={`w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-between transition-colors ${
                        language === l.key ? 'bg-slate-900 text-white font-bold' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span>{l.label}</span>
                      {language === l.key && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {user && (
              <div className="flex items-center space-x-3 pl-2">
                <div className="hidden sm:flex items-center space-x-2">
                  <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
                    <User className="h-3.5 w-3.5 text-slate-700" />
                  </div>
                  <div className="text-left leading-none">
                    <div className="text-xs font-bold text-slate-900">{user.username}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">
                      {user.role ? user.role.replace('_', ' ') : 'USER'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="flex items-center space-x-1 px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors shadow-sm"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{t('logout') || 'Logout'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Panel */}
      {user && (
        <div className="md:hidden flex justify-around py-1.5 border-t border-slate-200/60 bg-slate-50/90 text-xs font-semibold">
          {(user.role === 'district_admin' || user.role === 'admin') && (
            <NavLink to="/dashboard" className={navItemClass}>
              Dashboard
            </NavLink>
          )}
          {user.role === 'field_officer' && (
            <NavLink to="/officer" className={navItemClass}>
              Officer
            </NavLink>
          )}
          {user.role === 'ngo' && (
            <NavLink to="/ngo" className={navItemClass}>
              NGO Hub
            </NavLink>
          )}
          {user.role === 'transport_operator' && (
            <NavLink to="/operator" className={navItemClass}>
              Operator
            </NavLink>
          )}
          {user.role === 'citizen' && (
            <NavLink to="/citizen" className={navItemClass}>
              Citizen
            </NavLink>
          )}
        </div>
      )}
    </header>
  );
}
