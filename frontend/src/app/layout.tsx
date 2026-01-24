import type { Metadata } from 'next'
import './globals.css'

import dynamic from 'next/dynamic';
const GlobalLoading = dynamic(() => import('../components/common/GlobalLoading'), { ssr: false });
const WebpushNotice = dynamic(() => import('../components/common/WebpushNotice'), { ssr: false });

export const metadata: Metadata = {
  title: 'My Notifications',
  description: 'Realtime notification system for developers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <GlobalLoading />
        <WebpushNotice lang={typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('vi') ? 'vi' : 'en'} />
        {children}
      </body>
    </html>
  )
}

