"use client";
import { useState, useEffect } from "react";
import { subscribeCurrentDevice } from "@/lib/webpush";

const WEBPUSH_MESSAGES = {
  vi: {
    title: 'Bật thông báo',
    desc: 'Bật thông báo để nhận tin tức tức thời từ hệ thống.',
    btn: 'Bật',
    denied: 'Thông báo đang bị chặn. Mở lại trong cài đặt trình duyệt.',
  },
  en: {
    title: 'Enable notifications',
    desc: 'Turn on notifications to get instant updates.',
    btn: 'Enable',
    denied: 'Notifications are blocked. Re-enable them in your browser settings.',
  },
};

const DISMISS_KEY = 'webpush_notice_dismissed';

export default function WebpushNotice({ lang = 'en' }: { lang?: 'vi' | 'en' }) {
  const [perm, setPerm] = useState<'default' | 'granted' | 'denied' | 'init'>('init');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    const current = Notification.permission as 'default' | 'granted' | 'denied';
    setPerm(current);
    if (current === 'granted') return;

    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      /* storage may be unavailable */
    }
    if (dismissed) return;

    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 12000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const requestPermission = async () => {
    if (typeof Notification === 'undefined' || busy) return;
    setBusy(true);
    try {
      const res = await subscribeCurrentDevice(true);
      if (typeof Notification !== 'undefined') {
        setPerm(Notification.permission);
      }
      if (res.success || Notification.permission === 'granted') {
        dismiss();
      }
    } catch (e) {
      console.error('Failed to subscribe from banner:', e);
    } finally {
      setBusy(false);
    }
  };

  if (perm === 'granted' || perm === 'init' || !visible) return null;

  const msg = WEBPUSH_MESSAGES[lang];

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none"
      role="status"
    >
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur px-3 py-2 shadow-lg animate-fade-in-up">
        <span className="text-lg leading-none" aria-hidden>🔔</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 leading-tight">
            {msg.title}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug truncate">
            {perm === 'denied' ? msg.denied : msg.desc}
          </p>
        </div>
        {perm === 'default' && (
          <button
            type="button"
            onClick={requestPermission}
            disabled={busy}
            className="flex-shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? '…' : msg.btn}
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="flex-shrink-0 -mr-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
