import React, { useState } from 'react';
import {
  Sliders,
  Bell,
  Mail,
  Smartphone,
  Radio,
  Clock,
  Volume2,
  VolumeX,
  Shield,
  Save,
  Check,
  Zap,
} from 'lucide-react';
import { UserPreferences, NotificationCategory } from '../types';
import { notificationService } from '../services/notificationService';
import { playNotificationChime } from '../utils/audio';

export const PreferencesView: React.FC = () => {
  const [prefs, setPrefs] = useState<UserPreferences>(notificationService.getPreferences());
  const [saved, setSaved] = useState(false);

  const handleToggleChannel = (channelKey: 'inAppEnabled' | 'pushEnabled' | 'emailEnabled' | 'webhookEnabled') => {
    const updated: UserPreferences = {
      ...prefs,
      [channelKey]: !prefs[channelKey],
    };
    setPrefs(updated);
    notificationService.updatePreferences(updated);
    triggerSaveAlert();
  };

  const handleToggleSound = () => {
    const updated: UserPreferences = {
      ...prefs,
      soundEnabled: !prefs.soundEnabled,
    };
    setPrefs(updated);
    notificationService.updatePreferences(updated);
    if (updated.soundEnabled) {
      playNotificationChime('normal');
    }
    triggerSaveAlert();
  };

  const triggerSaveAlert = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                <Sliders className="h-3 w-3 text-indigo-400" />
                Notification Preferences & Routing
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Cấu hình Thông báo & Kênh Phân phối
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Tùy chỉnh các kênh nhận thông báo (In-app, Realtime Push, Email, Webhook), chế độ Quiet Hours và âm thanh cảnh báo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {saved && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Check className="h-3.5 w-3.5" />
                <span>Saved to Supabase!</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Delivery Channels Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Bell className="h-4 w-4 text-emerald-400" />
          <span>Global Delivery Channels</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* In-App */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Radio className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">In-App Live Realtime</span>
                <span className="text-[11px] text-slate-400">PostgreSQL WAL WebSockets</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.inAppEnabled}
                onChange={() => handleToggleChannel('inAppEnabled')}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Web Push */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Browser Push (FCM/VAPID)</span>
                <span className="text-[11px] text-slate-400">Desktop & Mobile banner</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.pushEnabled}
                onChange={() => handleToggleChannel('pushEnabled')}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {/* Email Digest */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Email Dispatch (Resend / SMTP)</span>
                <span className="text-[11px] text-slate-400">Digest & Critical security alerts</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.emailEnabled}
                onChange={() => handleToggleChannel('emailEnabled')}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
            </label>
          </div>

          {/* Webhooks / Kafka Bridge */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Outbound Webhooks</span>
                <span className="text-[11px] text-slate-400">Database Webhooks & Kafka bridge</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.webhookEnabled}
                onChange={() => handleToggleChannel('webhookEnabled')}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Audio Chime & Quiet Hours */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        
        {/* Audio Chime */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              {prefs.soundEnabled ? (
                <Volume2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <VolumeX className="h-4 w-4 text-slate-500" />
              )}
              <span>Web Audio Chimes</span>
            </h4>
            <button
              onClick={handleToggleSound}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                prefs.soundEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {prefs.soundEnabled ? 'Enabled' : 'Muted'}
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Plays pleasant acoustic harmonic chimes upon new notification delivery according to priority level.
          </p>
          <button
            onClick={() => playNotificationChime('urgent')}
            className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium"
          >
            Preview Urgent Harmonic Chime
          </button>
        </div>

        {/* Quiet Hours */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-400" />
              <span>Quiet Hours</span>
            </h4>
            <span className="text-xs text-emerald-400 font-mono">
              {prefs.quietHours.startTime} - {prefs.quietHours.endTime}
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Automatically silences non-urgent push and email notifications during configured hours.
          </p>
        </div>
      </div>
    </div>
  );
};
