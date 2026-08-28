import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Truck,
  Package,
  HeartHandshake,
  Clock,
  Volume2,
  VolumeX,
  Trash2,
  CheckCheck,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  getActivityLogs,
  markActivityAsRead,
  markAllActivitiesAsRead,
  subscribeToRealtimeEvents,
  playAlertSound,
} from '../utils/notificationSystem';
import { resourceAPI } from '../api';

export default function DistrictAdminNotificationFeed({ onApproveStock, onDebarStock, onRefreshData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    setLogs(getActivityLogs());
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToRealtimeEvents((event) => {
      const item = event.data || event;
      setLogs((prev) => [item, ...prev.filter((l) => l.id !== item.id)].slice(0, 50));
    });
    return () => unsubscribe();
  }, []);

  const unreadCount = logs.filter((l) => !l.read).length;

  const handleToggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      markAllActivitiesAsRead();
      setLogs((prev) => prev.map((l) => ({ ...l, read: true })));
    }
  };

  const handleApprove = async (resourceId, logId) => {
    setProcessingId(logId);
    try {
      await resourceAPI.approve(resourceId);
      if (onApproveStock) onApproveStock(resourceId);
      if (onRefreshData) onRefreshData();
      setLogs((prev) =>
        prev.map((l) =>
          l.id === logId
            ? { ...l, approved: true, debarred: false, title: 'Stockpile Approved & Active' }
            : l
        )
      );
    } catch (err) {
      console.error('Approval failed', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDebar = async (resourceId, logId) => {
    const reason = window.prompt('Specify reason for debarring this stockpile:', 'Compliance standard check failed');
    if (reason === null) return; // cancelled
    setProcessingId(logId);
    try {
      await resourceAPI.debar(resourceId, reason);
      if (onDebarStock) onDebarStock(resourceId, reason);
      if (onRefreshData) onRefreshData();
      setLogs((prev) =>
        prev.map((l) =>
          l.id === logId
            ? { ...l, debarred: true, approved: false, title: `Debarred: ${reason}` }
            : l
        )
      );
    } catch (err) {
      console.error('Debar failed', err);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === 'stocks') return log.type === 'STOCK_SUBMITTED' || log.type === 'STOCK_APPROVED' || log.type === 'STOCK_DEBARRED';
    if (filter === 'transports') return log.type === 'TRANSPORT_ENROLLED';
    if (filter === 'disruptions') return log.type === 'DISRUPTION_REPORTED';
    if (filter === 'needs') return log.type === 'NEED_REQUESTED';
    return true;
  });

  return (
    <div className="relative inline-block text-left select-none">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggleOpen}
        className="relative p-2 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-xs hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none"
        title="Live District Operation Alerts & Verification Feed"
      >
        <Bell className="w-4.5 h-4.5 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        <span className="hidden md:inline text-xs font-bold text-slate-700">Live Alerts</span>
      </button>

      {/* Floating Dropdown Drawer */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/90 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
              <h3 className="text-xs font-black uppercase tracking-wider">Command Telemetry & Verification</h3>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                title={soundEnabled ? 'Mute alert chimes' : 'Unmute alert chimes'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-red-400" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  markAllActivitiesAsRead();
                  setLogs((prev) => prev.map((l) => ({ ...l, read: true })));
                }}
                className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-100 overflow-x-auto text-[10px] font-bold">
            {[
              { id: 'all', label: 'All Feed' },
              { id: 'stocks', label: 'Stock Verifications' },
              { id: 'transports', label: 'Transports' },
              { id: 'disruptions', label: 'Disruptions' },
              { id: 'needs', label: 'Citizen Needs' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-2 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
                  filter === tab.id
                    ? 'bg-slate-900 text-white font-extrabold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Activity List Feed */}
          <div className="max-h-80 overflow-y-auto p-2 space-y-2 divide-y divide-slate-100">
            {filteredLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                No active operational alerts in this category.
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isStock = log.type === 'STOCK_SUBMITTED';
                const isDisruption = log.type === 'DISRUPTION_REPORTED';
                const isTransport = log.type === 'TRANSPORT_ENROLLED';
                const isNeed = log.type === 'NEED_REQUESTED';
                const resId = log.resource?.id || log.resourceId;

                return (
                  <div
                    key={log.id}
                    className={`p-2.5 rounded-xl transition-all ${
                      !log.read ? 'bg-blue-50/60 border border-blue-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Icon */}
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold border ${
                          isDisruption
                            ? 'bg-red-50 text-red-600 border-red-200'
                            : isStock
                            ? 'bg-amber-50 text-amber-600 border-amber-200'
                            : isTransport
                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        }`}
                      >
                        {isDisruption ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        ) : isStock ? (
                          <Package className="w-3.5 h-3.5 text-amber-600" />
                        ) : isTransport ? (
                          <Truck className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900">{log.title}</h4>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 leading-snug">{log.message}</p>

                        {/* Interactive NGO Stock Approval / Debar Actions */}
                        {isStock && resId && !log.approved && !log.debarred && (
                          <div className="flex items-center gap-2 pt-1.5">
                            <button
                              type="button"
                              disabled={processingId === log.id}
                              onClick={() => handleApprove(resId, log.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Approve Stock</span>
                            </button>

                            <button
                              type="button"
                              disabled={processingId === log.id}
                              onClick={() => handleDebar(resId, log.id)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Debar / Reject</span>
                            </button>
                          </div>
                        )}

                        {log.approved && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Approved by District Admin</span>
                          </div>
                        )}

                        {log.debarred && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 mt-1">
                            <XCircle className="w-3 h-3" />
                            <span>Debarred by District Admin</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
