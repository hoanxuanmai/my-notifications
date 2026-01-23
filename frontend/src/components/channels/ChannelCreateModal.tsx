"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ChannelCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; description?: string }) => Promise<void>;
}

export default function ChannelCreateModal({ open, onClose, onCreate }: ChannelCreateModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!open || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;

    try {
      setSubmitting(true);
      await onCreate({ name: name.trim(), description: description.trim() || undefined });
      setName("");
      setDescription("");
      onClose();
    } catch {
        // onCreate already handles errors or can log them here
    } finally {
      setSubmitting(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="relative w-full max-w-sm rounded-xl bg-white text-gray-900 shadow-xl border border-gray-100 p-4 sm:p-5">
        <button
          type="button"
          onClick={() => !submitting && onClose()}
                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-gray-700 shadow hover:bg-gray-300 text-sm leading-none"
          aria-label="Close create channel"
        >
          ×
        </button>
        <div className="flex items-start justify-between mb-2 sm:mb-3">
          <div>
            <h3 className="text-base sm:text-lg font-semibold">New channel</h3>
                      <p className="mt-1 text-xs text-gray-500">
              Create a channel to group related notifications.
            </p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
                          className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Channel name"
              required
            />
          </div>
          <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
                          className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[60px]"
              placeholder="Short description"
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => !submitting && onClose()}
                          className="w-full sm:w-auto px-3 py-1.5 text-xs sm:text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-3 py-1.5 text-xs sm:text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={submitting || !name.trim()}
            >
              {submitting ? 'Creating...' : 'Create channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
