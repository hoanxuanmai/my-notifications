"use client";

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ConfirmModal from '@/components/common/ConfirmModal';
// AlertModal is now global
import { useAlertStore } from '@/stores/alert-store';
import { format } from 'date-fns';
import { useNotificationsStore } from '@/stores/notifications-store';
import ChannelCreateModal from '@/components/channels/ChannelCreateModal';

interface ChannelsListProps {
  onChannelSelected?: () => void;
}

export default function ChannelsList({ onChannelSelected }: ChannelsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  // Modal state for delete
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // Use global alert store
  const showAlert = useAlertStore((s) => s.showAlert);
  const {
    channels,
    unreadByChannelId,
    selectedChannelId,
    setSelectedChannel,
    createChannel,
    deleteChannel,
    loading,
    fetchChannels,
  } = useNotificationsStore();
  const [reloading, setReloading] = useState(false);

  const handleReload = async () => {
    setReloading(true);
    try {
      await fetchChannels();
    } finally {
      setReloading(false);
    }
  };

  const totalUnreadAcrossAll = useMemo(() => {
    return Object.values(unreadByChannelId).reduce((sum, count) => sum + (count || 0), 0);
  }, [unreadByChannelId]);

  const sortedChannels = useMemo(() => {
    return [...channels]
      .map((channel) => {
        const lastNotification = channel.notifications?.[0];

        // Sắp xếp ưu tiên theo thời gian tin nhắn cuối,
        // nếu chưa có tin thì fallback về ngày tạo channel
        const lastDate = lastNotification
          ? new Date(lastNotification.createdAt)
          : new Date(channel.createdAt);

        return { channel, lastNotification, lastDate };
      })
      .sort((a, b) => b.lastDate.getTime() - a.lastDate.getTime());
  }, [channels]);

  const handleOpenCreate = () => {
    setIsCreateOpen(true);
  };

  const handleDeleteChannel = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    setConfirmOpen(false);
    try {
      await deleteChannel(pendingDeleteId);
    } catch (error) {
      showAlert('Failed to delete channel', 'Error');
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4 flex flex-col h-full border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between gap-2 mb-3 pb-1 border-b border-gray-200 dark:border-gray-700">
        <div className="min-w-0 flex flex-col items-start">
          <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
            Channels
            <button
              type="button"
              onClick={handleReload}
              className="ml-1 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Reload channels"
              disabled={loading || reloading}
            >
              {/* Heroicons Arrow Path */}
              <svg
                className={`w-5 h-5 text-gray-500 dark:text-gray-400 ${loading || reloading ? 'animate-spin' : ''}`}
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
          <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 hidden sm:block">
            Manage your notification groups
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex h-8 px-3 items-center justify-center rounded-full bg-blue-500 text-xs sm:text-sm text-white hover:bg-blue-600 shadow-sm whitespace-nowrap"
        >
          + New
        </button>
      </div>

      {loading && channels.length === 0 ? (
           <div className="py-2 text-sm text-gray-500 dark:text-gray-400 flex-1 overflow-y-auto">Loading channels...</div>
      ) : (
           <div className="space-y-2 flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-1 px-1">
        {/* All Channels / Global Feed Item */}
        <div
          onClick={() => {
            setSelectedChannel(null);
            const params = new URLSearchParams(searchParams.toString());
            params.delete('channelId');
            const newUrl = params.toString() ? '?' + params.toString() : window.location.pathname;
            router.replace(newUrl, { scroll: false });
            onChannelSelected?.();
          }}
          className={`p-3 rounded-lg cursor-pointer border transition ${
            selectedChannelId === null
              ? 'bg-blue-50 border-blue-300 dark:bg-blue-950/50 dark:border-blue-700'
              : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700/60'
          }`}
        >
          <div className="flex justify-between items-center gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-800 dark:text-gray-100 text-sm sm:text-base flex items-center gap-1.5">
                <span>🌐 All Channels</span>
              </h3>
              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                View all notifications across all groups
              </p>
              {totalUnreadAcrossAll > 0 && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                  {totalUnreadAcrossAll} unread
                </p>
              )}
            </div>
            {selectedChannelId === null && (
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            )}
          </div>
        </div>

        {sortedChannels.map(({ channel, lastNotification }) => {
          const unreadCount = unreadByChannelId[channel.id] ?? 0;

          return (
            <div
              key={channel.id}
              onClick={() => {
                setSelectedChannel(channel.id);
                // Update URL to reflect selected channel (removes ?channelId if present, or updates it)
                const params = new URLSearchParams(searchParams.toString());
                params.set('channelId', channel.id);
                router.replace('?' + params.toString(), { scroll: false });
                onChannelSelected?.();
              }}
              className={`p-3 rounded-lg cursor-pointer border transition ${
                selectedChannelId === channel.id
                ? 'bg-blue-50 border-blue-300 dark:bg-blue-950/50 dark:border-blue-700'
                : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700/60'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-800 dark:text-gray-100 text-sm sm:text-base truncate">{channel.name}</h3>
                  {lastNotification ? (
                    <>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 line-clamp-1">
                        {lastNotification.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                        {format(new Date(lastNotification.createdAt), 'PPp')}
                      </p>
                    </>
                  ) : (
                    channel.description && (
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                        {channel.description}
                      </p>
                    )
                  )}
                  {unreadCount > 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                      {unreadCount} unread
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => handleDeleteChannel(channel.id, e)}
                  className="flex-shrink-0 -mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 text-lg leading-none"
                  aria-label="Delete channel"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
        </div>
      )}

      <ChannelCreateModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={async ({ name, description }) => {
          try {
            await createChannel({ name, description });
          } catch (error) {
            showAlert('Failed to create channel', 'Error');
            throw error;
          }
        }}
      />
      <ConfirmModal
        open={confirmOpen}
        title="Delete Channel"
        description="Are you sure you want to delete this channel?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => { setConfirmOpen(false); setPendingDeleteId(null); }}
      />
    </div>
  );
}

