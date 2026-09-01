export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms' | 'webhook' | 'slack' | 'discord';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type NotificationCategory = 'system' | 'security' | 'billing' | 'social' | 'tasks' | 'updates';

export type DeliveryStatus = 'queued' | 'dispatched' | 'delivered' | 'read' | 'failed' | 'retried';

export interface AppChannel {
  id: string;
  userId: string;
  name: string;
  description?: string;
  webhookToken: string;
  apiKey?: string;
  settings?: Record<string, any>;
  isActive: boolean;
  members?: ChannelMember[];
  _count?: {
    notifications: number;
  };
  notifications?: NotificationItem[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface ChannelMember {
  id: string;
  channelId: string;
  userId: string;
  email?: string;
  role: 'owner' | 'admin' | 'member';
  createdAt?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  channelId?: string | null;
  channelName?: string;
  title: string;
  message: string;
  type: NotificationCategory;
  channel: NotificationChannel;
  priority: NotificationPriority;
  payload?: Record<string, any>;
  isRead: boolean;
  readAt?: string | null;
  isArchived: boolean;
  isPinned?: boolean;
  actionUrl?: string;
  actionLabel?: string;
  sender?: {
    name: string;
    avatar?: string;
    role?: string;
  };
  groupId?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryLog {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: DeliveryStatus;
  latencyMs: number;
  attemptCount: number;
  provider: string;
  deliveredAt?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface NotificationTemplate {
  id: string;
  key?: string;
  name: string;
  slug?: string;
  category: NotificationCategory;
  titleTemplate: string;
  bodyTemplate: string;
  supportedChannels?: NotificationChannel[];
  defaultChannel?: NotificationChannel;
  variables: string[];
  sampleVariables?: Record<string, string>;
  defaultPriority?: NotificationPriority;
  actionUrlTemplate?: string;
  emailSubjectTemplate?: string;
  emailHtmlTemplate?: string;
  createdAt?: string;
}

export interface UserPreferences {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  smsEnabled: boolean;
  webhookEnabled: boolean;
  channels?: {
    inApp: boolean;
    push: boolean;
    email: boolean;
    webhook: boolean;
    sms?: boolean;
    slack?: boolean;
    discord?: boolean;
  };
  categories?: Record<string, any>;
  categoryMatrix: Record<NotificationCategory, Record<NotificationChannel, boolean>>;
  digestFrequency: 'instant' | 'hourly' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    startTime: string; // e.g. "22:00"
    endTime: string;   // e.g. "07:00"
    overrideUrgent: boolean;
  };
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceKey?: string;
  isConnected: boolean;
  isMockMode: boolean;
  realtimeConnected: boolean;
  lastSync?: string;
}

export interface NestJSMigrationItem {
  id: string;
  title: string;
  sourceType: 'gateway' | 'entity' | 'service' | 'queue' | 'controller' | 'prisma';
  nestCode: string;
  supabaseSql: string;
  supabaseClient?: string;
  supabaseClientCode?: string;
  edgeFunction?: string | null;
  edgeFunctionCode?: string | null;
  summary: string;
  migrationSteps: string[];
  architecturalComparison: {
    nestjs: string;
    supabase: string;
  };
}

export interface PushSubscriptionData {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceName?: string;
  browserName?: string;
  osName?: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: {
    url?: string;
    notificationId?: string;
    channelId?: string;
    priority?: string;
    [key: string]: any;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  vibrate?: number[];
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
}

export type ActiveTab = 'inbox' | 'channels' | 'webpush' | 'migration' | 'dispatcher' | 'schemas' | 'cli' | 'templates' | 'preferences';
