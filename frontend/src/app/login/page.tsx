'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import RegisterLink from '@/components/auth/RegisterLink';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error } = useAuthStore();

  const [emailOrUsername, setEmailOrUsername] = useState('user1');
  const [password, setPassword] = useState('Password1234');
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(emailOrUsername, password);
      router.push('/');
    } catch {
      // error state is handled in store
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4 text-gray-600">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-8">
        <h1 className="text-2xl font-semibold mb-6 text-center text-black">Sign in</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email or Username</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 text-sm"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <RegisterLink />
      </div>
    </main>
  );
}
