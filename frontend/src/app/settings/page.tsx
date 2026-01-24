"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import dynamic from 'next/dynamic';
const WebpushDevices = dynamic(() => import("@/components/settings/WebpushDevices"));

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);
  const [showDevices, setShowDevices] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const token = typeof window !== 'undefined'
      ? localStorage.getItem('auth_token')
      : null;

    if (!token) {
      router.replace('/login');
      return;
    }

    if (!user) {
      router.replace('/');
    }
  }, [isMounted, router, user]);

  if (!isMounted) {
    return null;
  }

  if (!user) {
    return null;
  }

  const displayName = user.username || user.email || "";

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <main className="min-h-screen bg-gray-50 px-3 py-4 sm:p-6  dark:text-gray-500">
          <div className="max-w-md mx-auto bg-white shadow-md rounded-lg p-4 sm:p-6">
        {/* Top navigator-style header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => router.push('/')}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white/80 hover:bg-gray-100 text-gray-700 shadow-sm"
                      aria-label="Go back"
          >
            ←
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold truncate">Account Settings</h1>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 mb-8 mt-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white">
            {displayName.trim().charAt(0).toUpperCase() || "?"}
          </div>
          <div className="text-center">
                      <p className="text-sm text-gray-500">Signed in as</p>
                      <p className="text-base font-medium text-gray-900 break-all">{displayName}</p>
          </div>
        </div>


        <div className="space-y-3 mt-8">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center rounded-md bg-red-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-600"
          >
            Sign out
          </button>
        </div>
        <div className="w-full mt-4">
          {!showDevices
            && <button
              type="button"
              className="w-full mb-4 inline-flex items-center justify-center rounded-md bg-blue-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-600"
              onClick={() => setShowDevices((v) => !v)}
            >
              {showDevices ? 'Hide Devices' : 'Show Devices'}
            </button>}
          {showDevices && <WebpushDevices />}
        </div>
      </div>
    </main>
  );
}
