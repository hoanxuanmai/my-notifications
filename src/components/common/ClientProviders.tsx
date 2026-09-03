'use client';

import { useEffect, useState } from 'react';
import GlobalLoading from '@/components/common/GlobalLoading';
import WebpushNotice from '@/components/common/WebpushNotice';
import AlertModal from '@/components/common/AlertModal';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <GlobalLoading />
      {mounted && <WebpushNotice />}
      <AlertModal />
      {children}
    </>
  );
}
