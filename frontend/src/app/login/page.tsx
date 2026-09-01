'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import RegisterLink from '@/components/auth/RegisterLink';

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error, user, initialized, initAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // If a valid session already exists, skip the form.
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (initialized && user) router.replace('/');
  }, [initialized, user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      router.replace('/');
    } catch {
      // error state is handled in the store
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4 text-gray-600">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-8">
        <h1 className="text-2xl font-semibold mb-6 text-center text-black">Sign in</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              autoComplete="email"
              className="w-full border rounded px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full border rounded px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

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
