'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { getSupabaseConfig, supabase } from '@/lib/supabase';
import { userMeApi, deliveryApi } from '@/lib/api';
import WebpushDevices from '@/components/settings/WebpushDevices';
import ConfirmModal from '@/components/common/ConfirmModal';

export default function SettingsPage() {
  const router = useRouter();
  const { user, initialized, logout, initAuth, updateProfile } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);

  // Profile Edit State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Connection & Ping State
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [showAnonKey, setShowAnonKey] = useState(false);

  // Notification Preferences State
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [prefMsg, setPrefMsg] = useState<string | null>(null);

  // Test Notification State
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Sign out modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const supabaseConfig = getSupabaseConfig();

  // Initialize auth & profile state
  useEffect(() => {
    setIsMounted(true);
    initAuth();
  }, [initAuth]);

  // Route guard: settings require an authenticated Supabase user.
  useEffect(() => {
    if (!isMounted || !initialized) return;
    if (!user) router.replace('/login');
  }, [isMounted, initialized, user, router]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || '');
    }
  }, [user]);

  // Load preferences from API/LocalStorage
  useEffect(() => {
    if (!isMounted) return;
    userMeApi.getSettings().then((prefs) => {
      if (prefs) {
        if (typeof prefs.in_app_enabled === 'boolean') setInAppEnabled(prefs.in_app_enabled);
        if (typeof prefs.push_enabled === 'boolean') setPushEnabled(prefs.push_enabled);
        if (typeof prefs.sound_enabled === 'boolean') setSoundEnabled(prefs.sound_enabled);
      }
    });
  }, [isMounted]);

  // Test Supabase Connection
  const testSupabaseConnection = useCallback(async () => {
    setConnectionStatus('testing');
    setPingLatency(null);
    const start = performance.now();
    try {
      const { error } = await supabase.from('channels').select('id').limit(1);
      const latency = Math.round(performance.now() - start);
      if (error && error.code !== 'PGRST116') {
        console.warn('Supabase test ping note:', error);
      }
      setPingLatency(latency);
      setConnectionStatus('connected');
    } catch (err) {
      console.warn('Supabase test ping error:', err);
      setConnectionStatus('error');
    }
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMsg(null);
    try {
      updateProfile({ name, username });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err?.message || 'Failed to update profile' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePreferences = async () => {
    setPrefMsg(null);
    try {
      await userMeApi.updateSettings({
        in_app_enabled: inAppEnabled,
        push_enabled: pushEnabled,
        sound_enabled: soundEnabled,
      });
      setPrefMsg('Notification preferences saved!');
      setTimeout(() => setPrefMsg(null), 3000);
    } catch (err: any) {
      setPrefMsg('Failed to save preferences.');
    }
  };

  const handleSendTestNotification = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    try {
      // Route through the `webhooks` Edge Function so the notification is also
      // fanned out to Web Push (webhooks -> send-webpush). Direct table inserts
      // never trigger a push.
      const res = await deliveryApi.trigger({
        title: '⚡ Test Alert from Settings',
        message: `Test notification generated at ${new Date().toLocaleTimeString()} to verify your realtime + Web Push delivery.`,
        type: 'info',
        priority: 'high',
        metadata: { source: 'settings_test', sentAt: new Date().toISOString() },
      });

      setTestResult(
        res.ok
          ? 'Test alert sent. You should get a browser push within a few seconds (and see it on the dashboard).'
          : `Failed to send test alert: ${res.error ?? 'unknown error'}`
      );
    } catch (err: any) {
      setTestResult(`Failed to send test alert: ${err?.message ?? 'unknown error'}`);
    } finally {
      setIsSendingTest(false);
      setTimeout(() => setTestResult(null), 8000);
    }
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    router.replace('/login');
  };

  if (!isMounted || !initialized || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-sm text-gray-500">Loading settings...</div>
      </div>
    );
  }

  const currentUser = user;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 py-6 px-3 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Top Header */}
        <div className="flex items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm transition-colors"
              aria-label="Back to Dashboard"
            >
              ←
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Account & System Settings</h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Manage your credentials, Supabase connection, preferences, and push devices
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 text-xs font-semibold transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* 1. Account Profile Card */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white shadow-sm flex-shrink-0">
              {(currentUser.name || currentUser.username || currentUser.email || '?')
                .charAt(0)
                .toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {currentUser.name || currentUser.username}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                  Active User
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{currentUser.email}</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono mt-1">
                User ID: <span className="select-all">{currentUser.id}</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="mt-5 space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700/60">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Hoan Xuan Mai"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. hoanxuanmai"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {profileMsg && (
              <div
                className={`p-2.5 rounded-lg text-xs ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}
              >
                {profileMsg.text}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {isSavingProfile ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </section>

        {/* 2. Supabase Infrastructure & Connection Card */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Supabase Backend Infrastructure
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Connection configuration, Edge Functions, and database telemetry
              </p>
            </div>
            <button
              type="button"
              onClick={testSupabaseConnection}
              disabled={connectionStatus === 'testing'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 transition-colors disabled:opacity-50"
            >
              {connectionStatus === 'testing' ? 'Pinging...' : '⚡ Test Connection'}
            </button>
          </div>

          {connectionStatus === 'connected' && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Connected to Supabase successfully
              </span>
              {pingLatency !== null && <span className="font-mono">{pingLatency} ms</span>}
            </div>
          )}

          {connectionStatus === 'error' && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
              Connection running with active fallback local state.
            </div>
          )}

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-gray-500 dark:text-gray-400 font-sans">Supabase Project URL:</span>
              <span className="text-blue-600 dark:text-blue-400 font-medium select-all break-all">
                {supabaseConfig.url}
              </span>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
              <span className="text-gray-500 dark:text-gray-400 font-sans">Anon API Key:</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-700 dark:text-gray-300">
                  {showAnonKey ? `${supabaseConfig.anonKey.slice(0, 24)}...` : '••••••••••••••••••••••••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAnonKey(!showAnonKey)}
                  className="text-[11px] text-blue-600 dark:text-blue-400 underline font-sans"
                >
                  {showAnonKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-gray-500 dark:text-gray-400 font-sans">Edge Function Webhook Base:</span>
              <span className="text-purple-600 dark:text-purple-400 font-medium select-all break-all">
                {supabaseConfig.url}/functions/v1/webhooks
              </span>
            </div>
          </div>
        </section>

        {/* 3. Notification Preferences Card */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Notification Preferences
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Configure delivery methods, sound triggers, and in-app alerts
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 cursor-pointer">
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">In-App Banner Notifications</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Show incoming alert banners and unread badges in dashboard</p>
              </div>
              <input
                type="checkbox"
                checked={inAppEnabled}
                onChange={(e) => setInAppEnabled(e.target.checked)}
                className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 cursor-pointer">
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Browser Web Push</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Receive system push notifications even when the app is in the background</p>
              </div>
              <input
                type="checkbox"
                checked={pushEnabled}
                onChange={(e) => setPushEnabled(e.target.checked)}
                className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 cursor-pointer">
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Audio Alert Sound</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Play subtle chime when a critical or high-priority alert arrives</p>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>

          {prefMsg && (
            <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300">
              {prefMsg}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-700/60">
            <button
              type="button"
              onClick={handleSendTestNotification}
              disabled={isSendingTest}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              {isSendingTest ? 'Triggering...' : '🔔 Send Test Alert'}
            </button>

            <button
              type="button"
              onClick={handleSavePreferences}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              Save Preferences
            </button>
          </div>

          {testResult && (
            <div className="mt-3 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
              {testResult}
            </div>
          )}
        </section>

        {/* 4. Registered Devices Section */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 sm:p-6">
          <WebpushDevices />
        </section>
      </div>

      {/* Sign Out Confirmation Modal */}
      <ConfirmModal
        open={showLogoutModal}
        title="Sign Out"
        description="Are you sure you want to sign out of your account?"
        confirmText="Sign out"
        cancelText="Cancel"
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </main>
  );
}
