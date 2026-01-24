"use client";
import { useState, useEffect } from "react";

const WEBPUSH_MESSAGES = {
  vi: {
    title: 'Bật thông báo',
    desc: 'Bạn nên bật thông báo để nhận tin tức tức thời từ hệ thống.',
    btn: 'Bật thông báo',
    denied: 'Bạn đã từ chối quyền thông báo. Hãy bật lại trong cài đặt trình duyệt.'
  },
  en: {
    title: 'Enable notifications',
    desc: 'You should enable notifications to get instant updates from the system.',
    btn: 'Enable notifications',
    denied: 'You have denied notification permission. Please enable it in your browser settings.'
  }
};

export default function WebpushNotice({ lang }: { lang: 'vi' | 'en' }) {
  const [webpush, setWebpush] = useState<'default'|'granted'|'denied'|'init'>('init');
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setWebpush(Notification.permission as 'default'|'granted'|'denied');
    }
    // Auto-hide after 10s
    const timer = setTimeout(() => setVisible(false), 100000);
    return () => clearTimeout(timer);
  }, []);

  if (webpush === 'granted' || !visible) return null;

  return (
    <div className="fixed z-50 bottom-4 left-0 right-0 flex justify-center pointer-events-none">
      <div
        className="pointer-events-auto mb-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 flex flex-col items-center text-center shadow-lg relative min-w-[260px] max-w-xs w-full mx-2 cursor-pointer"
        tabIndex={0}
        role="button"
        aria-label={WEBPUSH_MESSAGES[lang].title}
      >
        <button
          className="absolute right-2 top-2 text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 text-lg dark:bg-transparent"
          aria-label="Đóng"
          onClick={e => { e.stopPropagation(); setVisible(false); }}
        >×</button>
        <div className="mb-1">
          <div className="font-bold text-base text-blue-700 dark:text-blue-200 leading-tight">
            {WEBPUSH_MESSAGES[lang].title}
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-200 mt-0.5">
            {webpush === 'denied' ? WEBPUSH_MESSAGES[lang].denied : WEBPUSH_MESSAGES[lang].desc}
          </div>
        </div>
      </div>
    </div>
  );
}
