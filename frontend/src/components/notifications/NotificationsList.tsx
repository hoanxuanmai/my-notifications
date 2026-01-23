"use client";

import { useRef, useState } from 'react';
import type { Channel } from '@/types';
import { useNotificationsStore } from '@/stores/notifications-store';
import { format } from 'date-fns';
import { NotificationType, NotificationPriority } from '@/types';
import ChannelSettingsModal from '@/components/channels/ChannelSettingsModal';

const typeColors = {
  [NotificationType.info]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [NotificationType.success]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [NotificationType.warning]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [NotificationType.error]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [NotificationType.debug]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

const priorityColors = {
  [NotificationPriority.low]: 'text-gray-500',
  [NotificationPriority.medium]: 'text-blue-500',
  [NotificationPriority.high]: 'text-orange-500',
  [NotificationPriority.urgent]: 'text-red-500',
};

export default function NotificationsList() {
  const {
    notifications,
    selectedChannelId,
    channels,
    markAsRead,
    markAllAsRead,
    loading,
    hasMoreGlobal,
    hasMoreByChannelId,
    loadingMore,
    loadMoreNotifications,
  } = useNotificationsStore();

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [settingsChannel, setSettingsChannel] = useState<Channel | null>(null);

  const filteredNotifications = selectedChannelId
    ? notifications.filter((n) => n.channelId === selectedChannelId)
    : notifications;

  const selectedChannel = selectedChannelId
    ? channels.find((c) => c.id === selectedChannelId) || null
    : null;

  const unreadCount = filteredNotifications.filter((n) => !n.read).length;

  const handleScroll: React.UIEventHandler<HTMLDivElement> = (event) => {
    const el = event.currentTarget;
    const farFromTop = el.scrollTop > 32;
    setShowScrollTop(farFromTop);
  };

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading && notifications.length === 0) {
    return <div className="p-3 sm:p-4">Loading notifications...</div>;
  }

  const title = selectedChannel ? selectedChannel.name : 'Notifications';
  const hasMore = selectedChannelId
    ? hasMoreByChannelId[selectedChannelId] ?? false
    : hasMoreGlobal;

  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow p-2.5 sm:p-4 flex flex-col max-h-[calc(100vh-5.5rem)] sm:max-h-[calc(100vh-7rem)]">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3 pb-1 border-b border-gray-100 dark:border-gray-700/60">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold truncate" title={title}>
              {title}
            </h2>
            {selectedChannel && (
              <button
                type="button"
                onClick={() => setSettingsChannel(selectedChannel as Channel)}
                className="inline-flex h-8 w-8 sm:h-8 sm:w-auto items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-600 dark:text-gray-200 text-xs sm:px-3 sm:text-[11px]"
                aria-label="Channel settings"
              >
                <span className="sm:hidden text-lg leading-none">⚙</span>
                <span className="hidden sm:inline">Channel settings</span>
              </button>
            )}
          </div>
          {selectedChannel?.description && (
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {selectedChannel.description}
            </p>
          )}
          {unreadCount > 0 && (
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead(selectedChannelId || undefined)}
            className="inline-flex items-center justify-center h-8 w-8 sm:h-8 sm:w-auto px-0 sm:px-3 text-xs sm:text-[11px] bg-gray-500 text-white rounded-full hover:bg-gray-600 ml-auto"
            aria-label="Mark all as read"
          >
            <span className="sm:hidden text-lg leading-none">✓</span>
            <span className="hidden sm:inline">Mark all as read</span>
          </button>
        )}
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="space-y-2 flex-1 overflow-y-auto"
      >
        {filteredNotifications.length === 0 ? (
          <div className="text-center text-gray-500 py-6 sm:py-8">
            No notifications yet
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => !notification.read && markAsRead(notification.id)}
              className={`p-3 sm:p-4 rounded border-l-4 cursor-pointer transition ${
                notification.read
                  ? 'bg-gray-50 dark:bg-gray-700 border-gray-300'
                  : 'bg-white dark:bg-gray-800 border-blue-500'
              } hover:shadow-md`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${typeColors[notification.type]}`}
                    >
                      {notification.type}
                    </span>
                    <span
                      className={`text-xs font-medium ${priorityColors[notification.priority]}`}
                    >
                      {notification.priority}
                    </span>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                  </div>
                  <h3 className="font-semibold mb-1">{notification.title}</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {notification.message}
                  </p>
                  {!selectedChannelId && notification.channel && (
                    <p className="text-xs text-gray-500">
                      Channel: {notification.channel.name}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(notification.createdAt), 'PPp')}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}

        {hasMore && (
          <div className="flex justify-center py-3">
            <button
              type="button"
              onClick={() => loadMoreNotifications()}
              disabled={loadingMore}
              className="inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs sm:text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingMore ? 'Loading…' : 'Load older notifications'}
            </button>
          </div>
        )}
      </div>

      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-700 text-white shadow-md hover:bg-gray-800"
          aria-label="Scroll to top"
        >
          ↑
        </button>
      )}

      <ChannelSettingsModal
        channel={settingsChannel}
        isOpen={!!settingsChannel}
        onClose={() => setSettingsChannel(null)}
      />
    </div>
  );
}

