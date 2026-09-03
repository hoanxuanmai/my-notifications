'use client';


import { useEffect, useState } from 'react';
import type { Channel, ChannelTemplate } from '@/types';
import { channelsApi, deliveryApi } from '@/lib/api';
import { getSupabaseConfig } from '@/lib/supabase';
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
  const [copyCurlState, setCopyCurlState] = useState<'idle' | 'copied'>('idle');
  const [activeWebhookTab, setActiveWebhookTab] = useState<'url' | 'curl'>('url');
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [testWebhookResult, setTestWebhookResult] = useState<{
    ok: boolean;
    message: string;
    latencyMs?: number;
    id?: string;
  } | null>(null);
  const [template, setTemplate] = useState<ChannelTemplate>(channel?.settings?.template || 'default');

  // Always sync template state with channel when modal opens or channel changes
  useEffect(() => {
    if (isOpen && channel) {
      setTemplate(channel.settings?.template || 'default');
    }
  }, [isOpen, channel]);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const handleTemplateChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTemplate = e.target.value as ChannelTemplate;
    setTemplate(newTemplate);
    setSavingTemplate(true);
    try {
      if (channel) {
        await channelsApi.update(channel.id, { settings: { ...channel.settings, template: newTemplate } });
        fetchChannels();
      }
    } finally {
      setSavingTemplate(false);
    }
  };

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

  const { url: supabaseUrl } = getSupabaseConfig();
  // The webhooks edge function accepts the token as the last path segment
  // (also via ?token= or a JSON body field, but the path form is the one
  // we advertise here).
  const webhookUrl = `${supabaseUrl}/functions/v1/webhooks/${channel.webhookToken}`;

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1500);
    } catch {
      // ignore clipboard errors
    }
  };

  const curlCommand = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Alert", "message": "Notification to #${channel.name}", "type": "info", "priority": "high"}'`;

  const handleCopyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curlCommand);
      setCopyCurlState('copied');
      setTimeout(() => setCopyCurlState('idle'), 1500);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleTestWebhook = async () => {
    setIsTestingWebhook(true);
    setTestWebhookResult(null);
    try {
      const res = await deliveryApi.trigger({
        channelToken: channel.webhookToken,
        title: `⚡ Test Alert to #${channel.name}`,
        message: `Webhook trigger test successfully sent at ${new Date().toLocaleTimeString()}.`,
        type: 'info',
        priority: 'high',
        metadata: { source: 'channel_modal_test', channelId: channel.id },
      });

      if (res.ok) {
        setTestWebhookResult({
          ok: true,
          message: 'Sự kiện đã được tạo thành công!',
          latencyMs: res.latencyMs,
          id: res.id,
        });
      } else {
        setTestWebhookResult({
          ok: false,
          message: res.error || 'Gửi test webhook thất bại',
        });
      }
    } catch (e: any) {
      setTestWebhookResult({
        ok: false,
        message: e?.message || 'Gửi test webhook thất bại',
      });
    } finally {
      setIsTestingWebhook(false);
      setTimeout(() => setTestWebhookResult(null), 8000);
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
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 max-h-[90vh] overflow-y-auto overscroll-contain">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 text-lg leading-none"
          aria-label="Close channel settings"
        >
          ×
        </button>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Channel settings - {channel.name}</h2>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-1">Template</h3>
            <select
              value={template}
              onChange={handleTemplateChange}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              disabled={savingTemplate}
            >
              <option value="default">Default</option>
              <option value="slack">Slack</option>
            </select>
            {savingTemplate && <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">Saving…</span>}
          </div>
          {/* Webhook Configuration & Testing */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50/70 dark:bg-gray-900/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold">Webhook Ingestion</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  ⚡ Fast-path
                </span>
              </div>

              {/* Sub-tabs: URL / cURL */}
              <div className="flex items-center gap-1 bg-gray-200/80 dark:bg-gray-800 p-0.5 rounded text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveWebhookTab('url')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    activeWebhookTab === 'url'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWebhookTab('curl')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    activeWebhookTab === 'curl'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  cURL
                </button>
              </div>
            </div>

            {activeWebhookTab === 'url' ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={webhookUrl}
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-mono select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyWebhook}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
                  >
                    {copyState === 'copied' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="relative">
                  <pre className="p-2 text-[11px] font-mono rounded bg-gray-900 text-gray-100 dark:bg-black/70 overflow-x-auto whitespace-pre leading-relaxed border border-gray-800">
                    {curlCommand}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopyCurl}
                    className="absolute top-2 right-2 px-2 py-1 text-[11px] font-medium bg-gray-700 hover:bg-gray-600 text-white rounded shadow-sm"
                  >
                    {copyCurlState === 'copied' ? 'Copied' : 'Copy cURL'}
                  </button>
                </div>
              </div>
            )}

            {/* Quick Test Webhook Button & Live Latency Indicator */}
            <div className="mt-3 pt-2.5 border-t border-gray-200 dark:border-gray-700/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={isTestingWebhook}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors shadow-xs"
              >
                {isTestingWebhook ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang gửi test...</span>
                  </>
                ) : (
                  <>
                    <span>⚡ Gửi thông báo thử (Quick Test)</span>
                  </>
                )}
              </button>

              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                Thêm <code>?full=true</code> nếu cần toàn bộ schema object.
              </span>
            </div>

            {testWebhookResult && (
              <div
                className={`mt-2 p-2 rounded text-xs flex items-center justify-between gap-2 transition-all ${
                  testWebhookResult.ok
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span>{testWebhookResult.ok ? '✅' : '❌'}</span>
                  <span className="truncate">{testWebhookResult.message}</span>
                </div>
                {testWebhookResult.ok && typeof testWebhookResult.latencyMs === 'number' && (
                  <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-200/70 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 flex-shrink-0">
                    ⚡ {testWebhookResult.latencyMs}ms
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Members</h3>
            {loading && <p className="text-xs text-gray-500 dark:text-gray-400">Loading members...</p>}
            {error && <p className="text-xs text-red-500 mb-1">{error}</p>}

            <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded p-2 mb-3 text-sm">
              {members.length === 0 && !loading && (
                <p className="text-xs text-gray-500 dark:text-gray-400">No members yet.</p>
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
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">{member.email}</div>
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
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                  Enter the user email to add them as a member of this channel.
                </p>
              </>
            ) : (
              <div className="mt-1 flex flex-col gap-2 text-[10px] text-gray-500 dark:text-gray-400">
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