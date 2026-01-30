"use client";

import { useRef, useState } from 'react';
import type { Channel } from '@/types';
import { useNotificationsStore } from '@/stores/notifications-store';
import { format } from 'date-fns';
import NotificationItem from './NotificationItem';
import React, { useState as useLocalState } from 'react';
import { NotificationType, NotificationPriority } from '@/types';
import ChannelSettingsModal from '@/components/channels/ChannelSettingsModal';

const typeColors = {
  [NotificationType.info]: 'bg-blue-50 text-blue-700 border border-blue-100',
  [NotificationType.success]: 'bg-green-50 text-green-700 border border-green-100',
  [NotificationType.warning]: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
  [NotificationType.error]: 'bg-red-50 text-red-700 border border-red-100',
  [NotificationType.debug]: 'bg-gray-50 text-gray-700 border border-gray-200',
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
    fetchNotifications,
  } = useNotificationsStore();
  const [reloading, setReloading] = useState(false);
  const handleReload = async () => {
    setReloading(true);
    try {
      await fetchNotifications(selectedChannelId || undefined);
    } finally {
      setReloading(false);
    }
  };

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
    <div className="relative bg-transparent md:bg-white md:rounded-lg md:shadow p-2.5 sm:p-4 flex flex-col max-h-[calc(100vh-5.5rem)] sm:max-h-[calc(100vh-7rem)]">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3 pb-1 border-b border-gray-200">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold truncate flex items-center gap-1" title={title}>
              {title}
              <button
                type="button"
                onClick={handleReload}
                className="ml-1 p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                aria-label="Reload notifications"
                disabled={loading || reloading}
              >
                {/* Heroicons Arrow Path */}
                <svg
                  className={`w-5 h-5 text-gray-500 ${loading || reloading ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12a7.5 7.5 0 0113.5-5.303M19.5 12a7.5 7.5 0 01-13.5 5.303m0 0V15m0 2.303H7.5M19.5 12V9m0 0h-2.25"
                  />
                </svg>
              </button>
            </h2>
            {selectedChannel && (
              <button
                type="button"
                onClick={() => setSettingsChannel(selectedChannel as Channel)}
                className="inline-flex h-8 w-8 sm:h-8 sm:w-auto items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:px-3 sm:text-[11px]"
                aria-label="Channel settings"
              >
                <span className="sm:hidden text-lg leading-none">⚙</span>
                <span className="hidden sm:inline">Channel settings</span>
              </button>
            )}
          </div>
          {selectedChannel?.description && (
            <p className="mt-1 text-xs text-gray-600 line-clamp-2">
              {selectedChannel.description}
            </p>
          )}
          {unreadCount > 0 && (
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
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
            filteredNotifications.map((notification, idx) => (
              <NotificationItem
              key={notification.id}
                notification={notification}
                isSlack={selectedChannel?.settings?.template === 'slack'}
                markAsRead={markAsRead}
                selectedChannelId={selectedChannelId}
                even={idx % 2 === 0}
              />
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
          className="absolute z-10 bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-700 text-white shadow-md hover:bg-gray-800"
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
