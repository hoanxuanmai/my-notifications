import { pushApi } from '@/lib/api';

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BGk-Oo8bIu07qVCWIg_v2HqI0T9wjoV2exOmVr5u49uSA9sZVpsUQybXh6lbyG9sEfsMSuwYLt3CpQr5-twwkwQ';

const SW_VERSION = process.env.NEXT_PUBLIC_SW_VERSION || '2';

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

export interface WebPushStatus {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
  endpoint?: string;
  vapidKeyConfigured: boolean;
  error?: string;
}

/**
 * Checks the browser's current Web Push support, permission, and active subscription.
 */
export async function getWebPushStatus(): Promise<WebPushStatus> {
  if (typeof window === 'undefined') {
    return {
      supported: false,
      permission: 'unsupported',
      subscribed: false,
      vapidKeyConfigured: Boolean(VAPID_PUBLIC_KEY),
    };
  }

  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!supported) {
    return {
      supported: false,
      permission: 'unsupported',
      subscribed: false,
      vapidKeyConfigured: Boolean(VAPID_PUBLIC_KEY),
      error: 'Web Push is not supported in this browser environment',
    };
  }

  const permission = Notification.permission;
  let subscribed = false;
  let endpoint: string | undefined;

  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        subscribed = true;
        endpoint = sub.endpoint;
      }
    }
  } catch (err: any) {
    return {
      supported: true,
      permission,
      subscribed: false,
      vapidKeyConfigured: Boolean(VAPID_PUBLIC_KEY),
      error: err?.message,
    };
  }

  return {
    supported: true,
    permission,
    subscribed,
    endpoint,
    vapidKeyConfigured: Boolean(VAPID_PUBLIC_KEY),
  };
}

/**
 * Subscribes the current device/browser to Web Push.
 * @param forcePrompt When true (e.g. from user click), prompts for notification permission if default.
 */
export async function subscribeCurrentDevice(forcePrompt = false): Promise<{
  success: boolean;
  endpoint?: string;
  error?: string;
}> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Cannot run in SSR' };
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, error: 'Web Push is not supported on this device/browser' };
  }

  if (!VAPID_PUBLIC_KEY) {
    return { success: false, error: 'Missing VAPID Public Key configuration' };
  }

  try {
    // 1. Check or request Notification Permission
    let permission = Notification.permission;
    if (permission === 'default' && forcePrompt) {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      return {
        success: false,
        error:
          permission === 'denied'
            ? 'Notification permission is blocked in browser settings'
            : 'Notification permission not granted yet',
      };
    }

    // 2. Register Service Worker
    const registration = await navigator.serviceWorker.register(`/sw.js?v=${SW_VERSION}`);
    await navigator.serviceWorker.ready;

    // 3. Inspect existing subscription
    let subscription = await registration.pushManager.getSubscription();

    // Check if existing subscription used a mismatched key
    if (subscription) {
      try {
        const currentKeyRaw = subscription.options?.applicationServerKey;
        const targetKeyBytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        let matches = false;
        if (currentKeyRaw) {
          const curArr = new Uint8Array(currentKeyRaw);
          if (curArr.length === targetKeyBytes.length) {
            matches = curArr.every((b, i) => b === targetKeyBytes[i]);
          }
        }

        if (!matches) {
          console.log('[WebPush] Refreshing subscription with updated VAPID key...');
          await subscription.unsubscribe();
          subscription = null;
        }
      } catch (keyErr) {
        console.warn('[WebPush] Error inspecting key, resetting subscription:', keyErr);
        await subscription.unsubscribe().catch(() => {});
        subscription = null;
      }
    }

    // 4. Create new push subscription if needed
    if (!subscription) {
      const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey as unknown as BufferSource,
      });
    }

    // 5. Send subscription to backend registry
    await pushApi.subscribe(subscription);
    console.log('[WebPush] Device successfully registered for Web Push!');

    return {
      success: true,
      endpoint: subscription.endpoint,
    };
  } catch (err: any) {
    console.error('[WebPush] Failed to subscribe device:', err);
    return {
      success: false,
      error: err?.message || 'Failed to subscribe device to Web Push',
    };
  }
}

/**
 * Unsubscribes the current device.
 */
export async function unsubscribeCurrentDevice(): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return { success: true };
    }
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Triggers an immediate local test notification on this device
 * to verify device permissions and notification display.
 */
export async function sendLocalTestNotification(
  title = 'Test Notification',
  message = 'Web Push notifications are working on this device!'
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: 'Not in browser' };

  if (Notification.permission !== 'granted') {
    return { success: false, error: 'Permission not granted' };
  }

  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg && reg.showNotification) {
      await reg.showNotification(title, {
        body: message,
        icon: '/icons/icon-192x192.svg',
        badge: '/icons/icon-192x192.svg',
        tag: 'local-test-' + Date.now(),
        vibrate: [200, 100, 200],
      } as any);
      return { success: true };
    }

    // Fallback if SW not active yet
    new Notification(title, {
      body: message,
      icon: '/icons/icon-192x192.svg',
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Backward-compatible auto-init for pages/components.
 */
export async function initWebPush(): Promise<void> {
  // If permission is already granted, ensure subscription is active in background
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    await subscribeCurrentDevice(false);
  }
}
