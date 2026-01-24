"use client"

import { useAlertStore } from '@/stores/alert-store';

export default function AlertModal() {
  const open = useAlertStore((s) => s.open);
  const title = useAlertStore((s) => s.title) || 'Alert';
  const message = useAlertStore((s) => s.message);
  const onClose = useAlertStore((s) => s.closeAlert);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs animate-fade-in">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        <div className="flex justify-end">
          <button
            className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
