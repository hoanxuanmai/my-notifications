"use client";

import { useMemo, useState } from 'react';
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
    <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 flex flex-col h-full border border-gray-200">
      <div className="flex items-center justify-between gap-2 mb-3 pb-1 border-b border-gray-200">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-semibold text-gray-900">
            Channels
          </h2>
          <p className="mt-0.5 text-[11px] text-gray-500 hidden sm:block">
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
              className={`p-3 rounded cursor-pointer border transition ${
                selectedChannelId === channel.id
                ? 'bg-blue-50 border-blue-200'
                : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-800 text-sm sm:text-base truncate">{channel.name}</h3>
                  {lastNotification ? (
                    <>
                      <p className="mt-1 text-xs text-gray-600 line-clamp-1">
                        {lastNotification.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {format(new Date(lastNotification.createdAt), 'PPp')}
                      </p>
                    </>
                  ) : (
                    channel.description && (
                        <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                        {channel.description}
                      </p>
                    )
                  )}
                  {unreadCount > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
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
      {/* AlertModal is now rendered globally in layout */}
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

