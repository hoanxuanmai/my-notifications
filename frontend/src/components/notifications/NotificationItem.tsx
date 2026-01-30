import React from 'react';
import { format } from 'date-fns';
import { parseSlackMessage } from './parseNotificationMessage';
import { NotificationType, NotificationPriority, Notification } from '@/types';

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

interface NotificationItemProps {
  notification: Notification;
  isSlack: boolean;
  markAsRead: (id: string) => void;
  selectedChannelId: string | null;
  even?: boolean;
}

export default function NotificationItem({ notification, isSlack, markAsRead, selectedChannelId, even }: NotificationItemProps) {
  const borderColor = even
    ? (notification.read ? 'border-l-blue-200' : 'border-l-blue-500')
    : (notification.read ? 'border-l-pink-200' : 'border-l-pink-500');
  return (
    <div
      onClick={() => !notification.read && markAsRead(notification.id)}
      className={`relative p-3 sm:p-4 rounded border-l-4 cursor-pointer transition w-full max-w-full ${
        notification.read
          ? 'bg-gray-50 dark:bg-gray-900 dark:text-gray-100'
          : 'bg-white dark:bg-gray-900 dark:text-gray-100'
      } ${borderColor} hover:shadow-md`}
    >
      <NotificationMessageWithToggle
        notification={notification}
        isSlack={isSlack}
        headContent={
          <div className="flex items-center gap-2">
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
            {/* Show less button will be injected here if expanded */}
          </div>
        }
        title={notification.title}
      />
      {!selectedChannelId && notification.channel && (
        <p className="text-xs text-gray-500">
          Channel: {notification.channel.name}
        </p>
      )}
      <p className="text-xs text-gray-400 mt-1">
        {format(new Date(notification.createdAt), 'PPp')}
      </p>
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
      <div className="sticky top-0 left-0 right-0 z-10 bg-blue-50/90 border-b border-blue-200 shadow-sm backdrop-blur pb-1 flex items-center justify-between px-2 max-w-full" style={{marginBottom: 0}}>
        <div className="flex-1 min-w-0">
          {headContent}
          <h3 className="font-semibold text-gray-800 truncate">{title}</h3>
        </div>
        {tooLong && expanded && (
          <button
            className="text-xs text-blue-500 hover:underline ml-2"
            onClick={() => setExpanded(false)}
          >
            Show less
          </button>
        )}
      </div>
      <div className={(tooLong && !expanded ? 'max-h-40 overflow-hidden relative ' : '') + 'break-words w-full max-w-full bg-transparent dark:bg-gray-900 dark:text-gray-100'}>
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
