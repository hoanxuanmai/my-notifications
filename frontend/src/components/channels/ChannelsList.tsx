"use client";

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useNotificationsStore } from '@/stores/notifications-store';
import ChannelCreateModal from '@/components/channels/ChannelCreateModal';

interface ChannelsListProps {
  onChannelSelected?: () => void;
}

export default function ChannelsList({ onChannelSelected }: ChannelsListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const {
    channels,
    unreadByChannelId,
    selectedChannelId,
    setSelectedChannel,
    createChannel,
    deleteChannel,
    loading,
  } = useNotificationsStore();

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

  const handleDeleteChannel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this channel?')) {
      try {
        await deleteChannel(id);
      } catch (error) {
        alert('Failed to delete channel');
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 mb-3 pb-1 border-b border-gray-100 dark:border-gray-700/60">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-50">
            Channels
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
           <div className="py-2 text-sm text-gray-500 flex-1 overflow-y-auto">Loading channels...</div>
      ) : (
           <div className="space-y-2 flex-1 overflow-y-auto">
        {sortedChannels.map(({ channel, lastNotification }) => {
          const unreadCount = unreadByChannelId[channel.id] ?? 0;

          return (
            <div
              key={channel.id}
              onClick={() => {
                setSelectedChannel(channel.id);
                onChannelSelected?.();
              }}
              className={`p-3 rounded cursor-pointer transition ${
                selectedChannelId === channel.id
                  ? 'bg-blue-100 dark:bg-blue-900'
                  : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm sm:text-base truncate">{channel.name}</h3>
                  {lastNotification ? (
                    <>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 line-clamp-1">
                        {lastNotification.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {format(new Date(lastNotification.createdAt), 'PPp')}
                      </p>
                    </>
                  ) : (
                    channel.description && (
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {channel.description}
                      </p>
                    )
                  )}
                  {unreadCount > 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {unreadCount} unread
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => handleDeleteChannel(channel.id, e)}
                  className="text-xs text-red-500 hover:text-red-700 px-1"
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
            alert('Failed to create channel');
            throw error;
          }
        }}
      />
    </div>
  );
}

