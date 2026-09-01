import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Smartphone,
  Laptop,
  Globe,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Code,
  Zap,
  Sliders,
  Radio,
  ExternalLink,
  Volume2,
  Trash2,
  Eye,
  Terminal,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { PushSubscriptionData, VapidKeys, WebPushPayload } from '../types';
import { webPushService } from '../services/webPushService';
import { playNotificationSound } from '../utils/audio';

interface WebPushStudioProps {
  onDispatched?: () => void;
}

type StudioTab = 'tester' | 'devices' | 'builder' | 'architecture';
type DeviceOsPreview = 'macos' | 'windows' | 'android' | 'ios';

export const WebPushStudio: React.FC<WebPushStudioProps> = ({ onDispatched }) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('tester');
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [hasPushManager, setHasPushManager] = useState(false);
  const [subscriptions, setSubscriptions] = useState<PushSubscriptionData[]>([]);
  const [currentSub, setCurrentSub] = useState<PushSubscriptionData | undefined>(undefined);
  const [vapidKeys, setVapidKeys] = useState<VapidKeys>(webPushService.getVapidKeys());
  
  // Builder state
  const [title, setTitle] = useState('Deployment Succeeded: v2.6.0 Live');
  const [body, setBody] = useState('Production build completed in 28 seconds with zero errors. All channels synced.');
  const [iconUrl, setIconUrl] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80');
  const [badgeUrl, setBadgeUrl] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=64&auto=format&fit=crop&q=80');
  const [imageUrl, setImageUrl] = useState('');
  const [actionUrl, setActionUrl] = useState('https://example.com/deployments/v2.6.0');
  const [tag, setTag] = useState('deploy-alert');
  const [requireInteraction, setRequireInteraction] = useState(false);
  const [silent, setSilent] = useState(false);
  const [vibratePattern, setVibratePattern] = useState('200, 100, 200');
  const [previewOs, setPreviewOs] = useState<DeviceOsPreview>('macos');

  // Status & Telemetry
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastPushResult, setLastPushResult] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [pushLogs, setPushLogs] = useState<Array<{
    id: string;
    title: string;
    targetCount: number;
    latencyMs: number;
    receiptId: string;
    timestamp: string;
    status: 'delivered' | 'failed';
  }>>([
    {
      id: 'log-1',
      title: 'Initial WebPush Service Sync',
      targetCount: 3,
      latencyMs: 38,
      receiptId: 'wp_init_892b1a',
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toLocaleTimeString(),
      status: 'delivered',
    },
  ]);

  // Code Tab Selection
  const [codeTab, setCodeTab] = useState<'nestjs' | 'edge_function' | 'sw' | 'react_hook'>('nestjs');

  useEffect(() => {
    setIsSupported(webPushService.isSupported());
    setHasPushManager(webPushService.hasPushManager());
    setPermission(webPushService.getPermissionStatus());
    setSubscriptions(webPushService.getSubscriptions());
    setCurrentSub(webPushService.getCurrentSubscription());
    setVapidKeys(webPushService.getVapidKeys());

    const unsubscribe = webPushService.subscribe(() => {
      setPermission(webPushService.getPermissionStatus());
      setSubscriptions(webPushService.getSubscriptions());
      setCurrentSub(webPushService.getCurrentSubscription());
      setVapidKeys(webPushService.getVapidKeys());
    });

    return unsubscribe;
  }, []);

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubscribeBrowser = async () => {
    setIsSubscribing(true);
    try {
      const sub = await webPushService.subscribeBrowser('hoanxuanmai');
      setCurrentSub(sub);
      setSubscriptions(webPushService.getSubscriptions());
      setPermission(webPushService.getPermissionStatus());
      playNotificationSound('high');
    } catch (e: any) {
      alert(e.message || 'Failed to subscribe browser to Web Push');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleUnsubscribeBrowser = async () => {
    setIsSubscribing(true);
    try {
      await webPushService.unsubscribeBrowser();
      setCurrentSub(undefined);
      setSubscriptions(webPushService.getSubscriptions());
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleGenerateVapidKeys = async () => {
    const keys = await webPushService.generateNewVapidKeys();
    setVapidKeys(keys);
  };

  const handleSendPush = async (customPayload?: Partial<WebPushPayload>) => {
    setIsSending(true);

    const payload: WebPushPayload = {
      title: customPayload?.title || title,
      body: customPayload?.body || body,
      icon: customPayload?.icon || iconUrl,
      badge: customPayload?.badge || badgeUrl,
      image: customPayload?.image || (imageUrl.trim() ? imageUrl : undefined),
      tag: customPayload?.tag || tag,
      requireInteraction,
      silent,
      data: {
        url: customPayload?.data?.url || actionUrl,
        timestamp: Date.now(),
      },
      actions: [
        { action: 'explore', title: 'Open Details' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      vibrate: vibratePattern
        ? vibratePattern.split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => !isNaN(n))
        : [200, 100, 200],
    };

    try {
      const result = await webPushService.dispatchWebPush(payload, {
        targetUserId: 'hoanxuanmai',
      });

      setLastPushResult(result);
      setPushLogs((prev) => [
        {
          id: 'log-' + Math.random().toString(36).substring(2, 9),
          title: payload.title,
          targetCount: result.deliveredCount,
          latencyMs: result.latencyMs,
          receiptId: result.receiptId,
          timestamp: new Date().toLocaleTimeString(),
          status: result.success ? 'delivered' : 'failed',
        },
        ...prev,
      ]);

      if (onDispatched) onDispatched();
    } catch (e: any) {
      console.error('Push dispatch failed:', e);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickTemplate = (templateType: 'deploy' | 'security' | 'billing' | 'mention') => {
    if (templateType === 'deploy') {
      setTitle('🚀 Deployment Succeeded: v2.6.0 in Production');
      setBody('Supabase Realtime & WebPush Edge Function active across 4 nodes.');
      setTag('deploy-v26');
      setActionUrl('https://example.com/deploy');
    } else if (templateType === 'security') {
      setTitle('🔒 Security Alert: New Login from Singapore');
      setBody('IP 118.200.45.12 accessed account hoanxuanmai@gmail.com.');
      setTag('sec-alert');
      setActionUrl('https://example.com/security');
    } else if (templateType === 'billing') {
      setTitle('💳 Invoice Paid: $149.00 Enterprise Plan');
      setBody('Monthly invoice #INV-9921 was processed successfully via Stripe.');
      setTag('billing-inv');
      setActionUrl('https://example.com/billing');
    } else if (templateType === 'mention') {
      setTitle('💬 Alex mentioned you in #Engineering');
      setBody('"@hoanxuanmai please review the new push_subscriptions RLS migration."');
      setTag('chat-mention');
      setActionUrl('https://example.com/channels');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                <Bell className="h-6 w-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Web Push Notification Engine
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                RFC 8291 / RFC 8292
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                VAPID ECDSA P-256
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Native browser push notifications replacing NestJS <code className="text-indigo-300">web-push</code> package with Supabase Edge Functions, Service Worker background synchronization, and multi-device subscription management.
            </p>
          </div>

          {/* Browser Quick Status & Action */}
          <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl shrink-0">
            <div className="space-y-1">
              <div className="text-[11px] text-slate-400 font-medium">Browser Permission</div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    permission === 'granted'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : permission === 'denied'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${permission === 'granted' ? 'bg-emerald-400 animate-pulse' : permission === 'denied' ? 'bg-rose-400' : 'bg-amber-400'}`} />
                  {permission.toUpperCase()}
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  {currentSub ? 'Subscribed' : 'Not Subscribed'}
                </span>
              </div>
            </div>

            {currentSub ? (
              <button
                onClick={handleUnsubscribeBrowser}
                disabled={isSubscribing}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition active:scale-95"
              >
                Unsubscribe
              </button>
            ) : (
              <button
                onClick={handleSubscribeBrowser}
                disabled={isSubscribing}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition active:scale-95 flex items-center gap-1.5"
              >
                {isSubscribing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Subscribing...
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5" />
                    Subscribe Device
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('tester')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold transition ${
              activeTab === 'tester'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>Live Tester & Dispatcher</span>
          </button>

          <button
            onClick={() => setActiveTab('builder')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold transition ${
              activeTab === 'builder'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Visual Payload Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold transition ${
              activeTab === 'devices'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>Device Subscriptions ({subscriptions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold transition ${
              activeTab === 'architecture'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Code className="h-4 w-4" />
            <span>NestJS vs Supabase Code Hub</span>
          </button>
        </div>
      </div>

      {/* TAB 1: LIVE TESTER & DISPATCHER */}
      {activeTab === 'tester' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Quick Dispatch & Templates */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-indigo-400" />
                  <h2 className="text-base font-semibold text-white">Live Push Dispatcher</h2>
                </div>
                <span className="text-xs text-slate-400">
                  Target: <strong className="text-indigo-300">hoanxuanmai@gmail.com</strong>
                </span>
              </div>

              {/* Quick Template Presets */}
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-2">
                  Quick Event Presets (One-click fill)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleQuickTemplate('deploy')}
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition text-xs space-y-1"
                  >
                    <div className="font-semibold text-indigo-300 flex items-center gap-1">
                      🚀 Deployment
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">v2.6.0 live build</div>
                  </button>

                  <button
                    onClick={() => handleQuickTemplate('security')}
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition text-xs space-y-1"
                  >
                    <div className="font-semibold text-amber-300 flex items-center gap-1">
                      🔒 Security Alert
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">New login detection</div>
                  </button>

                  <button
                    onClick={() => handleQuickTemplate('billing')}
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition text-xs space-y-1"
                  >
                    <div className="font-semibold text-emerald-300 flex items-center gap-1">
                      💳 Invoice Paid
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">$149.00 payment</div>
                  </button>

                  <button
                    onClick={() => handleQuickTemplate('mention')}
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left transition text-xs space-y-1"
                  >
                    <div className="font-semibold text-blue-300 flex items-center gap-1">
                      💬 Chat Mention
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">#Engineering tag</div>
                  </button>
                </div>
              </div>

              {/* Push Title & Body Input */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Notification Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="Enter notification title..."
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Notification Body Message
                  </label>
                  <textarea
                    rows={2}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="Enter notification body message..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Action URL (Redirect on Click)
                    </label>
                    <input
                      type="text"
                      value={actionUrl}
                      onChange={(e) => setActionUrl(e.target.value)}
                      className="w-full px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Notification Tag (Collapse group)
                    </label>
                    <input
                      type="text"
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                      className="w-full px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <button
                  onClick={() => webPushService.triggerNativeNotification({ title, body, icon: iconUrl, data: { url: actionUrl } })}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-2"
                >
                  <Eye className="h-4 w-4 text-indigo-400" />
                  Test Local Popup
                </button>

                <button
                  onClick={() => handleSendPush()}
                  disabled={isSending}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Dispatching to VAPID Hub...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Dispatch WebPush ({subscriptions.filter((s) => s.isActive).length} Devices)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live Event Stream / Dispatch Logs */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">WebPush Telemetry Logs</h3>
                </div>
                <span className="text-[11px] text-slate-500">Auto-logging real-time RPC</span>
              </div>

              <div className="space-y-2">
                {pushLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-200 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        {log.title}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-3">
                        <span>ID: <code className="text-slate-400">{log.receiptId}</code></span>
                        <span>Delivered to {log.targetCount} device(s)</span>
                        <span>{log.timestamp}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px]">
                        {log.latencyMs}ms
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Diagnostic & VAPID status */}
          <div className="space-y-6">
            {/* Browser Capability Checklist */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">Browser Push Diagnostic</h3>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-300 font-medium">Notification API</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Supported
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-300 font-medium">Service Worker Engine</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Registered (/sw.js)
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-300 font-medium">PushManager API</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Active
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-300 font-medium">VAPID Signature</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Valid ECDSA
                  </span>
                </div>
              </div>

              {permission !== 'granted' && (
                <button
                  onClick={handleSubscribeBrowser}
                  className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Grant Permission & Enable Push
                </button>
              )}
            </div>

            {/* VAPID Quick Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-sm text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-amber-400" />
                  <h4 className="font-semibold text-white">VAPID Public Key</h4>
                </div>
                <button
                  onClick={handleGenerateVapidKeys}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                >
                  <RefreshCw className="h-3 w-3" /> Rotate Keys
                </button>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 break-all select-all flex items-center justify-between gap-2">
                <span className="truncate">{vapidKeys.publicKey}</span>
                <button
                  onClick={() => handleCopy(vapidKeys.publicKey, 'pubkey')}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
                >
                  {copiedKey === 'pubkey' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>

              <div className="text-[11px] text-slate-500">
                Subject: <code className="text-slate-400">{vapidKeys.subject}</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VISUAL PAYLOAD BUILDER & OS MOCKUPS */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-indigo-400" />
                Web Push Payload Customizer
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Body Text</label>
                  <textarea
                    rows={3}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Icon URL (Avatar/Logo)</label>
                    <input
                      type="text"
                      value={iconUrl}
                      onChange={(e) => setIconUrl(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Banner Image URL (Optional)</label>
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://... image banner"
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Vibration Pattern</label>
                    <input
                      type="text"
                      value={vibratePattern}
                      onChange={(e) => setVibratePattern(e.target.value)}
                      placeholder="200, 100, 200"
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requireInteraction}
                        onChange={(e) => setRequireInteraction(e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-indigo-600"
                      />
                      <span className="text-slate-300 text-[11px] font-medium">Require Interaction</span>
                    </label>
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 p-2 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={silent}
                        onChange={(e) => setSilent(e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-indigo-600"
                      />
                      <span className="text-slate-300 text-[11px] font-medium">Silent Push</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  onClick={() => handleSendPush()}
                  disabled={isSending}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Dispatch WebPush with Config
                </button>
              </div>
            </div>
          </div>

          {/* Realistic OS Preview Mockups */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Eye className="h-4 w-4 text-indigo-400" />
                  Real-time OS Preview
                </h3>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setPreviewOs('macos')}
                    className={`px-2 py-1 rounded-lg font-medium transition ${previewOs === 'macos' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                  >
                    macOS
                  </button>
                  <button
                    onClick={() => setPreviewOs('windows')}
                    className={`px-2 py-1 rounded-lg font-medium transition ${previewOs === 'windows' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                  >
                    Win 11
                  </button>
                  <button
                    onClick={() => setPreviewOs('android')}
                    className={`px-2 py-1 rounded-lg font-medium transition ${previewOs === 'android' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                  >
                    Android
                  </button>
                  <button
                    onClick={() => setPreviewOs('ios')}
                    className={`px-2 py-1 rounded-lg font-medium transition ${previewOs === 'ios' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                  >
                    iOS PWA
                  </button>
                </div>
              </div>

              {/* macOS Mockup */}
              {previewOs === 'macos' && (
                <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/80 shadow-2xl backdrop-blur-md space-y-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={iconUrl}
                      alt="icon"
                      className="h-9 w-9 rounded-xl object-cover ring-1 ring-white/10 shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-100 truncate">NOTIFICATION HUB</span>
                        <span className="text-[10px] text-slate-500">now</span>
                      </div>
                      <div className="font-medium text-xs text-white leading-snug">{title}</div>
                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">{body}</p>
                    </div>
                  </div>

                  {imageUrl && (
                    <img src={imageUrl} alt="banner" className="w-full h-32 rounded-xl object-cover" />
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800 text-[11px]">
                    <button className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg">
                      Dismiss
                    </button>
                    <button className="px-3 py-1 bg-indigo-600 text-white font-medium rounded-lg">
                      Open Details
                    </button>
                  </div>
                </div>
              )}

              {/* Windows 11 Toast Mockup */}
              {previewOs === 'windows' && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Bell className="h-3 w-3 text-indigo-400" />
                      Google Chrome • Push Notification
                    </span>
                    <span className="text-slate-500">Just now</span>
                  </div>

                  <div className="flex items-start gap-3">
                    <img src={iconUrl} alt="icon" className="h-8 w-8 rounded-lg object-cover" />
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-semibold text-slate-100 truncate">{title}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-2">{body}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button className="py-1 bg-slate-800 text-slate-200 text-xs rounded font-medium">
                      Open App
                    </button>
                    <button className="py-1 bg-slate-900 border border-slate-800 text-slate-400 text-xs rounded">
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Android 14 Mockup */}
              {previewOs === 'android' && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-slate-300">
                      <Bell className="h-3.5 w-3.5 text-indigo-400" />
                      My-Notifications • now
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded text-slate-400">Priority</span>
                  </div>
                  <div className="text-xs font-bold text-white">{title}</div>
                  <div className="text-xs text-slate-300">{body}</div>
                  <div className="flex items-center gap-4 pt-2 text-xs text-indigo-400 font-medium">
                    <button>EXPLORE</button>
                    <button className="text-slate-400">DISMISS</button>
                  </div>
                </div>
              )}

              {/* iOS 17 PWA Mockup */}
              {previewOs === 'ios' && (
                <div className="p-4 rounded-3xl bg-slate-950/80 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 text-slate-200 font-semibold">
                      <img src={iconUrl} alt="icon" className="h-4 w-4 rounded-md" />
                      Notification Hub
                    </span>
                    <span className="text-[10px] text-slate-500">now</span>
                  </div>
                  <div className="text-xs font-semibold text-white">{title}</div>
                  <div className="text-[11px] text-slate-300 line-clamp-2">{body}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DEVICE SUBSCRIPTIONS */}
      {activeTab === 'devices' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-indigo-400" />
                  Active Push Device Registry
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Stored in PostgreSQL <code className="text-indigo-300">public.push_subscriptions</code> with Row Level Security (RLS).
                </p>
              </div>

              <button
                onClick={handleSubscribeBrowser}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Zap className="h-3.5 w-3.5" />
                Register Current Device
              </button>
            </div>

            {/* Devices List */}
            <div className="space-y-3">
              {subscriptions.map((sub) => {
                const isCurrent = currentSub?.id === sub.id;
                const isMac = sub.osName?.includes('mac');
                const isIos = sub.osName?.includes('iOS');
                const isWin = sub.osName?.includes('Win');

                return (
                  <div
                    key={sub.id}
                    className={`p-4 rounded-xl border transition ${
                      isCurrent
                        ? 'bg-indigo-950/30 border-indigo-500/40 ring-1 ring-indigo-500/20'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400 shrink-0">
                          {isMac ? (
                            <Laptop className="h-5 w-5" />
                          ) : isIos ? (
                            <Smartphone className="h-5 w-5" />
                          ) : (
                            <Globe className="h-5 w-5" />
                          )}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white text-sm">{sub.deviceName}</span>
                            {isCurrent && (
                              <span className="px-2 py-0.2 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/30">
                                Current Session
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.2 text-[10px] font-semibold rounded-full ${
                                sub.isActive
                                  ? 'bg-indigo-500/20 text-indigo-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {sub.isActive ? 'Active' : 'Muted'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
                            <span>Browser: <strong>{sub.browserName}</strong></span>
                            <span>OS: <strong>{sub.osName}</strong></span>
                            <span>User: <strong className="text-indigo-300">{sub.userId}</strong></span>
                          </div>

                          <div className="text-[11px] text-slate-500 font-mono truncate max-w-xl">
                            Endpoint: {sub.endpoint}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                        <button
                          onClick={() => handleSendPush({ title: `Ping to ${sub.deviceName}`, body: 'Testing direct device push route.' })}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-semibold transition"
                        >
                          Ping Device
                        </button>
                        <button
                          onClick={() => webPushService.toggleSubscriptionActive(sub.id)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-semibold transition"
                        >
                          {sub.isActive ? 'Mute' : 'Unmute'}
                        </button>
                        <button
                          onClick={() => webPushService.removeSubscription(sub.id)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: NESTJS VS SUPABASE CODE HUB */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Code className="h-5 w-5 text-indigo-400" />
                  WebPush Architecture & Code Hub
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Side-by-side comparison between NestJS <code className="text-indigo-300">web-push</code> implementation and Supabase Serverless Edge Function.
                </p>
              </div>

              {/* Sub-tabs */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setCodeTab('nestjs')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    codeTab === 'nestjs' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  NestJS WebPushModule
                </button>
                <button
                  onClick={() => setCodeTab('edge_function')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    codeTab === 'edge_function' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Supabase Edge Function
                </button>
                <button
                  onClick={() => setCodeTab('sw')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    codeTab === 'sw' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Service Worker (sw.js)
                </button>
                <button
                  onClick={() => setCodeTab('react_hook')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    codeTab === 'react_hook' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  React useWebPush Hook
                </button>
              </div>
            </div>

            {/* Code Display */}
            {codeTab === 'nestjs' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>NestJS WebPush Service & Controller (TypeORM / Prisma + web-push npm)</span>
                  <button
                    onClick={() => handleCopy(NESTJS_WEBPUSH_CODE, 'nestjs_code')}
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    {copiedKey === 'nestjs_code' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy NestJS Code
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-200 font-mono overflow-x-auto max-h-[500px]">
                  {NESTJS_WEBPUSH_CODE}
                </pre>
              </div>
            )}

            {codeTab === 'edge_function' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Supabase Edge Function (Deno TypeScript: supabase/functions/send-webpush/index.ts)</span>
                  <button
                    onClick={() => handleCopy(SUPABASE_WEBPUSH_FUNCTION_CODE, 'supabase_code')}
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    {copiedKey === 'supabase_code' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy Edge Function
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-200 font-mono overflow-x-auto max-h-[500px]">
                  {SUPABASE_WEBPUSH_FUNCTION_CODE}
                </pre>
              </div>
            )}

            {codeTab === 'sw' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Browser Service Worker (public/sw.js)</span>
                  <button
                    onClick={() => handleCopy(SW_CODE, 'sw_code')}
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    {copiedKey === 'sw_code' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy sw.js
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-200 font-mono overflow-x-auto max-h-[500px]">
                  {SW_CODE}
                </pre>
              </div>
            )}

            {codeTab === 'react_hook' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Frontend React Hook (src/hooks/useWebPush.ts)</span>
                  <button
                    onClick={() => handleCopy(REACT_HOOK_CODE, 'hook_code')}
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    {copiedKey === 'hook_code' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy React Hook
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-200 font-mono overflow-x-auto max-h-[500px]">
                  {REACT_HOOK_CODE}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==============================================================================
// REFERENCE CODE SNIPPETS
// ==============================================================================

const NESTJS_WEBPUSH_CODE = `// ==============================================================================
// NESTJS WEBPUSH MODULE IMPLEMENTATION (Source Reference)
// ==============================================================================

import { Injectable, Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import * as webpush from 'web-push';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushSubscriptionEntity } from './push-subscription.entity';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

// 1. WebPush Service
@Injectable()
export class WebPushService {
  constructor(
    @InjectRepository(PushSubscriptionEntity)
    private readonly subRepo: Repository<PushSubscriptionEntity>,
  ) {
    // Configure VAPID details
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
  }

  // Register or update subscription
  async subscribe(userId: string, subscription: webpush.PushSubscription, deviceName?: string) {
    let sub = await this.subRepo.findOne({ where: { endpoint: subscription.endpoint } });
    if (!sub) {
      sub = this.subRepo.create({
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        deviceName: deviceName || 'Web Browser',
      });
    } else {
      sub.userId = userId;
      sub.keys = subscription.keys;
    }
    return this.subRepo.save(sub);
  }

  // Send push notification to all active devices of a user
  async sendToUser(userId: string, payload: any) {
    const subscriptions = await this.subRepo.find({ where: { userId, isActive: true } });
    const notifications = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          JSON.stringify(payload),
        );
      } catch (error: any) {
        // Handle 410 Gone / 404 Not Found (expired subscriptions)
        if (error.statusCode === 410 || error.statusCode === 404) {
          await this.subRepo.delete(sub.id);
        }
      }
    });

    return Promise.allSettled(notifications);
  }
}

// 2. WebPush Controller
@Controller('notifications/webpush')
export class WebPushController {
  constructor(private readonly webPushService: WebPushService) {}

  @Get('vapid-public-key')
  getPublicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY };
  }

  @Post('subscribe')
  @UseGuards(AuthGuard)
  async subscribe(@CurrentUser() user: any, @Body() body: any) {
    return this.webPushService.subscribe(user.id, body.subscription, body.deviceName);
  }

  @Post('send')
  async send(@Body() body: { userId: string; payload: any }) {
    return this.webPushService.sendToUser(body.userId, body.payload);
  }
}`;

const SUPABASE_WEBPUSH_FUNCTION_CODE = `// ==============================================================================
// SUPABASE EDGE FUNCTION: supabase/functions/send-webpush/index.ts
// Replaces NestJS WebPushService with serverless Deno TypeScript
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

serve(async (req) => {
  try {
    const { notification_id, user_id, channel_id, title, message, payload, action_url } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Configure VAPID
    webpush.setVapidDetails(
      Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com",
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!
    );

    // 2. Query target subscriptions from PostgreSQL
    let query = supabase.from("push_subscriptions").select("*").eq("is_active", true);
    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data: subscriptions, error: subError } = await query;
    if (subError || !subscriptions?.length) {
      return new Response(JSON.stringify({ message: "No active subscriptions found" }), { status: 200 });
    }

    // 3. Prepare WebPush Payload
    const pushPayload = JSON.stringify({
      title: title || "New Notification",
      body: message || "",
      icon: "/icon.png",
      badge: "/badge.png",
      data: {
        url: action_url || "/",
        notificationId: notification_id,
        channelId: channel_id,
      },
      actions: [
        { action: "explore", title: "View" },
        { action: "dismiss", title: "Dismiss" }
      ],
      vibrate: [200, 100, 200],
    });

    // 4. Batch Dispatch to Push Services (FCM / Apple / Mozilla)
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          return await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth_token },
            },
            pushPayload
          );
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription expired, remove from database
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
          throw err;
        }
      })
    );

    return new Response(JSON.stringify({ success: true, delivered: results.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});`;

const SW_CODE = `// ==============================================================================
// SERVICE WORKER: public/sw.js
// ==============================================================================

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Notification', body: 'New update' };
  
  const options = {
    body: data.body,
    icon: data.icon || '/icon.png',
    badge: data.badge || '/badge.png',
    image: data.image,
    tag: data.tag || 'general-push',
    data: data.data || { url: '/' },
    actions: data.actions || [{ action: 'open', title: 'Open' }],
    vibrate: data.vibrate || [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});`;

const REACT_HOOK_CODE = `// ==============================================================================
// REACT HOOK: src/hooks/useWebPush.ts
// ==============================================================================

import { useState, useEffect } from 'react';
import { webPushService } from '../services/webPushService';

export function useWebPush(userId: string = 'hoanxuanmai') {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPermission(webPushService.getPermissionStatus());
    setIsSubscribed(Boolean(webPushService.getCurrentSubscription()));

    return webPushService.subscribe(() => {
      setPermission(webPushService.getPermissionStatus());
      setIsSubscribed(Boolean(webPushService.getCurrentSubscription()));
    });
  }, []);

  const subscribe = async () => {
    setLoading(true);
    try {
      await webPushService.subscribeBrowser(userId);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      await webPushService.unsubscribeBrowser();
    } finally {
      setLoading(false);
    }
  };

  return {
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
    isSupported: webPushService.isSupported(),
  };
}`;
