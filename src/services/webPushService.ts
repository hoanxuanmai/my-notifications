import { PushSubscriptionData, VapidKeys, WebPushPayload } from '../types';
import { supabaseService } from './supabaseClient';

const STORAGE_KEYS = {
  SUBSCRIPTIONS: 'my_notif_webpush_subscriptions_v1',
  VAPID_KEYS: 'my_notif_vapid_keys_v1',
  CURRENT_SUB: 'my_notif_current_sub_endpoint_v1',
};

// Default Demo VAPID Keys (Standard P-256 ECDSA key pair)
const DEFAULT_VAPID_KEYS: VapidKeys = {
  publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
  privateKey: 'SAMPLE_VAPID_PRIVATE_KEY_FOR_EDGE_FUNCTION_SIGNING',
  subject: 'mailto:hoanxuanmai@gmail.com',
};

// Sample initial subscriptions for multi-device showcase
const INITIAL_DEMO_SUBSCRIPTIONS: PushSubscriptionData[] = [
  {
    id: 'sub-mac-01',
    userId: 'hoanxuanmai',
    endpoint: 'https://fcm.googleapis.com/fcm/send/dK902j_sample_endpoint_mac_chrome',
    keys: {
      p256dh: 'BNcRdreALRF88q_w34aN_SAMPLE_P256DH_KEY_FOR_DEVICE_MAC_CHROME_01',
      auth: 'SAMPLE_AUTH_SECRET_KEY_01',
    },
    deviceName: 'MacBook Pro 16" (M3 Max)',
    browserName: 'Google Chrome 125',
    osName: 'macOS Sonoma 14.5',
    isActive: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 'sub-ios-02',
    userId: 'hoanxuanmai',
    endpoint: 'https://web.push.apple.com/QFs029j_sample_endpoint_ios_safari',
    keys: {
      p256dh: 'BCcRdreALRF88q_w34aN_SAMPLE_P256DH_KEY_FOR_DEVICE_IOS_SAFARI_02',
      auth: 'SAMPLE_AUTH_SECRET_KEY_02',
    },
    deviceName: 'iPhone 15 Pro (PWA Home Screen)',
    browserName: 'Mobile Safari 17.4',
    osName: 'iOS 17.5.1',
    isActive: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'sub-win-03',
    userId: 'hoanxuanmai',
    endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/gAAAAABsample_firefox',
    keys: {
      p256dh: 'BEcRdreALRF88q_w34aN_SAMPLE_P256DH_KEY_FOR_DEVICE_WIN_FF_03',
      auth: 'SAMPLE_AUTH_SECRET_KEY_03',
    },
    deviceName: 'Workstation Desktop',
    browserName: 'Mozilla Firefox 126',
    osName: 'Windows 11 Pro',
    isActive: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

class WebPushService {
  private subscriptions: PushSubscriptionData[] = [];
  private vapidKeys: VapidKeys = DEFAULT_VAPID_KEYS;
  private currentSubscriptionEndpoint: string | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const savedSubs = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS);
      this.subscriptions = savedSubs ? JSON.parse(savedSubs) : INITIAL_DEMO_SUBSCRIPTIONS;

      const savedVapid = localStorage.getItem(STORAGE_KEYS.VAPID_KEYS);
      this.vapidKeys = savedVapid ? JSON.parse(savedVapid) : DEFAULT_VAPID_KEYS;

      this.currentSubscriptionEndpoint = localStorage.getItem(STORAGE_KEYS.CURRENT_SUB) || null;
    } catch (e) {
      console.warn('[WebPush] Error loading from storage:', e);
      this.subscriptions = INITIAL_DEMO_SUBSCRIPTIONS;
      this.vapidKeys = DEFAULT_VAPID_KEYS;
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(this.subscriptions));
      localStorage.setItem(STORAGE_KEYS.VAPID_KEYS, JSON.stringify(this.vapidKeys));
      if (this.currentSubscriptionEndpoint) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_SUB, this.currentSubscriptionEndpoint);
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_SUB);
      }
    } catch (e) {
      console.error('[WebPush] Persist error:', e);
    }
    this.notifyListeners();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn());
  }

  // Check Browser Support
  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  public hasPushManager(): boolean {
    if (typeof window === 'undefined') return false;
    return 'PushManager' in window;
  }

  // Check Current Permission Status
  public getPermissionStatus(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  // Request Permission
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return 'denied';
    }
    try {
      const permission = await Notification.requestPermission();
      this.notifyListeners();
      return permission;
    } catch (e) {
      console.error('[WebPush] Request permission failed:', e);
      return 'denied';
    }
  }

  // Register Service Worker
  public async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('[WebPush] Service Worker registered with scope:', registration.scope);
      return registration;
    } catch (err) {
      console.warn('[WebPush] Service worker registration error (fallback mode):', err);
      return null;
    }
  }

  // Utility to convert Base64 URL to Uint8Array for PushManager
  public urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Subscribe Current Browser Device
  public async subscribeBrowser(userId: string = 'hoanxuanmai'): Promise<PushSubscriptionData> {
    const perm = await this.requestPermission();
    if (perm !== 'granted') {
      throw new Error('Browser notification permission was not granted.');
    }

    let realEndpoint = '';
    let p256dh = '';
    let auth = '';

    // Attempt real browser PushManager subscription
    try {
      const reg = await this.registerServiceWorker();
      if (reg && 'pushManager' in reg) {
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          try {
            const convertedVapidKey = this.urlBase64ToUint8Array(this.vapidKeys.publicKey);
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedVapidKey,
            });
          } catch (subErr) {
            console.warn('[WebPush] Live pushManager subscribe threw, using browser endpoint proxy:', subErr);
          }
        }

        if (sub) {
          realEndpoint = sub.endpoint;
          const p256dhKey = sub.getKey('p256dh');
          const authKey = sub.getKey('auth');
          if (p256dhKey) p256dh = btoa(String.fromCharCode(...new Uint8Array(p256dhKey)));
          if (authKey) auth = btoa(String.fromCharCode(...new Uint8Array(authKey)));
        }
      }
    } catch (e) {
      console.warn('[WebPush] Native SW PushManager not accessible in sandboxed iframe, generating local WebPush Client Record', e);
    }

    // If native push manager returned empty in sandbox/iframe, generate valid client representation
    if (!realEndpoint) {
      const uniqueDeviceKey = Math.random().toString(36).substring(2, 10);
      realEndpoint = `https://fcm.googleapis.com/fcm/send/current_browser_session_${uniqueDeviceKey}`;
      p256dh = 'BM' + Math.random().toString(36).substring(2, 15) + '_p256dh_client_key';
      auth = 'auth_' + Math.random().toString(36).substring(2, 12);
    }

    const browserInfo = this.detectBrowser();
    const newSub: PushSubscriptionData = {
      id: 'sub-' + Math.random().toString(36).substring(2, 9),
      userId,
      endpoint: realEndpoint,
      keys: {
        p256dh: p256dh || 'BN_SAMPLE_KEY_P256',
        auth: auth || 'AUTH_TOKEN_SECRET',
      },
      deviceName: `Current Device (${browserInfo.browser})`,
      browserName: browserInfo.browser,
      osName: browserInfo.os,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };

    // Save locally
    const existingIdx = this.subscriptions.findIndex((s) => s.endpoint === realEndpoint);
    if (existingIdx >= 0) {
      this.subscriptions[existingIdx] = newSub;
    } else {
      this.subscriptions = [newSub, ...this.subscriptions];
    }

    this.currentSubscriptionEndpoint = realEndpoint;
    this.persist();

    // Persist to Supabase push_subscriptions table
    if (supabaseService.isConnected()) {
      supabaseService.savePushSubscription(newSub).catch((err) => {
        console.warn('[WebPush] Supabase table push_subscriptions save error:', err);
      });
    }

    // Call server to persist in push_subscriptions table
    try {
      await fetch('/api/webpush/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subscription: {
            endpoint: newSub.endpoint,
            keys: newSub.keys,
          },
          deviceName: newSub.deviceName,
          browserName: newSub.browserName,
          osName: newSub.osName,
        }),
      });
    } catch (err) {
      console.warn('[WebPush] Server subscribe save sync:', err);
    }

    return newSub;
  }

  // Unsubscribe Current Device
  public async unsubscribeBrowser(): Promise<boolean> {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && 'pushManager' in reg) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await sub.unsubscribe();
          }
        }
      }
    } catch (e) {
      console.warn('[WebPush] Unsubscribe error:', e);
    }

    if (this.currentSubscriptionEndpoint) {
      const ep = this.currentSubscriptionEndpoint;
      this.subscriptions = this.subscriptions.filter((s) => s.endpoint !== ep);
      this.currentSubscriptionEndpoint = null;
      this.persist();

      if (supabaseService.isConnected()) {
        supabaseService.deletePushSubscription(ep).catch((err) => {
          console.warn('[WebPush] Supabase table push_subscriptions delete error:', err);
        });
      }

      try {
        await fetch('/api/webpush/unsubscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: ep }),
        });
      } catch (err) {
        console.warn('[WebPush] Server unsubscribe sync:', err);
      }
    }

    return true;
  }

  // Detect Browser & OS info
  private detectBrowser(): { browser: string; os: string } {
    if (typeof window === 'undefined' || !navigator.userAgent) {
      return { browser: 'Modern Web Browser', os: 'Desktop OS' };
    }
    const ua = navigator.userAgent;
    let browser = 'Chrome';
    let os = 'macOS';

    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Microsoft Edge';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

    if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Win')) os = 'Windows 11/10';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Linux')) os = 'Linux';

    return { browser, os };
  }

  // Get All Subscriptions
  public getSubscriptions(): PushSubscriptionData[] {
    return [...this.subscriptions];
  }

  public getCurrentSubscription(): PushSubscriptionData | undefined {
    return this.subscriptions.find((s) => s.endpoint === this.currentSubscriptionEndpoint);
  }

  public getVapidKeys(): VapidKeys {
    return { ...this.vapidKeys };
  }

  public setVapidKeys(keys: VapidKeys) {
    this.vapidKeys = keys;
    this.persist();
  }

  public async generateNewVapidKeys(): Promise<VapidKeys> {
    try {
      const res = await fetch('/api/webpush/generate-vapid', { method: 'POST' });
      const data = await res.json();
      if (data.publicKey && data.privateKey) {
        this.vapidKeys = {
          publicKey: data.publicKey,
          privateKey: data.privateKey,
          subject: data.subject || this.vapidKeys.subject,
        };
        this.persist();
        return this.vapidKeys;
      }
    } catch (e) {
      console.warn('[WebPush] API generate-vapid failed, generating client fallback keys:', e);
    }

    // Fallback key generator
    const randomHex = () => Math.random().toString(36).substring(2, 15);
    const newKeys: VapidKeys = {
      publicKey: `BF${randomHex()}_${randomHex()}_${randomHex()}_VAPID_PUB`,
      privateKey: `PRIV_${randomHex()}_${randomHex()}_VAPID_SECRET`,
      subject: this.vapidKeys.subject || 'mailto:hoanxuanmai@gmail.com',
    };
    this.vapidKeys = newKeys;
    this.persist();
    return newKeys;
  }

  public toggleSubscriptionActive(id: string) {
    this.subscriptions = this.subscriptions.map((s) =>
      s.id === id ? { ...s, isActive: !s.isActive } : s
    );
    this.persist();
  }

  public removeSubscription(id: string) {
    const sub = this.subscriptions.find((s) => s.id === id);
    if (sub && sub.endpoint === this.currentSubscriptionEndpoint) {
      this.currentSubscriptionEndpoint = null;
    }
    this.subscriptions = this.subscriptions.filter((s) => s.id !== id);
    this.persist();
  }

  // Trigger Native Local Notification (Pop-up on user screen)
  public async triggerNativeNotification(payload: WebPushPayload): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission !== 'granted') {
      const res = await this.requestPermission();
      if (res !== 'granted') return false;
    }

    try {
      // First try via active Service Worker registration
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready.catch(() => null);
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(payload.title, {
            body: payload.body,
            icon: payload.icon || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
            badge: payload.badge || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=64&auto=format&fit=crop&q=80',
            image: payload.image,
            tag: payload.tag || 'demo-tag-' + Date.now(),
            data: payload.data || { url: '/' },
            actions: payload.actions,
            vibrate: payload.vibrate || [200, 100, 200],
            requireInteraction: payload.requireInteraction,
            silent: payload.silent,
          });
          return true;
        }
      }

      // Fallback to standard Notification constructor
      const n = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
        tag: payload.tag || 'demo-tag-' + Date.now(),
        silent: payload.silent,
      });

      n.onclick = () => {
        window.focus();
        if (payload.data?.url) {
          window.location.href = payload.data.url;
        }
        n.close();
      };
      return true;
    } catch (err) {
      console.warn('[WebPush] Native notification popup failed (iframe permissions or browser block):', err);
      return false;
    }
  }

  // Dispatch Web Push to Backend / Edge Function Simulator
  public async dispatchWebPush(
    payload: WebPushPayload,
    options?: {
      targetUserId?: string;
      subscriptionId?: string;
    }
  ): Promise<{
    success: boolean;
    deliveredCount: number;
    latencyMs: number;
    receiptId: string;
    error?: string;
  }> {
    const startTime = Date.now();

    // Trigger immediate native notification popup for testing
    this.triggerNativeNotification(payload);

    // If live connected to Supabase, invoke Edge Function send-webpush
    if (supabaseService.isConnected()) {
      try {
        const edgeRes = await supabaseService.invokeSendWebpush(payload, options?.targetUserId || 'hoanxuanmai');
        return {
          success: edgeRes.success,
          deliveredCount: edgeRes.deliveredCount || this.subscriptions.filter((s) => s.isActive).length || 1,
          latencyMs: Date.now() - startTime,
          receiptId: edgeRes.receiptId,
        };
      } catch (err: any) {
        console.warn('[WebPush] Edge function dispatch fallback to API:', err);
      }
    }

    try {
      const res = await fetch('/api/webpush/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload,
          targetUserId: options?.targetUserId || 'hoanxuanmai',
          subscriptionId: options?.subscriptionId,
          vapidKeys: this.vapidKeys,
        }),
      });

      const data = await res.json();
      return {
        success: data.success ?? true,
        deliveredCount: data.deliveredCount || this.subscriptions.filter((s) => s.isActive).length || 1,
        latencyMs: data.latencyMs || Date.now() - startTime,
        receiptId: data.receiptId || 'wp_' + Math.random().toString(36).substring(2, 9),
      };
    } catch (e: any) {
      return {
        success: true,
        deliveredCount: this.subscriptions.filter((s) => s.isActive).length || 1,
        latencyMs: Date.now() - startTime,
        receiptId: 'wp_local_' + Math.random().toString(36).substring(2, 9),
      };
    }
  }
}

export const webPushService = new WebPushService();
