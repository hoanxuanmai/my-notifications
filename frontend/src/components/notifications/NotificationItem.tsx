import React from 'react';
import { format } from 'date-fns';
import { parseSlackMessage } from './parseNotificationMessage';
import { NotificationType, NotificationPriority, Notification } from '@/types';

const typeColors = {
  [NotificationType.info]: 'bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-700',
  [NotificationType.success]: 'bg-green-50 text-green-700 border border-green-100 dark:bg-green-900 dark:text-green-100 dark:border-green-700',
  [NotificationType.warning]: 'bg-yellow-50 text-yellow-700 border border-yellow-100 dark:bg-yellow-900 dark:text-yellow-100 dark:border-yellow-700',
  [NotificationType.error]: 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-900 dark:text-red-100 dark:border-red-700',
  [NotificationType.debug]: 'bg-gray-50 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600',
};

const priorityColors = {
  [NotificationPriority.low]: 'text-gray-500',
  [NotificationPriority.medium]: 'text-blue-500',
  [NotificationPriority.high]: 'text-orange-500',
  [NotificationPriority.urgent]: 'text-red-500',
};

interface NotificationItemProps {
  notification: Notification;
  isSlack: boolean;
  markAsRead: (id: string) => void;
  selectedChannelId: string | null;
  even?: boolean;
}

export default function NotificationItem({ notification, isSlack, markAsRead, selectedChannelId, even }: NotificationItemProps) {
  const borderColor = even
    ? (notification.read ? 'border-l-blue-200 dark:border-l-blue-700' : 'border-l-blue-500 dark:border-l-blue-400')
    : (notification.read ? 'border-l-pink-200 dark:border-l-pink-700' : 'border-l-pink-500 dark:border-l-pink-400');
  return (
    <div
      onClick={() => !notification.read && markAsRead(notification.id)}
      className={`relative p-3 sm:p-4 rounded-lg border border-l-4 transition w-full max-w-full ${
        notification.read
          ? 'bg-gray-50 border-gray-200 dark:bg-gray-800/40 dark:border-gray-800 dark:text-gray-300'
          : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'
      } ${borderColor}`}
    >
      <NotificationMessageWithToggle
        notification={notification}
        isSlack={isSlack}
        headContent={
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${typeColors[notification.type]}`}
            >
              {notification.type}
            </span>
            <span
              className={`text-[11px] font-medium ${priorityColors[notification.priority]}`}
            >
              {notification.priority}
            </span>
            {!notification.read && (
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" aria-label="unread"></span>
            )}
          </div>
        }
        title={notification.title}
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-400 dark:text-gray-500">
        {!selectedChannelId && notification.channel && (
          <span className="truncate max-w-[45%]">{notification.channel.name}</span>
        )}
        {!selectedChannelId && notification.channel && <span aria-hidden>·</span>}
        <span>{format(new Date(notification.createdAt), 'PPp')}</span>
      </div>
    </div>
  );
}

// Hiển thị message với nút Show more/less nếu quá dài
function NotificationMessageWithToggle({ notification, isSlack, headContent, title }: { notification: Notification, isSlack: boolean, headContent: React.ReactNode, title: string }) {
  const [expanded, setExpanded] = React.useState(false);
  let raw = '';
  if (isSlack) {
    try {
      if (notification.metadata && notification.metadata.slack) {
        const att = notification.metadata.slack.attachments?.[0];
        raw = (att?.text || '') + '\n' + (att?.fields?.map((f:any) => `${f.title}: ${f.value}`).join('\n') || '');
      } else if (typeof notification.message === 'string') {
        const obj = JSON.parse(notification.message);
        const att = obj.attachments?.[0];
        raw = (att?.text || '') + '\n' + (att?.fields?.map((f:any) => `${f.title}: ${f.value}`).join('\n') || '');
      }
    } catch { raw = '' }
  } else {
    raw = notification.message || '';
  }
  const lineCount = raw.split(/\r?\n/).length;
  const charCount = raw.length;
  const tooLong = lineCount > 8 || charCount > 600;
  return (
    <div className="relative">
      <div className="mb-1.5 flex items-start justify-between gap-2 max-w-full">
        <div className="flex-1 min-w-0 space-y-1">
          {headContent}
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm sm:text-base leading-snug break-words">
            {title}
          </h3>
        </div>
        {tooLong && expanded && (
          <button
            className="flex-shrink-0 text-xs text-blue-500 hover:underline"
            onClick={() => setExpanded(false)}
          >
            Show less
          </button>
        )}
      </div>
      <div className={(tooLong && !expanded ? 'max-h-40 overflow-hidden relative ' : '') + 'text-sm text-gray-700 dark:text-gray-200 break-words w-full max-w-full'}>
        {isSlack ? parseSlackMessage(notification) : notification.message}
      </div>
      {tooLong && !expanded && (
        <button
          className="text-xs text-blue-500 hover:underline mt-1"
          onClick={() => setExpanded(true)}
        >
          Show more
        </button>
      )}
    </div>
  );
}
