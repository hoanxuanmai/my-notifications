import React, { useState } from 'react';
import {
  Hash,
  Plus,
  Users,
  Send,
  Radio,
  CheckCircle,
  Shield,
  Key,
  Copy,
  Check,
  Trash2,
  UserPlus,
  Bell,
  Layers,
  Sparkles,
  Info,
  Terminal,
  Activity,
  Globe,
  Inbox,
  Filter,
  Search,
  CheckCheck,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import { AppChannel, NotificationItem } from '../types';
import { notificationService } from '../services/notificationService';
import confetti from 'canvas-confetti';

interface ChannelHubViewProps {
  notifications?: NotificationItem[];
  onNavigateToDispatcher: (channelId?: string) => void;
}

export const ChannelHubView: React.FC<ChannelHubViewProps> = ({ notifications = notificationService.getNotifications(), onNavigateToDispatcher }) => {
  const [channels, setChannels] = useState<AppChannel[]>(notificationService.getChannels());
  // 'all' represents the Global Timeline across all channels
  const [selectedChannelId, setSelectedChannelId] = useState<string>('all');
  
  // Search & Filter state for global/channel view
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'urgent' | 'high' | 'normal' | 'low'>('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  
  // New channel modal/form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Add member form state
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Copied indicator
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Quick message state
  const [quickMsg, setQuickMsg] = useState('');
  const [quickPriority, setQuickPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [isSendingQuick, setIsSendingQuick] = useState(false);

  const isGlobalView = selectedChannelId === 'all';
  const activeChannel = isGlobalView ? null : channels.find((c) => c.id === selectedChannelId) || channels[0];

  // Filter notifications based on channel selection and filters
  const displayedNotifications = notifications.filter((n) => {
    // 1. Channel filter
    if (!isGlobalView && activeChannel && n.channelId !== activeChannel.id) {
      return false;
    }
    // 2. Read filter
    if (readFilter === 'unread' && n.isRead) return false;
    if (readFilter === 'read' && !n.isRead) return false;
    // 3. Priority filter
    if (priorityFilter !== 'all' && n.priority?.toLowerCase() !== priorityFilter) return false;
    // 4. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title?.toLowerCase().includes(q);
      const matchMsg = n.message?.toLowerCase().includes(q);
      const matchChannel = n.channelName?.toLowerCase().includes(q);
      const matchSender = n.sender?.name?.toLowerCase().includes(q);
      if (!matchTitle && !matchMsg && !matchChannel && !matchSender) return false;
    }
    return true;
  });

  const totalUnreadAcrossAll = notifications.filter((n) => !n.isRead).length;
  const unreadInActive = isGlobalView
    ? totalUnreadAcrossAll
    : notifications.filter((n) => n.channelId === activeChannel?.id && !n.isRead).length;

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    setIsCreating(true);
    try {
      const created = await notificationService.createChannel({
        name: newChannelName.trim(),
        description: newChannelDesc.trim(),
      });
      setChannels(notificationService.getChannels());
      setSelectedChannelId(created.id);
      setNewChannelName('');
      setNewChannelDesc('');
      setShowCreateModal(false);

      confetti({
        particleCount: 35,
        spread: 50,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error('Failed to create channel', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim() || !activeChannel) return;

    setIsAddingMember(true);
    try {
      await notificationService.addChannelMember(activeChannel.id, memberEmail.trim());
      setChannels(notificationService.getChannels());
      setMemberEmail('');
      setShowAddMember(false);
    } catch (err) {
      console.error('Failed to add member', err);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!activeChannel) return;
    await notificationService.removeChannelMember(activeChannel.id, memberUserId);
    setChannels(notificationService.getChannels());
  };

  const handleSendQuickNotification = async () => {
    if (!quickMsg.trim()) return;

    const targetChannel = activeChannel || channels[0];
    if (!targetChannel) return;

    setIsSendingQuick(true);
    try {
      await notificationService.dispatchNotification({
        title: `${targetChannel.name} Alert`,
        message: quickMsg.trim(),
        channelId: targetChannel.id,
        channelName: targetChannel.name,
        type: 'system',
        channel: 'in_app',
        priority: quickPriority,
        senderName: 'hoanxuanmai@gmail.com',
        senderRole: 'Channel Admin',
      });
      setQuickMsg('');
      setChannels(notificationService.getChannels());
    } catch (err) {
      console.error('Failed to send channel message', err);
    } finally {
      setIsSendingQuick(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (isGlobalView) {
      await notificationService.markAllAsRead();
    } else if (activeChannel) {
      await notificationService.markAllAsRead(activeChannel.id);
    }
    setChannels(notificationService.getChannels());
  };

  const supabaseUrl = notificationService.getSupabaseConfig()?.url || '';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathWebhookUrl = activeChannel ? `${currentOrigin}/api/webhooks/${activeChannel.webhookToken}` : '';
  const supabaseEdgeWebhookUrl = activeChannel 
    ? `${supabaseUrl || 'https://<project-ref>.supabase.co'}/functions/v1/webhooks/${activeChannel.webhookToken}` 
    : '';

  const copyToClipboard = (text: string, type: 'token' | 'curl' | 'url') => {
    navigator.clipboard.writeText(text);
    if (type === 'token') {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    }
  };

  const curlExample = activeChannel
    ? `# Gửi trực tiếp qua Path Webhook URL (Không cần custom header):
curl -X POST ${pathWebhookUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Alert: ${activeChannel.name}",
    "message": "Deployment completed successfully",
    "priority": "high",
    "type": "success"
  }'

# Hoặc qua Supabase Edge Function Path URL:
curl -X POST ${supabaseEdgeWebhookUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Build Status",
    "message": "Pipeline passed all tests",
    "priority": "normal"
  }'`
    : '';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                <Hash className="h-3 w-3 text-indigo-400" />
                Supabase Channel Engine
              </span>
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                <Radio className="h-2.5 w-2.5 animate-pulse" />
                Realtime Stream & Multi-Channel Feed
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Kênh Thông Báo & Tin Nhắn Tổng Thể (Channels & Global Feed)
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Xem toàn bộ thông báo hệ thống tổng thể (Global Stream) hoặc lọc theo từng Channel riêng lẻ với phân quyền RLS và Webhook Token.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSelectedChannelId('all')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                isGlobalView
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <Globe className="h-4 w-4 text-emerald-400" />
              <span>Xem Tổng Thể ({notifications.length})</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Tạo Channel Mới
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Channels Sidebar + Active Channel View / Global Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Channel List + Global View Option */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-400" />
                Danh Mục Kênh & Tổng Quan
              </span>
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition text-xs flex items-center gap-1"
                title="Thêm Channel"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New</span>
              </button>
            </div>

            <div className="space-y-2">
              {/* GLOBAL ALL CHANNELS ITEM */}
              <button
                onClick={() => setSelectedChannelId('all')}
                className={`w-full text-left p-3.5 rounded-xl border transition flex items-start justify-between gap-3 ${
                  isGlobalView
                    ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md shadow-emerald-950/50 ring-1 ring-emerald-500/20'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={`p-2 rounded-lg mt-0.5 ${
                      isGlobalView ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Globe className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold truncate ${isGlobalView ? 'text-white' : 'text-slate-200'}`}>
                        🌐 Tất Cả Kênh (Toàn Bộ Tin Nhắn)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      Dòng thời gian tổng thể từ tất cả {channels.length} kênh
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 text-emerald-400/90 font-medium">
                        <Activity className="h-3 w-3" />
                        {channels.length} channels active
                      </span>
                      <span>•</span>
                      <span>{notifications.length} tổng tin nhắn</span>
                    </div>
                  </div>
                </div>

                {totalUnreadAcrossAll > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500 text-slate-950">
                    {totalUnreadAcrossAll} mới
                  </span>
                )}
              </button>

              <div className="pt-2 pb-1 px-1 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-800/80">
                <span>Kênh Riêng Biệt ({channels.length})</span>
              </div>

              {/* INDIVIDUAL CHANNELS */}
              {channels.map((ch) => {
                const isSelected = ch.id === selectedChannelId;
                const notifCount = notifications.filter((n) => n.channelId === ch.id).length;
                const unread = notifications.filter((n) => n.channelId === ch.id && !n.isRead).length;

                return (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedChannelId(ch.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md shadow-indigo-950/50 ring-1 ring-indigo-500/20'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`p-2 rounded-lg mt-0.5 ${
                          isSelected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Hash className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                            {ch.name}
                          </span>
                          {ch.isActive && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Active" />
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {ch.description || 'No description provided'}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {ch.members?.length || 1} members
                          </span>
                          <span>•</span>
                          <span>{notifCount} msgs</span>
                        </div>
                      </div>
                    </div>

                    {unread > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500 text-white">
                        {unread} new
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* User Role Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-xs space-y-2">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span>Current Authenticated User</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="text-white font-mono font-medium">hoanxuanmai@gmail.com</div>
              <div className="text-slate-400 text-[11px] flex items-center justify-between">
                <span>User ID: <code className="text-indigo-400">hoanxuanmai</code></span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold text-[10px]">Owner / Admin</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Workspace (Global Feed or Single Channel View) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* VIEW HEADER & SUMMARY STATS */}
          {isGlobalView ? (
            /* GLOBAL OVERVIEW DASHBOARD CARD */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Globe className="h-5 w-5 text-emerald-400" />
                      <span>Tổng Hợp Tin Nhắn Hệ Thống (Global Feed)</span>
                    </h2>
                    <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Tất Cả Kênh
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Theo dõi toàn bộ thông báo gửi từ webhook, cronjob và người dùng trên mọi channels trong thời gian thực.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleMarkAllRead}
                    disabled={unreadInActive === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition disabled:opacity-50"
                  >
                    <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Đọc tất cả ({unreadInActive})</span>
                  </button>
                  <button
                    onClick={() => onNavigateToDispatcher()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Mở Dispatcher Lab</span>
                  </button>
                </div>
              </div>

              {/* Quick Metrics Bento */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 font-medium block">Tổng tin nhắn</span>
                  <span className="text-lg font-bold text-white">{notifications.length}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 font-medium block">Chưa đọc</span>
                  <span className="text-lg font-bold text-emerald-400">{totalUnreadAcrossAll}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 font-medium block">Số kênh kích hoạt</span>
                  <span className="text-lg font-bold text-indigo-400">{channels.length}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 font-medium block">Mức khẩn cấp</span>
                  <span className="text-lg font-bold text-rose-400">
                    {notifications.filter((n) => n.priority === 'urgent' || n.priority === 'high').length}
                  </span>
                </div>
              </div>

              {/* Quick Send Message Box across default channel */}
              <div className="space-y-3 pt-1">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5 text-emerald-400" />
                  Phát Nhanh Thông Báo Toàn Cục
                </span>
                
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={quickMsg}
                      onChange={(e) => setQuickMsg(e.target.value)}
                      placeholder={`Nhập thông điệp thông báo gửi đến channel "${channels[0]?.name || 'Chính'}"...`}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendQuickNotification();
                      }}
                    />
                    <select
                      value={quickPriority}
                      onChange={(e) => setQuickPriority(e.target.value as any)}
                      className="px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <button
                      onClick={handleSendQuickNotification}
                      disabled={isSendingQuick || !quickMsg.trim()}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold transition disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{isSendingQuick ? 'Đang gửi...' : 'Gửi Ngay'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeChannel ? (
            /* SINGLE CHANNEL SETTINGS CARD */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Hash className="h-5 w-5 text-indigo-400" />
                      <span>{activeChannel.name}</span>
                    </h2>
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      ID: {activeChannel.id.substring(0, 13)}...
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {activeChannel.description || 'Channel realtime notification stream with isolated RLS security.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleMarkAllRead}
                    disabled={unreadInActive === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition disabled:opacity-50"
                  >
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Đọc tất cả ({unreadInActive})</span>
                  </button>
                  <button
                    onClick={() => onNavigateToDispatcher(activeChannel.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Mở Dispatcher Lab</span>
                  </button>
                </div>
              </div>

              {/* Channel Webhook Ingestion URL (Path-based) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-amber-400" />
                    Webhook Path Ingestion URL (Token nằm trực tiếp trên URL Path)
                  </span>
                  <button
                    onClick={() => copyToClipboard(pathWebhookUrl, 'url')}
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    {copiedUrl ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedUrl ? 'Đã copy URL!' : 'Copy Webhook URL'}</span>
                  </button>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs text-amber-300 bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800">
                  <span className="text-slate-500 select-none">POST</span>
                  <span className="truncate flex-1">{pathWebhookUrl}</span>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                  <span>Channel Token: <code className="text-slate-300 font-mono">{activeChannel.webhookToken}</code></span>
                  <button
                    onClick={() => copyToClipboard(activeChannel.webhookToken, 'token')}
                    className="text-slate-400 hover:text-white"
                  >
                    {copiedToken ? 'Đã copy Token' : 'Copy Token'}
                  </button>
                </div>
              </div>

              {/* Members Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-cyan-400" />
                    Channel Members & RLS Recipients ({activeChannel.members?.length || 1})
                  </span>
                  <button
                    onClick={() => setShowAddMember(!showAddMember)}
                    className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>{showAddMember ? 'Đóng' : '+ Thêm Member'}</span>
                  </button>
                </div>

                {showAddMember && (
                  <form onSubmit={handleAddMember} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <div className="text-xs font-medium text-slate-300">Thêm người nhận vào channel theo Email:</div>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                        placeholder="e.g. dev@company.com"
                        required
                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                      />
                      <button
                        type="submit"
                        disabled={isAddingMember}
                        className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                      >
                        {isAddingMember ? 'Đang thêm...' : 'Lưu Member'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeChannel.members?.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-[11px] font-bold text-white uppercase">
                          {m.email ? m.email[0] : m.userId[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">
                            {m.email || m.userId}
                          </div>
                          <div className="text-[10px] text-slate-500 capitalize">Role: {m.role}</div>
                        </div>
                      </div>

                      {m.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(m.userId)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition rounded"
                          title="Xóa member khỏi channel"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Send Message Box for specific channel */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5 text-indigo-400" />
                  Gửi Nhanh Thông Báo Vào Channel "{activeChannel.name}"
                </span>
                
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={quickMsg}
                      onChange={(e) => setQuickMsg(e.target.value)}
                      placeholder={`Nhập thông điệp thông báo gửi đến toàn bộ member của "${activeChannel.name}"...`}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendQuickNotification();
                      }}
                    />
                    <select
                      value={quickPriority}
                      onChange={(e) => setQuickPriority(e.target.value as any)}
                      className="px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <button
                      onClick={handleSendQuickNotification}
                      disabled={isSendingQuick || !quickMsg.trim()}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{isSendingQuick ? 'Đang gửi...' : 'Gửi Ngay'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* cURL / Webhook Integration Snippet */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-amber-400" />
                    cURL / Kafka Ingestion API
                  </span>
                  <button
                    onClick={() => copyToClipboard(curlExample, 'curl')}
                    className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-medium"
                  >
                    {copiedCurl ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedCurl ? 'Đã copy cURL!' : 'Copy cURL'}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                  <pre>{curlExample}</pre>
                </div>
              </div>

            </div>
          ) : null}

          {/* REALTIME FEED TIMELINE (Works for both Global View & Single Channel) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-emerald-400" />
                {isGlobalView ? 'Toàn Bộ Dòng Thông Báo Hệ Thống' : `Live Realtime Feed — ${activeChannel?.name}`} ({displayedNotifications.length} tin)
              </span>

              {/* Filter controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo tiêu đề, kênh, nội dung..."
                    className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 w-48 sm:w-56"
                  />
                </div>

                <select
                  value={readFilter}
                  onChange={(e) => setReadFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="unread">Chỉ chưa đọc</option>
                  <option value="read">Đã đọc</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">Mọi độ ưu tiên</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {displayedNotifications.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Không tìm thấy thông báo nào phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              <div className="space-y-2.5">
                {displayedNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-xl border transition flex items-start justify-between gap-3 ${
                      n.isRead
                        ? 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                        : 'bg-slate-950 border-slate-700/80 text-white shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                          n.priority === 'urgent'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : n.priority === 'high'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                        }`}
                      >
                        <Bell className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">{n.title}</span>
                          
                          {/* Channel Badge (clickable to jump to channel) */}
                          {n.channelName && (
                            <button
                              onClick={() => {
                                if (n.channelId) setSelectedChannelId(n.channelId);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-800 hover:bg-indigo-950/80 hover:text-indigo-300 text-slate-300 border border-slate-700 transition"
                              title="Bấm để chuyển đến kênh này"
                            >
                              <Hash className="h-2.5 w-2.5 text-indigo-400" />
                              <span>{n.channelName}</span>
                            </button>
                          )}

                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                              n.priority === 'urgent'
                                ? 'bg-rose-500/20 text-rose-300'
                                : n.priority === 'high'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {n.priority}
                          </span>
                          {!n.isRead && (
                            <span className="h-2 w-2 rounded-full bg-emerald-400" title="Chưa đọc" />
                          )}
                        </div>
                        <p className="text-xs text-slate-300 mt-1 break-words">{n.message}</p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 flex-wrap">
                          <span>From: <strong className="text-slate-400">{n.sender?.name || 'System Hub'}</strong></span>
                          <span>•</span>
                          <span>{new Date(n.createdAt).toLocaleTimeString()} ({new Date(n.createdAt).toLocaleDateString()})</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => notificationService.toggleRead(n.id)}
                      className="p-1.5 text-slate-500 hover:text-emerald-400 transition shrink-0"
                      title={n.isRead ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
                    >
                      <CheckCircle className={`h-4 w-4 ${n.isRead ? 'text-emerald-500' : ''}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Create Channel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-indigo-400" />
                <span>Tạo Channel Thông Báo Mới</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Tên Channel <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. Product Alerts, Payment Gateways"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Mô tả mục đích Channel
                </label>
                <textarea
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  rows={2}
                  placeholder="Mô tả thông báo và danh sách người nhận..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2">
                <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>Channel mới sẽ tự động sinh Webhook Token và thêm tài khoản hiện tại (<strong>hoanxuanmai@gmail.com</strong>) làm Owner.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newChannelName.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  {isCreating ? 'Đang tạo...' : 'Tạo Channel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

