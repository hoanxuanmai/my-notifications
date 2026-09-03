import React from 'react';
import { usePathname } from '@/shims/next-navigation';
import ClientProviders from '@/components/common/ClientProviders';
import Home from '@/app/page';
import LoginPage from '@/app/login/page';
import RegisterPage from '@/app/register/page';
import SettingsPage from '@/app/settings/page';

export default function App() {
  const pathname = usePathname();

  const renderContent = () => {
    switch (pathname) {
      case '/login':
        return <LoginPage />;
      case '/register':
        return <RegisterPage />;
      case '/settings':
        return <SettingsPage />;
      case '/':
      default:
        return <Home />;
    }
  };

  return (
    <ClientProviders>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        {renderContent()}
      </div>
    </ClientProviders>
  );
}
