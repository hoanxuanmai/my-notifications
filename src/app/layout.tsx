import React from 'react';
import ClientProviders from '@/components/common/ClientProviders';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <ClientProviders>
        {children}
      </ClientProviders>
    </div>
  );
}
