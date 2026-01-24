"use client";
import { useGlobalStore } from '@/stores/global-store';

export default function GlobalLoading() {
  const loading = useGlobalStore((s) => s.loading);
  if (!loading) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30 backdrop-blur-sm pointer-events-none">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg px-6 py-4 flex items-center gap-3 animate-fade-in">
        <span className="inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
        <span className="text-blue-700 dark:text-blue-200 font-medium text-base">Loading...</span>
      </div>
    </div>
  );
}
