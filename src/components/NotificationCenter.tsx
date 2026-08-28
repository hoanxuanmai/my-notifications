import React, { useState, useMemo } from 'react';
import {
  Bell,
  CheckCircle,
  CheckCheck,
  Trash2,
  Archive,
  ArchiveRestore,
  Pin,
  ExternalLink,
  ShieldAlert,
  CreditCard,
  CheckSquare,
  MessageSquare,
  Server,
  Sparkles,
  Search,
  Filter,
  Code,
  ChevronDown,
  ChevronUp,
  Download,
  RotateCcw,
  Clock,
  Radio,
  Layers,
  Send,
} from 'lucide-react';
import { NotificationItem, NotificationCategory, NotificationPriority, NotificationChannel } from '../types';
import { notificationService } from '../services/notificationService';

interface NotificationCenterProps {
  notifications: NotificationItem[];
  unreadCount: number;
  onNavigateToDispatcher: () => void;
  onNavigateToMigration: () => void;
}

type ViewFilter = 'all' | 'unread' | 'urgent' | 'pinned' | 'archived';

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  unreadCount,
  onNavigateToDispatcher,
  onNavigateToMigration,
}) => {
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPayloadId, setExpandedPayloadId] = useState<string | null>(null);
  const [isGrouped, setIsGrouped] = useState(false);

  // Filter logic
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // View filter
      if (viewFilter === 'unread' && item.isRead) return false;
      if (viewFilter === 'urgent' && item.priority !== 'urgent') return false;
      if (viewFilter === 'pinned' && !item.isPinned) return false;
      if (viewFilter === 'archived' && !item.isArchived) return false;
      if (viewFilter !== 'archived' && item.isArchived) return false;

      // Category filter
      if (selectedCategory !== 'all' && item.type !== selectedCategory) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesMsg = item.message.toLowerCase().includes(q);
        const matchesSender = item.sender?.name.toLowerCase().includes(q);
        if (!matchesTitle && !matchesMsg && !matchesSender) return false;
      }

      return true;
    });
  }, [notifications, viewFilter, selectedCategory, searchQuery]);

  // Grouped by Category
  const groupedNotifications = useMemo(() => {
    if (!isGrouped) return null;
    const groups: Record<string, NotificationItem[]> = {};
    filteredNotifications.forEach((item) => {
      const cat = item.type;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredNotifications, isGrouped]);

  const getPriorityBadge = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">URGENT</span>;
      case 'high':
        return <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">HIGH</span>;
      case 'normal':
        return <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">NORMAL</span>;
      case 'low':
        return <span className="px-2 py-0.5 text-[11px] font-normal rounded bg-slate-800 text-slate-400">LOW</span>;
    }
  };

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'security':
        return <ShieldAlert className="h-4 w-4 text-rose-400" />;
      case 'billing':
        return <CreditCard className="h-4 w-4 text-emerald-400" />;
      case 'tasks':
        return <CheckSquare className="h-4 w-4 text-cyan-400" />;
      case 'social':
        return <MessageSquare className="h-4 w-4 text-violet-400" />;
      case 'system':
        return <Server className="h-4 w-4 text-indigo-400" />;
      case 'updates':
        return <Sparkles className="h-4 w-4 text-amber-400" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const mins = Math.floor(diffMs / (1000 * 60));
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return 'Recently';
    }
  };

  const exportToJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(notifications, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `supabase_notifications_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Realtime Live Indicator */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Radio className="h-3 w-3 animate-pulse text-emerald-400" />
                Supabase Realtime Stream Active
              </span>
              <span className="text-xs text-slate-400">
                PostgreSQL WAL Replication
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Real-Time Notifications Inbox
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              High-throughput multi-channel notification engine powered by Supabase. Replaces NestJS WebSocket Gateways and Redis queues with Postgres Realtime events.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={onNavigateToDispatcher}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-lg shadow-emerald-500/10 active:scale-95"
            >
              <Send className="h-3.5 w-3.5" />
              Dispatch New Notification
            </button>
            <button
              onClick={onNavigateToMigration}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <Code className="h-3.5 w-3.5 text-cyan-400" />
              NestJS Converter
            </button>
          </div>
        </div>
      </div>

      {/* Main Inbox Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        
        {/* Controls Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          
          {/* View Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto text-xs font-medium">
            <button
              onClick={() => setViewFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewFilter === 'all'
                  ? 'bg-slate-800 text-white font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({notifications.filter((n) => !n.isArchived).length})
            </button>
            <button
              onClick={() => setViewFilter('unread')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                viewFilter === 'unread'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setViewFilter('urgent')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewFilter === 'urgent'
                  ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Urgent ({notifications.filter((n) => n.priority === 'urgent' && !n.isArchived).length})
            </button>
            <button
              onClick={() => setViewFilter('pinned')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewFilter === 'pinned'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pinned
            </button>
            <button
              onClick={() => setViewFilter('archived')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewFilter === 'archived'
                  ? 'bg-slate-800 text-slate-200 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Archived ({notifications.filter((n) => n.isArchived).length})
            </button>
          </div>

          {/* Quick Actions & Group Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsGrouped(!isGrouped)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                isGrouped
                  ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
              title="Group notifications by category"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{isGrouped ? 'Ungroup' : 'Group by Type'}</span>
            </button>

            <button
              onClick={() => notificationService.markAllAsRead()}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 border border-slate-700 transition"
              title="Mark all notifications as read"
            >
              <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Mark all read</span>
            </button>

            <button
              onClick={() => notificationService.clearAllRead()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Remove all read notifications from inbox"
            >
              <Trash2 className="h-3.5 w-3.5 text-slate-400" />
              <span>Clear read</span>
            </button>

            <button
              onClick={exportToJson}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/60 border border-slate-700 transition"
              title="Export notifications as JSON"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Chips & Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-4 pb-2">
          
          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications, senders..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto text-xs pb-1 md:pb-0">
            {(['all', 'security', 'billing', 'tasks', 'social', 'system', 'updates'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg capitalize whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-300 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Notification List Content */}
        <div className="mt-4 space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-950/40 rounded-xl border border-slate-800/80">
              <div className="h-12 w-12 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto text-slate-500 mb-3">
                <Bell className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">No notifications found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery || selectedCategory !== 'all' || viewFilter !== 'all'
                  ? 'No notifications match your active search or filters.'
                  : 'Your inbox is clear! Use the Dispatcher to send a test alert or trigger one from your Supabase backend.'}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                {(searchQuery || selectedCategory !== 'all' || viewFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setViewFilter('all');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  >
                    Reset Filters
                  </button>
                )}
                <button
                  onClick={() => notificationService.resetToInitialData()}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3 w-3" />
                  Load Sample Notifications
                </button>
              </div>
            </div>
          ) : isGrouped && groupedNotifications ? (
            // Grouped View
            Object.entries(groupedNotifications).map(([category, items]) => {
              const itemList = items as NotificationItem[];
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-2 pt-3 pb-1 border-b border-slate-800/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {getCategoryIcon(category as NotificationCategory)}
                    <span>{category} Notifications</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300 font-mono">
                      {itemList.length}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {itemList.map((item) => (
                      <NotificationCard
                        key={item.id}
                        item={item}
                        expandedPayloadId={expandedPayloadId}
                        setExpandedPayloadId={setExpandedPayloadId}
                        getPriorityBadge={getPriorityBadge}
                        getCategoryIcon={getCategoryIcon}
                        formatRelativeTime={formatRelativeTime}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            // Normal Flat View
            filteredNotifications.map((item) => (
              <NotificationCard
                key={item.id}
                item={item}
                expandedPayloadId={expandedPayloadId}
                setExpandedPayloadId={setExpandedPayloadId}
                getPriorityBadge={getPriorityBadge}
                getCategoryIcon={getCategoryIcon}
                formatRelativeTime={formatRelativeTime}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

interface NotificationCardProps {
  item: NotificationItem;
  expandedPayloadId: string | null;
  setExpandedPayloadId: (id: string | null) => void;
  getPriorityBadge: (priority: NotificationPriority) => React.ReactNode;
  getCategoryIcon: (category: NotificationCategory) => React.ReactNode;
  formatRelativeTime: (iso: string) => string;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  item,
  expandedPayloadId,
  setExpandedPayloadId,
  getPriorityBadge,
  getCategoryIcon,
  formatRelativeTime,
}) => {
  const isExpanded = expandedPayloadId === item.id;

  return (
    <div
      className={`group rounded-xl p-4 transition-all border ${
        !item.isRead
          ? 'bg-slate-800/40 border-slate-700/80 hover:bg-slate-800/70 hover:border-emerald-500/40 shadow-sm'
          : 'bg-slate-950/60 border-slate-800/60 hover:bg-slate-900/50 hover:border-slate-700/60'
      } ${item.isPinned ? 'border-amber-500/30' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        
        {/* Left Side: Unread dot & Content */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Read status indicator */}
          <button
            onClick={() => notificationService.toggleRead(item.id)}
            className="mt-1 flex-shrink-0 text-slate-500 hover:text-emerald-400 transition"
            title={item.isRead ? 'Mark as unread' : 'Mark as read'}
          >
            {!item.isRead ? (
              <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50 ring-2 ring-emerald-500/20" />
            ) : (
              <CheckCircle className="h-4 w-4 text-slate-600 hover:text-emerald-400" />
            )}
          </button>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                {getCategoryIcon(item.type)}
                <span className="capitalize">{item.type}</span>
              </span>

              <span className="text-slate-600">•</span>
              {getPriorityBadge(item.priority)}

              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="text-[11px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                via {item.channel.toUpperCase()}
              </span>

              {item.isPinned && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-300">
                  <Pin className="h-2.5 w-2.5 fill-amber-300" /> Pinned
                </span>
              )}
            </div>

            <h4 className={`text-sm font-semibold tracking-tight ${!item.isRead ? 'text-white' : 'text-slate-300'}`}>
              {item.title}
            </h4>

            <p className="text-xs text-slate-400 mt-1 leading-relaxed break-words">
              {item.message}
            </p>

            {/* Sender & Timestamp Footer */}
            <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-500 flex-wrap">
              {item.sender && (
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <strong>{item.sender.name}</strong>
                  {item.sender.role && <span className="text-slate-500">({item.sender.role})</span>}
                </span>
              )}

              <span className="flex items-center gap-1 text-slate-500">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(item.createdAt)}
              </span>

              {item.readAt && (
                <span className="text-slate-600">
                  Read {formatRelativeTime(item.readAt)}
                </span>
              )}
            </div>

            {/* Action Link Button if present */}
            {item.actionUrl && (
              <div className="mt-3">
                <a
                  href={item.actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition"
                >
                  <span>{item.actionLabel || 'View Action Link'}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Quick Icon Actions */}
        <div className="flex items-center gap-1 text-slate-400 opacity-80 group-hover:opacity-100 transition">
          {/* Payload Inspector Toggle */}
          {item.payload && Object.keys(item.payload).length > 0 && (
            <button
              onClick={() => setExpandedPayloadId(isExpanded ? null : item.id)}
              className={`p-1.5 rounded-lg hover:bg-slate-800 transition ${
                isExpanded ? 'text-cyan-400 bg-slate-800' : 'text-slate-400'
              }`}
              title="Inspect JSON Payload"
            >
              <Code className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Pin */}
          <button
            onClick={() => notificationService.togglePin(item.id)}
            className={`p-1.5 rounded-lg hover:bg-slate-800 transition ${
              item.isPinned ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'
            }`}
            title={item.isPinned ? 'Unpin' : 'Pin notification'}
          >
            <Pin className="h-3.5 w-3.5" />
          </button>

          {/* Archive */}
          <button
            onClick={() => notificationService.toggleArchive(item.id)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition"
            title={item.isArchived ? 'Restore from Archive' : 'Archive notification'}
          >
            {item.isArchived ? <ArchiveRestore className="h-3.5 w-3.5 text-emerald-400" /> : <Archive className="h-3.5 w-3.5" />}
          </button>

          {/* Delete */}
          <button
            onClick={() => notificationService.deleteNotification(item.id)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition"
            title="Delete notification"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded Payload Viewer */}
      {isExpanded && item.payload && (
        <div className="mt-3 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-mono">
            <span>PostgreSQL JSONB Payload</span>
            <span className="text-[10px] text-emerald-400">auth.uid() = {item.userId}</span>
          </div>
          <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto">
            {JSON.stringify(item.payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
