'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useAuthStore } from '@/stores/auth-store';
import { initWebPush } from '@/lib/webpush';
import ChannelsList from '@/components/channels/ChannelsList';
import NotificationsList from '@/components/notifications/NotificationsList';
import SmartInstallOverlay from '@/components/common/SmartInstallOverlay';

function MainContent() {
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  // Verify the real Supabase session and subscribe the user to realtime.
  const { user, initialized, logout, initAuth } = useAuthStore();
  const {
    fetchChannels,
    fetchNotifications,
    channels,
    setSelectedChannel,
    selectedChannelId,
  } = useNotificationsStore();

  // Avoid mismatch between server and client rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Verify the real Supabase session.
  useEffect(() => {
    if (!isMounted) return;
    initAuth();
  }, [isMounted, initAuth]);

  // Route guard: only an authenticated Supabase user may see the app.
  useEffect(() => {
    if (!isMounted || !initialized) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    fetchChannels();
    fetchNotifications();
  }, [fetchChannels, fetchNotifications, isMounted, initialized, user, router]);

  // If URL has ?channelId, auto-select that channel (when available)
  useEffect(() => {
    if (!isMounted) return;
    if (!user) return;

    const channelIdFromUrl = searchParams.get('channelId');
    if (!channelIdFromUrl) return;

    if (!channels || channels.length === 0) return;

    const exists = channels.some((ch) => ch.id === channelIdFromUrl);
    if (!exists) return;

    if (selectedChannelId === channelIdFromUrl) return;

    setSelectedChannel(channelIdFromUrl);
  }, [isMounted, user, searchParams, channels, selectedChannelId, setSelectedChannel]);

  // Listen for global unauthorized events (401) to force logout
  // and send the user back to the sign-in page.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = () => {
      logout().finally(() => router.replace('/login'));
    };

    window.addEventListener('auth-unauthorized', handler);
    return () => {
      window.removeEventListener('auth-unauthorized', handler);
    };
  }, [logout, router]);

  // Initialize Web Push after user login
  useEffect(() => {
    if (!isMounted) return;

    if (!user) return;

    initWebPush().catch((err) => {
      console.error('initWebPush failed', err);
    });
  }, [user, isMounted]);

  // Wait for hydration + the session check, and don't flash the app while the
  // guard is redirecting an unauthenticated visitor to /login.
  if (!isMounted || !initialized || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-sm text-gray-500">Loading notifications...</div>
      </div>
    );
  }

  return (
    <>
      <SmartInstallOverlay />
      <main className="min-h-screen px-3 py-3 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col min-h-[calc(100vh-1.5rem)] sm:min-h-[calc(100vh-3rem)]">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-6 flex-shrink-0">
            {/* Left: mobile sidebar toggle */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white dark:bg-gray-800 backdrop-blur hover:bg-gray-100 text-gray-700 dark:text-gray-200 shadow-sm sm:hidden border border-gray-200 dark:border-gray-700"
              aria-label="Open channels list"
            >
              <span className="text-lg">☰</span>
            </button>

            {/* Center: app title */}
            <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
              <span className="inline-block w-2.5 h-2.5 flex-shrink-0 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate">
                My Notifications
              </h1>
              <span className="hidden sm:inline ml-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-medium">
                Supabase
              </span>
            </div>

            {/* Right: user */}
            {user ? (
              <button
                type="button"
                onClick={() => router.push('/settings')}
                className="flex flex-shrink-0 items-center justify-end gap-2 rounded-full p-1 sm:px-3 sm:py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
                aria-label="Open settings"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white flex-shrink-0">
                  {(user.username || user.email || '?')
                    .toString()
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <span className="hidden sm:inline text-xs font-medium text-gray-800 dark:text-gray-200 truncate max-w-[160px]">
                  {user.username || user.email}
                </span>
              </button>
            ) : (
              <div className="h-9 w-9 flex-shrink-0" />
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
              className={`relative h-full w-72 max-w-full bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out ${
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow hover:bg-gray-300 text-sm leading-none"
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
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 text-sm text-gray-500">Loading notifications...</div>}>
      <MainContent />
    </Suspense>
  );
}
