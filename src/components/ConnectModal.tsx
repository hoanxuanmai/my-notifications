import React, { useState } from 'react';
import {
  X,
  Database,
  Key,
  Globe,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { notificationService } from '../services/notificationService';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({ isOpen, onClose, onConnected }) => {
  const currentConfig = notificationService.getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(currentConfig?.url || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(currentConfig?.anonKey || '');
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ success: boolean; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSaveAndTest = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setStatusMessage({ success: false, text: 'Please provide both Supabase Project URL and Anon/Public Key.' });
      return;
    }

    setIsTesting(true);
    setStatusMessage(null);

    try {
      const res = await notificationService.testSupabaseConnection({
        url: supabaseUrl.trim(),
        anonKey: supabaseAnonKey.trim(),
      });

      if (res.success) {
        setStatusMessage({ success: true, text: res.message });
        if (onConnected) onConnected();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setStatusMessage({ success: false, text: res.message });
      }
    } catch (err: any) {
      setStatusMessage({ success: false, text: err?.message || 'Connection failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = () => {
    notificationService.disconnectSupabase();
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    setStatusMessage({ success: true, text: 'Disconnected. Switched back to local in-memory simulation engine.' });
    if (onConnected) onConnected();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Connect Live Supabase Project
              </h3>
              <p className="text-xs text-slate-400">
                PostgreSQL Realtime WebSocket & Row Level Security
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
            Nhập <strong>Project URL</strong> và <strong>Anon Key</strong> từ Supabase Dashboard (Settings ➔ API) để kết nối trực tiếp table <code>public.notifications</code> với Realtime WAL replication.
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Project URL
            </label>
            <div className="relative">
              <Globe className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project-id.supabase.co"
                className="w-full pl-10 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-300 font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Anon / Public API Key
            </label>
            <div className="relative">
              <Key className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full pl-10 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-300 font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Status Message Alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                statusMessage.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {statusMessage.success ? (
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between gap-3">
            {notificationService.isLiveConnected() && (
              <button
                onClick={handleDisconnect}
                type="button"
                className="text-xs text-rose-400 hover:text-rose-300 underline font-medium"
              >
                Disconnect Supabase
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={onClose}
                type="button"
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAndTest}
                disabled={isTesting}
                type="button"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5" />
                    <span>Connect & Sync</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
