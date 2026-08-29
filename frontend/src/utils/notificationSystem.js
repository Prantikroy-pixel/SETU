/**
 * SETU Real-Time Event & Notification Hub
 * Provides cross-tab synchronization (BroadcastChannel), audio chimes, and persistent activity logs.
 */

const CHANNEL_NAME = 'setu_realtime_events';
let broadcastChannel = null;

try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not supported', e);
}

// Activity Log Storage
const ACTIVITY_STORAGE_KEY = 'setu_activity_log';

export const getActivityLogs = () => {
  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveActivityLog = (activity) => {
  try {
    const logs = getActivityLogs();
    const newEntry = {
      id: Date.now() + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      read: false,
      ...activity,
    };
    const updated = [newEntry, ...logs].slice(0, 50); // keep last 50
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(updated));
    return newEntry;
  } catch (err) {
    console.error('Failed to save activity log', err);
    return activity;
  }
};

export const markActivityAsRead = (id) => {
  try {
    const logs = getActivityLogs();
    const updated = logs.map((l) => (l.id === id ? { ...l, read: true } : l));
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}
};

export const markAllActivitiesAsRead = () => {
  try {
    const logs = getActivityLogs();
    const updated = logs.map((l) => ({ ...l, read: true }));
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}
};

// Play audio alert chime (synthetic Web Audio API, works without external mp3s!)
export const playAlertSound = (type = 'warning') => {
  try {
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'critical' || type === 'disruption') {
      // Urgent double beep
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc1.frequency.setValueAtTime(660, ctx.currentTime + 0.1); // E5
      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.3);
    } else if (type === 'success' || type === 'approval') {
      // Pleasant chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else {
      // Soft notification ping
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (err) {
    // Audio might be blocked by browser autoplay policy until user interaction
  }
};

// Dispatch real-time event
export const emitRealtimeEvent = (eventType, payload) => {
  const activity = {
    type: eventType,
    ...payload,
  };
  const saved = saveActivityLog(activity);

  // Play sound if appropriate
  if (eventType === 'DISRUPTION_REPORTED') playAlertSound('disruption');
  else if (eventType === 'STOCK_SUBMITTED' || eventType === 'TRANSPORT_ENROLLED') playAlertSound('info');
  else if (eventType === 'STOCK_APPROVED') playAlertSound('success');

  // Broadcast to other tabs
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: eventType, data: saved });
  }

  // Dispatch custom event in current window
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('setu_realtime_alert', { detail: { type: eventType, data: saved } }));
  }
};

// Hook/Listener registration helper
export const subscribeToRealtimeEvents = (callback) => {
  if (typeof window === 'undefined') return () => {};

  const handleWindow = (e) => {
    if (e.detail) callback(e.detail);
  };

  const handleBroadcast = (e) => {
    if (e.data) callback(e.data);
  };

  window.addEventListener('setu_realtime_alert', handleWindow);
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  return () => {
    window.removeEventListener('setu_realtime_alert', handleWindow);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
  };
};
