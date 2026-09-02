import type { Metadata, Viewport } from 'next';
import './globals.css';
import ClientProviders from '@/components/common/ClientProviders';

export const metadata: Metadata = {
  title: 'My Notifications',
  description: 'Real-time notification dashboard connected to Supabase backend, channels, webhooks, and push delivery.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
