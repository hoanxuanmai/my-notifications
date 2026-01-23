import { pushApi } from '@/lib/api';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function initWebPush(): Promise<void> {
  if (typeof window === 'undefined') return;

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Web Push is not supported in this browser');
    return;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.warn('Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY; Web Push subscription is disabled');
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted, skipping Web Push subscription');
      return;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');

    // Use existing subscription if available
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast to BufferSource to satisfy TypeScript while keeping runtime behavior
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      });
    }

    // Send subscription to backend
    await pushApi.subscribe(subscription);
  } catch (error) {
    console.error('Failed to initialize Web Push', error);
  }
}
