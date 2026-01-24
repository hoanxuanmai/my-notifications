"use client";
import { useEffect, useState } from "react";


function isStandalone() {
  // iOS (safely check for property)
  if (typeof window !== 'undefined' && 'standalone' in window.navigator && (window.navigator as any).standalone) return true;
  // Android/Chrome
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return false;
}

function getPlatform() {
  const ua = window.navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "other";
}


const MESSAGES = {
// ...existing code...
  vi: {
    title: 'Cài đặt ứng dụng nhanh',
    android: {
      desc: 'Bạn có thể cài đặt ứng dụng này lên màn hình chính để truy cập nhanh hơn.',
      benefit: 'Khi cài vào màn hình chính, bạn sẽ nhận được thông báo ngay cả khi khóa màn hình.',
      btn: 'Thêm vào màn hình chính',
    },
    ios: {
      desc: 'Để cài đặt ứng dụng, hãy nhấn ',
      share: 'Chia sẻ',
      more: 'và chọn ',
      add: 'Thêm vào MH chính',
      safari: ' trong trình duyệt Safari.',
      benefit: 'Khi cài vào màn hình chính, bạn sẽ nhận được thông báo ngay cả khi khóa màn hình.',
    },
    other: {
      desc: 'Bạn có thể cài đặt ứng dụng này như một PWA nếu trình duyệt hỗ trợ.'
    }
  },
  en: {
    title: 'Quick App Install',
    android: {
      desc: 'You can install this app to your home screen for faster access.',
      benefit: 'When installed, you will receive notifications even when your screen is locked.',
      btn: 'Add to Home Screen',
    },
    ios: {
      desc: 'To install, tap ',
      share: 'Share',
      more: 'and select ',
      add: 'Add to Home Screen',
      safari: ' in Safari browser.',
      benefit: 'When installed, you will receive notifications even when your screen is locked.',
    },
    other: {
      desc: 'You can install this app as a PWA if your browser supports it.'
    }
  }
};

export default function SmartInstallOverlay() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState("other");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [lang, setLang] = useState<'vi'|'en'>('en');
// ...existing code...

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPlatform(getPlatform());
    if (isStandalone()) return;

    // Detect language
    const navLang = (navigator.language || navigator.languages?.[0] || 'en').toLowerCase();
    setLang(navLang.startsWith('vi') ? 'vi' : 'en');

    // ...existing code...
    // Listen for beforeinstallprompt (Android/Chrome)
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS: show if not in standalone
    if (getPlatform() === "ios") {
      setShow(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl p-4 max-w-sm w-full mx-2 mb-6 animate-fade-in-up border border-gray-200 dark:border-neutral-700 relative">
        <button
          className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl"
          onClick={() => setShow(false)}
          aria-label="Đóng"
        >
          ×
        </button>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">📲</span>
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{MESSAGES[lang].title}</h3>
        </div>
        {platform === "android" && deferredPrompt && (
          <>
            <p className="mb-2 text-gray-700 dark:text-gray-200 text-sm">
              {MESSAGES[lang].android.desc}
            </p>
            <p className="mb-3 text-gray-500 dark:text-gray-400 text-xs">
              {MESSAGES[lang].android.benefit}
            </p>
            <button
              className="btn-primary w-full"
              onClick={async () => {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === "accepted") setShow(false);
              }}
            >
              {MESSAGES[lang].android.btn}
            </button>
          </>
        )}
        {platform === "ios" && (
          <>
            <p className="mb-2 text-gray-700 dark:text-gray-200 text-sm">
              {MESSAGES[lang].ios.desc}
              <span className="inline-block px-2 py-0.5 bg-gray-200 dark:bg-neutral-800 rounded text-xs mx-1">{MESSAGES[lang].ios.share}</span>
              {MESSAGES[lang].ios.more}
              <b>{MESSAGES[lang].ios.add}</b>
              {MESSAGES[lang].ios.safari}
            </p>
            <p className="mb-2 text-gray-500 dark:text-gray-400 text-xs">
              {MESSAGES[lang].ios.benefit}
            </p>
            <div className="flex flex-col items-center gap-2 mt-2">
              {/* SVG icon for iOS share */}
              <svg viewBox="0 0 32 32" width="32" height="32" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8">
                <rect x="6" y="14" width="20" height="12" rx="3" fill="#e5e7eb" className="dark:fill-neutral-800" />
                <path d="M16 20V6" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M12.5 9.5L16 6l3.5 3.5" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {/* Notification illustration */}
              {/* <svg viewBox="0 0 120 80" width="120" height="80" fill="none" className="h-16 mt-1">
                <rect x="10" y="10" width="100" height="60" rx="12" fill="#f3f4f6" className="dark:fill-neutral-800" />
                <rect x="25" y="25" width="70" height="12" rx="6" fill="#2563eb" fillOpacity=".15" />
                <rect x="25" y="43" width="50" height="8" rx="4" fill="#2563eb" fillOpacity=".10" />
                <circle cx="100" cy="20" r="7" fill="#2563eb" />
                <rect x="90" y="15" width="20" height="10" rx="5" fill="#fff" fillOpacity=".7" />
                <text x="100" y="23" textAnchor="middle" fontSize="8" fill="#2563eb" fontWeight="bold">1</text>
              </svg> */}
            </div>
          </>
        )}
        {platform === "other" && (
          <>
            <p className="text-gray-700 dark:text-gray-200 text-sm">
              {MESSAGES[lang].other.desc}
            </p>
            <div className="flex justify-center mt-3">
              {/* Notification illustration */}
              <svg viewBox="0 0 120 80" width="120" height="80" fill="none" className="h-16">
                <rect x="10" y="10" width="100" height="60" rx="12" fill="#f3f4f6" className="dark:fill-neutral-800" />
                <rect x="25" y="25" width="70" height="12" rx="6" fill="#2563eb" fillOpacity=".15" />
                <rect x="25" y="43" width="50" height="8" rx="4" fill="#2563eb" fillOpacity=".10" />
                <circle cx="100" cy="20" r="7" fill="#2563eb" />
                <rect x="90" y="15" width="20" height="10" rx="5" fill="#fff" fillOpacity=".7" />
                <text x="100" y="23" textAnchor="middle" fontSize="8" fill="#2563eb" fontWeight="bold">1</text>
              </svg>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
