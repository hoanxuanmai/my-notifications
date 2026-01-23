'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useAuthStore } from '@/stores/auth-store';
import { initWebPush } from '@/lib/webpush';
import ChannelsList from '@/components/channels/ChannelsList';
import NotificationsList from '@/components/notifications/NotificationsList';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  // Initialize auth-store to restore from localStorage and subscribe user
  const { user } = useAuthStore();
  const { fetchChannels, fetchNotifications } = useNotificationsStore();

  // Avoid mismatch between server and client rendering
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

    fetchChannels();
    fetchNotifications();
  }, [fetchChannels, fetchNotifications, router, isMounted]);

  // Initialize Web Push after user login
  useEffect(() => {
    if (!isMounted) return;

    if (!user) return;

    initWebPush().catch((err) => {
      console.error('initWebPush failed', err);
    });
  }, [user, isMounted]);

  if (!isMounted) {
    return null;
  }

  return (
    <main className="min-h-screen px-3 py-3 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto flex flex-col min-h-[calc(100vh-1.5rem)] sm:min-h-[calc(100vh-3rem)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6 flex-shrink-0">
          {/* Left: mobile sidebar toggle */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white/80 backdrop-blur hover:bg-gray-100 text-gray-700 shadow-sm sm:hidden"
            aria-label="Open channels list"
          >
            <span className="text-lg">☰</span>
          </button>

          {/* Center: app title */}
          <h1 className="flex-1 text-center text-2xl sm:text-left sm:text-3xl font-bold">
            My Notifications
          </h1>

          {/* Right: user */}
          {user ? (
            <button
              type="button"
              onClick={() => router.push('/settings')}
              className="flex items-center justify-end gap-3 rounded-full px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors max-w-[50%] sm:max-w-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white flex-shrink-0">
                  {(user.username || user.email || '?')
                    .toString()
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <span className="hidden sm:inline text-sm font-medium text-gray-800 dark:text-gray-100 truncate max-w-[160px]">
                  {user.username || user.email}
                </span>
              </div>
            </button>
          ) : (
            <div className="h-8 w-8 sm:h-9 sm:w-9" />
          )}
        </div>

        {/* Content area fills remaining height */}
        <div className="flex-1 flex flex-col md:grid md:grid-cols-3 gap-4 md:gap-6">
          {/* Desktop: sidebar + content */}
          <div className="hidden md:block md:col-span-1 h-full">
            <ChannelsList />
          </div>
          <div className="hidden md:block md:col-span-2 h-full">
            <NotificationsList />
          </div>

          {/* Mobile: notifications full-height */}
          <div className="md:hidden h-full">
            <NotificationsList />
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlay with slide-in/out animation */}
      <div
        className={`fixed inset-0 z-40 flex md:hidden transition-opacity duration-300 ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* Sidebar panel */}
        <div className="relative flex h-full">
          <div
            className={`relative h-full w-72 max-w-full bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="absolute right-1 top-1 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-300 text-white shadow hover:bg-red-600"
              aria-label="Close channels list"
            >
              ×
            </button>
            <div className="p-4 h-full overflow-y-auto">
              <ChannelsList onChannelSelected={() => setIsSidebarOpen(false)} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

