import React, { useState } from 'react';
import {
  Send,
  Sparkles,
  Zap,
  ShieldAlert,
  CreditCard,
  CheckSquare,
  Activity,
  Layers,
  Radio,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ExternalLink,
  Code,
  Terminal,
} from 'lucide-react';
import { NotificationChannel, NotificationPriority, NotificationCategory, DeliveryLog } from '../types';
import { notificationService } from '../services/notificationService';
import confetti from 'canvas-confetti';

interface DispatcherLabProps {
  deliveryLogs: DeliveryLog[];
  onDispatched?: () => void;
}

export const DispatcherLab: React.FC<DispatcherLabProps> = ({ deliveryLogs, onDispatched }) => {
  const [title, setTitle] = useState('Deployment Succeeded: v2.5.0 in Production');
  const [message, setMessage] = useState('Build completed in 34 seconds with zero errors. 14 functions updated.');
  const [type, setType] = useState<NotificationCategory>('system');
  const [channel, setChannel] = useState<NotificationChannel>('in_app');
  const [priority, setPriority] = useState<NotificationPriority>('normal');
  const [actionUrl, setActionUrl] = useState('https://dashboard.supabase.com/project/prod');
  const [actionLabel, setActionLabel] = useState('View Deployment Logs');
  const [senderName, setSenderName] = useState('Supabase Deploy Hook');
  const [senderRole, setSenderRole] = useState('DevOps Engine');
  const [targetUserId, setTargetUserId] = useState('usr-dev-9921');
  const [customJsonPayload, setCustomJsonPayload] = useState('{\n  "environment": "production",\n  "commit": "8f39a1c",\n  "buildTimeMs": 34120\n}');
  
  const [isSending, setIsSending] = useState(false);
  const [lastDispatchedId, setLastDispatchedId] = useState<string | null>(null);
  const [activeSimulationMode, setActiveSimulationMode] = useState<'single' | 'batch' | 'kafka'>('single');

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;

    setIsSending(true);
    let parsedPayload = {};
    try {
      if (customJsonPayload.trim()) {
        parsedPayload = JSON.parse(customJsonPayload);
      }
    } catch {
      parsedPayload = { rawText: customJsonPayload };
    }

    try {
      const dispatched = await notificationService.dispatchNotification({
        title,
        message,
        type,
        channel,
        priority,
        actionUrl: actionUrl.trim() || undefined,
        actionLabel: actionLabel.trim() || undefined,
        payload: parsedPayload,
        senderName: senderName.trim() || 'Notification Hub',
        senderRole: senderRole.trim() || 'Dispatcher',
        targetUserId: targetUserId.trim() || undefined,
      });

      setLastDispatchedId(dispatched.id);
      
      // Celebrate with subtle confetti if urgent or high priority
      if (priority === 'urgent' || priority === 'high') {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
        });
      }

      if (onDispatched) onDispatched();
    } catch (err) {
      console.error('Dispatch failed', err);
    } finally {
      setIsSending(false);
    }
  };

  const applyPreset = (presetName: string) => {
    switch (presetName) {
      case 'security':
        setTitle('Security Alert: Multiple Failed Logins');
        setMessage('5 consecutive failed password attempts detected for user admin@company.com from IP 194.26.29.112.');
        setType('security');
        setChannel('push');
        setPriority('urgent');
        setActionUrl('/security/audit');
        setActionLabel('Lock Account');
        setSenderName('Supabase Auth Guard');
        setSenderRole('Security Service');
        setCustomJsonPayload('{\n  "attempts": 5,\n  "ip": "194.26.29.112",\n  "country": "VN"\n}');
        break;
      case 'billing':
        setTitle('Invoice #INV-2026-904 Ready ($49.00)');
        setMessage('Your subscription renewal was processed successfully via Stripe webhook.');
        setType('billing');
        setChannel('email');
        setPriority('normal');
        setActionUrl('/billing/invoices');
        setActionLabel('Download Invoice');
        setSenderName('Stripe Webhook Trigger');
        setSenderRole('Billing Engine');
        setCustomJsonPayload('{\n  "invoiceId": "in_9921",\n  "amount": "$49.00",\n  "plan": "Pro"\n}');
        break;
      case 'kafka':
        setTitle('Kafka Event Ingestion: order.created #9921');
        setMessage('Order #9921 placed by hoanxuanmai@gmail.com for $320.00. Dispatched via Supabase Realtime.');
        setType('tasks');
        setChannel('in_app');
        setPriority('high');
        setActionUrl('/orders/9921');
        setActionLabel('View Order');
        setSenderName('Kafka Consumer Bridge');
        setSenderRole('Event Streamer');
        setCustomJsonPayload('{\n  "orderId": 9921,\n  "customer": "hoanxuanmai@gmail.com",\n  "total": 320.00\n}');
        break;
    }
  };

  const runBatchSimulation = async (count: number = 3) => {
    setIsSending(true);
    for (let i = 1; i <= count; i++) {
      await notificationService.dispatchNotification({
        title: `Batch Test Event #${i} (Realtime WAL Stream)`,
        message: `High-frequency notification burst simulating multi-tenant event stream item ${i}/${count}.`,
        type: i % 2 === 0 ? 'system' : 'updates',
        channel: 'in_app',
        priority: i === 1 ? 'urgent' : 'normal',
        senderName: 'Burst Load Simulator',
        senderRole: 'Stress Tester',
        targetUserId,
      });
      await new Promise((r) => setTimeout(r, 200));
    }
    setIsSending(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Radio className="h-3 w-3 animate-pulse text-emerald-400" />
                Live Notification Dispatcher & Simulator
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Dispatcher Lab & Multi-Channel Pipeline
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Gửi thông báo thử nghiệm qua Supabase Realtime, WebPush, Email, Kafka bridge hoặc Webhook để kiểm tra độ trễ (latency), RLS policies và broadcast pipeline.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => applyPreset('security')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition flex items-center gap-1"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Security Preset</span>
            </button>
            <button
              onClick={() => applyPreset('billing')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition flex items-center gap-1"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Billing Preset</span>
            </button>
            <button
              onClick={() => applyPreset('kafka')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition flex items-center gap-1"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Kafka Preset</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Form Column */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="h-4 w-4 text-emerald-400" />
              <span>Compose Realtime Notification Payload</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              Target: <strong className="text-cyan-400">{targetUserId}</strong>
            </span>
          </div>

          <div className="space-y-3.5">
            {/* Title */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Notification Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Critical Server Alert or New Mention"
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Message Body *
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Details of the notification payload..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 leading-relaxed"
              />
            </div>

            {/* Category & Channel Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Category</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as NotificationCategory)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                >
                  <option value="system">System</option>
                  <option value="security">Security</option>
                  <option value="billing">Billing</option>
                  <option value="tasks">Tasks</option>
                  <option value="social">Social</option>
                  <option value="updates">Updates</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as NotificationChannel)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                >
                  <option value="in_app">In-App (Realtime)</option>
                  <option value="push">Push Notification</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="webhook">Webhook / Kafka</option>
                  <option value="slack">Slack</option>
                  <option value="discord">Discord</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as NotificationPriority)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent (Chime + Alert)</option>
                </select>
              </div>
            </div>

            {/* Action URL & Action Label */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Action URL (Optional)</label>
                <input
                  type="text"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Action Button Text</label>
                <input
                  type="text"
                  value={actionLabel}
                  onChange={(e) => setActionLabel(e.target.value)}
                  placeholder="e.g. Inspect Diff"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                />
              </div>
            </div>

            {/* Sender details & Target user */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Sender Name</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Sender Role</label>
                <input
                  type="text"
                  value={senderRole}
                  onChange={(e) => setSenderRole(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">Recipient User ID / Email</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setTargetUserId('admin@app.com')}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition"
                    >
                      admin@app.com
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetUserId('hoanxuanmai')}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition"
                    >
                      hoanxuanmai
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetUserId('*')}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition"
                    >
                      * (All)
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-300 font-mono"
                />
              </div>
            </div>

            {/* JSON Payload */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Custom JSONB Payload
                </label>
                <span className="text-[10px] text-slate-500">Saved to PostgreSQL JSONB column</span>
              </div>
              <textarea
                rows={3}
                value={customJsonPayload}
                onChange={(e) => setCustomJsonPayload(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Submit Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleSend}
                disabled={isSending || !title.trim()}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 shadow-lg shadow-emerald-500/20 transition active:scale-95 cursor-pointer"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Broadcasting via Supabase Realtime...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Dispatch Notification Now</span>
                  </>
                )}
              </button>

              <button
                onClick={() => runBatchSimulation(3)}
                disabled={isSending}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
              >
                <Layers className="h-3.5 w-3.5 text-cyan-400" />
                <span>Simulate 3x Burst</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Logs & Pipeline Status Column */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Architecture Status Pill Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Dispatch Pipeline Metrics
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Avg Latency: 18ms
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Realtime Engine:</span>
                <span className="text-emerald-400 font-semibold mt-0.5 block">PostgreSQL WAL</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[11px]">RLS Isolation:</span>
                <span className="text-cyan-400 font-semibold mt-0.5 block">auth.uid() Enforced</span>
              </div>
            </div>
          </div>

          {/* Delivery Logs Feed */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Delivery Logs
                </h4>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {deliveryLogs.length} events logged
              </span>
            </div>

            <div className="mt-3 space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {deliveryLogs.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500">
                  No delivery logs yet. Dispatch a notification above to inspect delivery latencies and provider receipts.
                </div>
              ) : (
                deliveryLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="font-semibold text-slate-200 uppercase font-mono text-[11px]">
                          {log.channel}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400 text-[11px] truncate">
                          {log.provider}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {log.id}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono text-[10px] font-bold">
                        {log.latencyMs}ms
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {log.deliveredAt ? new Date(log.deliveredAt).toLocaleTimeString() : 'Just now'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
