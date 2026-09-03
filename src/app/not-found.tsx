import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 text-center">
      <h2 className="text-2xl font-bold mb-2">404 - Page Not Found</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">The page you are looking for does not exist.</p>
      <Link
        href="/"
        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
