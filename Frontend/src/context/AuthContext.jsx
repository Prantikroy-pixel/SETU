import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('en');

  // Load and validate user session on startup
  useEffect(() => {
    const initSession = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('access_token');

        if (storedUser && storedToken && storedUser !== 'undefined' && storedUser !== 'null') {
          try {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser && typeof parsedUser === 'object') {
              setUser(parsedUser);
              setToken(storedToken);
              setLanguage(parsedUser.preferred_language || 'en');
            }
          } catch (e) {
            console.error('Failed to parse cached user', e);
            localStorage.removeItem('user');
            localStorage.removeItem('access_token');
          }
        }
      } catch (err) {
        console.error('Session init error', err);
      } finally {
        setLoading(false);
      }

      // Re-validate token with backend in the background non-blockingly
      const storedToken = localStorage.getItem('access_token');
      if (storedToken) {
        try {
          const liveUser = await authAPI.getMe();
          if (liveUser && liveUser.id && !liveUser.id?.toString().startsWith('mock')) {
            setUser(liveUser);
            localStorage.setItem('user', JSON.stringify(liveUser));
          }
        } catch {
          // If offline or network error, keep stored user
        }
      }
    };

    initSession();
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const data = await authAPI.login(credentials);
      setUser(data.user);
      setToken(data.access);
      setLanguage(data.user.preferred_language || 'en');
      
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const data = await authAPI.register(userData);
      setUser(data.user);
      setToken(data.access);
      setLanguage(data.user.preferred_language || 'en');
      
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      return data.user;
    } finally {
      setLoading(false);
    }
  };


  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
  };

  const updateUserProfile = async (profileData) => {
    const updatedUser = await authAPI.updateMe(profileData);
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    if (updatedUser.preferred_language) {
      setLanguage(updatedUser.preferred_language);
    }
    return updatedUser;
  };

  // Simple multilingual UI dictionary
  const t = (key) => {
    const translations = {
      en: {
        app_title: "SETU Platform",
        dashboard: "Dashboard",
        command_center: "Command Center",
        citizen_portal: "Citizen Portal",
        field_officer: "Field Officer",
        fleet_operator: "Fleet Operator",
        ngo_console: "Relief Depot",
        logout: "Logout",
        language: "Language",
        active_alerts: "Active Alerts",
        reported_needs: "Relief Demands",
        blocked_corridors: "Disruptions",
        available_resources: "Stockpiles",
        critical_alerts: "Critical Alerts",
      },
      as: {
        app_title: "সেতু প্লেটফৰ্ম",
        dashboard: "ডেশবৰ্ড",
        command_center: "নিয়ন্ত্ৰণ কক্ষ",
        citizen_portal: "নাগৰিক পৰ্টেল",
        field_officer: "ক্ষেত্ৰ বিষয়া",
        fleet_operator: "পৰিবহন চালক",
        ngo_console: "সাহায্য ভাণ্ডাৰ",
        logout: "প্ৰস্থান",
        language: "ভাষা",
        active_alerts: "সক্ৰিয় সতৰ্কবাণী",
        reported_needs: "সাহায্যৰ দাবী",
        blocked_corridors: "পৰিবহন বাধা",
        available_resources: "মজুত সামগ্ৰী",
        critical_alerts: "জৰুৰী সতৰ্কবাণী",
      },
      bn: {
        app_title: "সেতু প্ল্যাটফর্ম",
        dashboard: "ড্যাশবোর্ড",
        command_center: "নিয়ন্ত্রণ কক্ষ",
        citizen_portal: "নাগরিক পোর্টাল",
        field_officer: "ফিল্ড অফিসার",
        fleet_operator: "পরিবহন চালক",
        ngo_console: "ত্রাণ ভান্ডার",
        logout: "লগআউট",
        language: "ভাষা",
        active_alerts: "সক্রিয় সতর্কতা",
        reported_needs: "ত্রাণের চাহিদা",
        blocked_corridors: "পরিবহন বাধা",
        available_resources: "মজুত সামগ্রী",
        critical_alerts: "জরুরি সতর্কতা",
      },
      hi: {
        app_title: "सेतु प्लेटफॉर्म",
        dashboard: "डैशबोर्ड",
        command_center: "कमांड सेंटर",
        citizen_portal: "नागरिक पोर्टल",
        field_officer: "फील्ड ऑफिसर",
        fleet_operator: "परिवहन चालक",
        ngo_console: "राहत डिपो",
        logout: "लॉगआउट",
        language: "भाषा",
        active_alerts: "सक्रिय अलर्ट",
        reported_needs: "राहत मांगें",
        blocked_corridors: "अवरुद्ध मार्ग",
        available_resources: "राहत सामग्री",
        critical_alerts: "गंभीर अलर्ट",
      }
    };
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  const switchRole = (newRole) => {
    if (!user) return;
    const updatedUser = { ...user, role: newRole };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    token,
    loading,
    language,
    setLanguage: (lang) => {
      setLanguage(lang);
      if (user) {
        updateUserProfile({ preferred_language: lang }).catch(() => {});
      }
    },
    login,
    register,
    logout,
    updateUserProfile,
    switchRole,
    t,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
