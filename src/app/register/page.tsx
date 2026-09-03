'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useAlertStore } from '@/stores/alert-store';

export default function RegisterPage() {
  const router = useRouter();
  const { loading, error } = useAuthStore();
  const register = useAuthStore((s) => s.register);

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const showAlert = useAlertStore((s) => s.showAlert);
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showAlert('Passwords do not match', 'Register');
      return;
    }
    try {
      await register({ username, email, password, name });
      const { user, pendingConfirmation } = useAuthStore.getState();
      if (user) {
        router.replace('/');
      } else if (pendingConfirmation) {
        showAlert(
          'Account created. Check your email to confirm it, then sign in.',
          'Register'
        );
        router.replace('/login');
      } else {
        router.replace('/login');
      }
    } catch {
      // error state is handled in store
    }
  };

  const fieldClass =
    'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300';

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-gray-800 shadow-md rounded-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
        <h1 className="text-xl sm:text-2xl font-semibold mb-6 text-center text-gray-900 dark:text-gray-100">
          Sign up
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Username *</label>
            <input type="text" className={fieldClass} value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Email *</label>
            <input type="email" inputMode="email" className={fieldClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Name *</label>
            <input type="text" className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Password *</label>
            <input type="password" autoComplete="new-password" className={fieldClass} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Confirm Password *</label>
            <input type="password" autoComplete="new-password" className={fieldClass} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Signing up...' : 'Sign up'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Sign in</a>
        </p>
      </div>
    </main>
  );
}
