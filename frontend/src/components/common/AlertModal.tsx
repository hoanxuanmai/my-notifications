"use client"

import { useAlertStore } from '@/stores/alert-store';

export default function AlertModal() {
  const open = useAlertStore((s) => s.open);
  const title = useAlertStore((s) => s.title) || 'Alert';
  const message = useAlertStore((s) => s.message);
  const onClose = useAlertStore((s) => s.closeAlert);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 w-full max-w-xs animate-fade-in">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{message}</p>
        <div className="flex justify-end">
          <button
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
