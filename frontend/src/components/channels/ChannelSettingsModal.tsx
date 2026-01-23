'use client';

import { useEffect, useState } from 'react';
import type { Channel } from '@/types';
import { channelsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationsStore } from '@/stores/notifications-store';

interface ChannelSettingsModalProps {
  channel: Channel | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ChannelMemberWithUser {
  id: string;
  email: string;
  username: string;
  name?: string | null;
}

export default function ChannelSettingsModal({
  channel,
  isOpen,
  onClose,
}: ChannelSettingsModalProps) {
  const { user } = useAuthStore();
  const { fetchChannels, setSelectedChannel } = useNotificationsStore();
  const [members, setMembers] = useState<ChannelMemberWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    if (!isOpen || !channel) return;

    const fetchMembers = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await channelsApi.getMembers(channel.id);
        setMembers(data as ChannelMemberWithUser[]);
      } catch (e: any) {
        setError(e?.message || 'Failed to load members');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [isOpen, channel]);

  if (!isOpen || !channel) return null;

  const isOwner = !!user && channel.userId === user.id;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  const baseUrl = apiUrl.replace(/\/api$/, '');
  const webhookUrl = `${baseUrl}/api/webhooks/${channel.webhookToken}`;

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1500);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleAddMember = async () => {
    if (!newUserEmail.trim()) return;
    try {
      await channelsApi.addMember(channel.id, newUserEmail.trim());
      const data = await channelsApi.getMembers(channel.id);
      setMembers(data as ChannelMemberWithUser[]);
      setNewUserEmail('');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await channelsApi.removeMember(channel.id, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to remove member');
    }
  };

  const handleLeaveChannel = async () => {
    if (!user) return;
    try {
      await channelsApi.removeMember(channel.id, user.id);
      // Clear selection and refresh channels so the left channel disappears from the list
      setSelectedChannel(null);
      fetchChannels();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to leave channel');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3 py-4 sm:p-6">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-300 text-white shadow hover:bg-red-600 text-sm leading-none"
          aria-label="Close channel settings"
        >
          ×
        </button>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Channel settings - {channel.name}</h2>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-1">Webhook URL</h3>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={webhookUrl}
                className="flex-1 border rounded px-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
              />
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                {copyState === 'copied' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Members</h3>
            {loading && <p className="text-xs text-gray-500">Loading members...</p>}
            {error && <p className="text-xs text-red-500 mb-1">{error}</p>}

            <div className="max-h-48 overflow-y-auto border rounded p-2 mb-3 text-sm">
              {members.length === 0 && !loading && (
                <p className="text-xs text-gray-500">No members yet.</p>
              )}
              {members.map((member) => {
                const label = member.name || member.username || member.email || member.id;
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-1 border-b last:border-b-0 border-gray-100 dark:border-gray-700"
                  >
                    <div>
                      <div>{label}</div>
                      <div className="text-[10px] text-gray-500">{member.email}</div>
                    </div>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {isOwner ? (
              <>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="User email to add"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="flex-1 border rounded px-2 py-1 text-xs bg-white dark:bg-gray-900 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-gray-500">
                  Enter the user email to add them as a member of this channel.
                </p>
              </>
            ) : (
              <div className="mt-1 flex flex-col gap-2 text-[10px] text-gray-500">
                <p>Only the channel owner can add or remove other members.</p>
                {user && (
                  <button
                    type="button"
                    onClick={handleLeaveChannel}
                    className="self-start inline-flex items-center justify-center rounded-md bg-red-500 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-red-600"
                  >
                    Leave channel
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}