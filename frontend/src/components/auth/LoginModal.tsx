"use client";

import { FormEvent, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login, loading, error } = useAuthStore();

  const [emailOrUsername, setEmailOrUsername] = useState("user1");
  const [password, setPassword] = useState("Password1234");

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(emailOrUsername, password);
      if (onClose) {
        onClose();
      }
    } catch {
      // error state is handled in store
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 sm:px-0 overflow-y-auto">
      <div className="my-8 w-full max-w-md bg-white dark:bg-white text-gray-900 dark:text-gray-900 shadow-md rounded-lg p-6 max-h-[calc(100vh-4rem)] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4 text-center text-gray-900">Sign in</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-800">Email or Username</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 text-sm"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-800">Password</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
