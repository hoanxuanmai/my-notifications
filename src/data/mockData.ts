import { NotificationItem, NotificationTemplate, UserPreferences, NestJSMigrationItem, AuthUser } from '../types';

export const DEFAULT_USERS: AuthUser[] = [
  {
    id: 'usr-admin-001',
    email: 'admin@app.com',
    name: 'System Administrator',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    recipientId: 'admin@app.com',
    isAuthenticated: true,
    provider: 'local_session',
  },
  {
    id: 'usr-dev-9921',
    email: 'hoanxuanmai@gmail.com',
    name: 'Hoan Xuan Mai',
    role: 'developer',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    recipientId: 'hoanxuanmai',
    isAuthenticated: true,
    provider: 'local_session',
  },
  {
    id: 'usr-user-302',
    email: 'user@app.com',
    name: 'Standard User',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    recipientId: 'user@app.com',
    isAuthenticated: true,
    provider: 'local_session',
  },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-admin-001',
    userId: 'admin@app.com',
    title: 'Admin Master Alert: Supabase Cluster Status Healthy',
    message: 'All PostgreSQL tables, RLS security policies, and 4 Edge Functions are synchronized for admin@app.com.',
    type: 'system',
    channel: 'in_app',
    priority: 'urgent',
    payload: {
      user: 'admin@app.com',
      role: 'Super Admin',
      database: 'PostgreSQL 16 (Supabase)',
      realtimeStatus: 'active',
      edgeFunctionsCount: 4,
    },
    isRead: false,
    readAt: null,
    isArchived: false,
    isPinned: true,
    actionUrl: '/admin/system',
    actionLabel: 'Cluster Telemetry',
    sender: {
      name: 'Supabase Cluster Admin',
      role: 'Master Node',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(), // 2 mins ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
  {
    id: 'notif-admin-002',
    userId: 'admin@app.com',
    title: 'Admin Authorization: Role-Based Access Enforced',
    message: 'Logged in as admin@app.com with full administrative privileges over all notification channels and Kafka queues.',
    type: 'security',
    channel: 'in_app',
    priority: 'high',
    payload: {
      email: 'admin@app.com',
      authLevel: 'ROOT_ADMIN',
      permissions: ['CREATE_CHANNEL', 'DISPATCH_ALL', 'DEPLOY_FUNCTIONS', 'READ_ALL_LOGS'],
    },
    isRead: false,
    readAt: null,
    isArchived: false,
    isPinned: true,
    actionUrl: '/security/audit',
    actionLabel: 'View Audit Log',
    sender: {
      name: 'Security Guard',
      role: 'RBAC Policy Engine',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'notif-admin-003',
    userId: 'admin@app.com',
    title: 'Kafka Consumer: 1,420 events dispatched without latency spike',
    message: 'Edge Function kafka-bridge processed microservice payloads with average latency 12ms.',
    type: 'tasks',
    channel: 'webhook',
    priority: 'normal',
    payload: {
      topic: 'notifications.broadcast.admin',
      throughput: '120 msg/sec',
      target: 'admin@app.com',
    },
    isRead: true,
    readAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    isArchived: false,
    sender: {
      name: 'Kafka Bridge Worker',
      role: 'Event Pipeline',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 'notif-001',
    userId: 'usr-dev-9921',
    title: 'Critical Security Alert: New Login from Unknown IP',
    message: 'A new session was authenticated from Hanoi, Vietnam (IP: 118.70.124.52) via Supabase Auth.',
    type: 'security',
    channel: 'in_app',
    priority: 'urgent',
    payload: {
      ip: '118.70.124.52',
      location: 'Hanoi, Vietnam',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      authMethod: 'OAuth Google',
    },
    isRead: false,
    readAt: null,
    isArchived: false,
    isPinned: true,
    actionUrl: '/security/sessions',
    actionLabel: 'Review Session',
    sender: {
      name: 'Supabase Auth Guard',
      role: 'Security Engine',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'notif-002',
    userId: 'usr-dev-9921',
    title: 'Stripe Invoice #INV-2026-883 Paid ($129.00)',
    message: 'Your monthly Supabase Pro + Realtime plan subscription payment of $129.00 succeeded.',
    type: 'billing',
    channel: 'email',
    priority: 'normal',
    payload: {
      invoiceId: 'in_1Nt8k62eZvKYlo2CL87a6D9e',
      amount: '$129.00',
      currency: 'USD',
      plan: 'Pro Tier (Realtime 100k msg/mo)',
      pdfUrl: 'https://invoice.stripe.com/pdf/sample',
    },
    isRead: false,
    readAt: null,
    isArchived: false,
    actionUrl: '/billing/invoices/INV-2026-883',
    actionLabel: 'Download Receipt',
    sender: {
      name: 'Stripe Webhook Trigger',
      role: 'Billing Provider',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(), // 42 mins ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  },
  {
    id: 'notif-003',
    userId: 'usr-dev-9921',
    title: 'GitHub Migration: NestJS Gateway converted to Supabase Realtime',
    message: 'WebSocket Gateway (@WebSocketGateway) successfully migrated to PostgreSQL WAL broadcast.',
    type: 'tasks',
    channel: 'in_app',
    priority: 'high',
    payload: {
      repo: 'my-notifications-supabase',
      pullRequest: 42,
      changedFiles: 14,
      latencySavedMs: '45ms -> 8ms',
    },
    isRead: false,
    readAt: null,
    isArchived: false,
    isPinned: true,
    actionUrl: '/migration/pr/42',
    actionLabel: 'Inspect Diff',
    sender: {
      name: 'Migration Bot',
      role: 'DevOps Pipeline',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'notif-004',
    userId: 'usr-dev-9921',
    title: 'Alex Nguyen mentioned you in #core-backend',
    message: '"@hoanxuanmai please check the Supabase Edge Function deployment for push notifications."',
    type: 'social',
    channel: 'slack',
    priority: 'normal',
    payload: {
      channel: '#core-backend',
      threadTs: '1724789012.338900',
      mentionType: 'direct_tag',
    },
    isRead: true,
    readAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    isArchived: false,
    actionUrl: 'https://slack.com/app_redirect?channel=C0123456',
    actionLabel: 'Open Thread in Slack',
    sender: {
      name: 'Alex Nguyen',
      role: 'Senior Tech Lead',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(), // 5 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: 'notif-005',
    userId: 'usr-dev-9921',
    title: 'PostgreSQL Trigger: Storage threshold reached 82%',
    message: 'Bucket "user-attachments" is currently at 82GB of 100GB limit. Auto-scale enabled.',
    type: 'system',
    channel: 'push',
    priority: 'high',
    payload: {
      bucket: 'user-attachments',
      currentUsageGb: 82.4,
      limitGb: 100,
      forecastDaysRemaining: 18,
    },
    isRead: true,
    readAt: new Date(Date.now() - 1000 * 60 * 500).toISOString(),
    isArchived: false,
    actionUrl: '/storage/buckets/user-attachments',
    actionLabel: 'Manage Storage Tier',
    sender: {
      name: 'pg_cron Monitor',
      role: 'Database Daemon',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 720).toISOString(), // 12 hours ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 500).toISOString(),
  },
  {
    id: 'notif-006',
    userId: 'usr-dev-9921',
    title: 'Supabase v2.48.0 Update: Vector index optimization',
    message: 'New HNSW index support and pgvector 0.7.0 are now available for your project.',
    type: 'updates',
    channel: 'in_app',
    priority: 'low',
    payload: {
      version: 'v2.48.0',
      changelogUrl: 'https://supabase.com/changelog',
    },
    isRead: true,
    readAt: new Date(Date.now() - 1000 * 60 * 1440).toISOString(),
    isArchived: true,
    actionUrl: 'https://supabase.com/changelog',
    actionLabel: 'Read Changelog',
    sender: {
      name: 'Supabase Release Bot',
      role: 'System Announcement',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 2880).toISOString(), // 2 days ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 1440).toISOString(),
  },
];

export const INITIAL_PREFERENCES: UserPreferences = {
  userId: 'usr-dev-9921',
  emailEnabled: true,
  pushEnabled: true,
  inAppEnabled: true,
  smsEnabled: false,
  webhookEnabled: true,
  categoryMatrix: {
    security: { in_app: true, push: true, email: true, sms: true, webhook: true, slack: true, discord: false },
    billing: { in_app: true, push: true, email: true, sms: false, webhook: true, slack: false, discord: false },
    tasks: { in_app: true, push: true, email: false, sms: false, webhook: true, slack: true, discord: false },
    social: { in_app: true, push: false, email: false, sms: false, webhook: false, slack: true, discord: false },
    system: { in_app: true, push: true, email: true, sms: false, webhook: true, slack: true, discord: true },
    updates: { in_app: true, push: false, email: true, sms: false, webhook: false, slack: false, discord: false },
  },
  digestFrequency: 'instant',
  quietHours: {
    enabled: true,
    startTime: '22:30',
    endTime: '07:00',
    overrideUrgent: true,
  },
  soundEnabled: true,
  browserNotificationsEnabled: false,
};

export const INITIAL_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'tmpl-01',
    key: 'security_new_login',
    slug: 'security-new-login',
    name: 'Security Alert: New Device Login',
    category: 'security',
    defaultChannel: 'in_app',
    titleTemplate: 'Security Alert: New Login from {{location}}',
    bodyTemplate: 'A new login was detected on your account from {{ip}} using {{device}}. If this wasn\'t you, secure your account immediately.',
    supportedChannels: ['in_app', 'email', 'push', 'sms', 'slack'],
    variables: ['location', 'ip', 'device', 'timestamp', 'actionUrl', 'userName'],
    sampleVariables: {
      location: 'Hanoi, Vietnam',
      ip: '118.70.124.52',
      device: 'MacBook Pro (Chrome 122)',
      timestamp: '2026-08-27 10:45 UTC',
      actionUrl: 'https://app.supabase.com/security/sessions',
      userName: 'Hoan Mai',
      sessionId: 'sess_9831a4',
    },
    defaultPriority: 'urgent',
    actionUrlTemplate: '/security/sessions/revoke/{{sessionId}}',
    emailSubjectTemplate: 'URGENT: New login detected for {{userName}}',
    emailHtmlTemplate: `<div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
  <h2 style="color: #e11d48;">Security Alert: New Login</h2>
  <p>Hello <strong>{{userName}}</strong>,</p>
  <p>We noticed a login from an unrecognized device:</p>
  <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
    <tr><td style="padding: 6px 0; color: #64748b;">Location:</td><td><strong>{{location}}</strong></td></tr>
    <tr><td style="padding: 6px 0; color: #64748b;">IP Address:</td><td><code>{{ip}}</code></td></tr>
    <tr><td style="padding: 6px 0; color: #64748b;">Time:</td><td>{{timestamp}}</td></tr>
  </table>
  <a href="{{actionUrl}}" style="display:inline-block; padding: 12px 24px; background: #e11d48; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">Review Security Activity</a>
</div>`,
  },
  {
    id: 'tmpl-02',
    key: 'billing_invoice_paid',
    slug: 'billing-invoice-paid',
    name: 'Billing: Invoice Payment Receipt',
    category: 'billing',
    defaultChannel: 'email',
    titleTemplate: 'Receipt for Invoice #{{invoiceId}} ({{amount}})',
    bodyTemplate: 'Payment of {{amount}} for {{planName}} was successfully processed via Stripe.',
    supportedChannels: ['in_app', 'email', 'slack', 'webhook'],
    variables: ['invoiceId', 'amount', 'planName', 'pdfUrl', 'userName'],
    sampleVariables: {
      invoiceId: 'INV-2026-883',
      amount: '$129.00',
      planName: 'Supabase Pro + Realtime 100k',
      pdfUrl: 'https://invoice.stripe.com/pdf/sample',
      userName: 'Hoan Mai',
    },
    defaultPriority: 'normal',
    actionUrlTemplate: '/billing/invoices/{{invoiceId}}',
    emailSubjectTemplate: 'Receipt for your payment of {{amount}}',
    emailHtmlTemplate: `<div style="font-family: sans-serif; padding: 24px; color: #0f172a;">
  <h2 style="color: #059669;">Payment Confirmed</h2>
  <p>Hi {{userName}}, thank you for your business!</p>
  <p>Your payment for <strong>{{planName}}</strong> in the amount of <strong>{{amount}}</strong> has cleared.</p>
  <a href="{{pdfUrl}}" style="display:inline-block; margin-top: 10px; padding: 10px 20px; background: #059669; color: #fff; text-decoration: none; border-radius: 6px;">Download PDF Invoice</a>
</div>`,
  },
  {
    id: 'tmpl-03',
    key: 'task_assigned_mention',
    slug: 'task-assigned-mention',
    name: 'Team: Task Assignment & Mention',
    category: 'tasks',
    defaultChannel: 'in_app',
    titleTemplate: '{{assignerName}} assigned you to {{taskTitle}}',
    bodyTemplate: 'You were assigned to "{{taskTitle}}" in project {{projectName}}. Due: {{dueDate}}.',
    supportedChannels: ['in_app', 'push', 'slack', 'discord'],
    variables: ['assignerName', 'taskTitle', 'projectName', 'dueDate', 'taskUrl', 'taskId'],
    sampleVariables: {
      assignerName: 'Alex Nguyen',
      taskTitle: 'Migrate NestJS Gateway to Supabase Realtime',
      projectName: 'Notification Engine V2',
      dueDate: 'Tomorrow at 18:00',
      taskUrl: 'https://github.com/org/repo/issues/42',
      taskId: 'TASK-42',
    },
    defaultPriority: 'high',
    actionUrlTemplate: '/tasks/{{taskId}}',
  },
  {
    id: 'tmpl-04',
    key: 'system_deploy_success',
    slug: 'system-deploy-success',
    name: 'DevOps: Deployment Succeeded',
    category: 'system',
    defaultChannel: 'in_app',
    titleTemplate: 'Deployment {{deployId}} is live in {{environment}}',
    bodyTemplate: 'Commit {{commitHash}} ("{{commitMessage}}") by {{author}} was deployed in {{durationSeconds}}s.',
    supportedChannels: ['in_app', 'webhook', 'slack', 'discord'],
    variables: ['deployId', 'environment', 'commitHash', 'commitMessage', 'author', 'durationSeconds', 'previewUrl'],
    sampleVariables: {
      deployId: 'dep_9941b2',
      environment: 'Production (US-East)',
      commitHash: '8f39a1c',
      commitMessage: 'feat(realtime): enable broadcast channel filters',
      author: 'Hoan Mai',
      durationSeconds: '34',
      previewUrl: 'https://ais-pre-notifications.run.app',
    },
    defaultPriority: 'normal',
    actionUrlTemplate: '{{previewUrl}}',
  },
];

export const NESTJS_MIGRATION_FILES: NestJSMigrationItem[] = [
  {
    id: 'file-gateway',
    title: 'notifications.gateway.ts (NestJS WebSockets -> Supabase Realtime)',
    sourceType: 'gateway',
    summary: 'Replace NestJS Socket.io / WebSocketGateway & Redis Pub/Sub adapter with native Supabase Realtime PostgreSQL Write-Ahead Log (WAL) subscription.',
    migrationSteps: [
      'Remove @WebSocketGateway, Socket.io server dependencies, and Redis adapter boilerplate.',
      'Enable PostgreSQL Realtime Publication on public.notifications table.',
      'Set Row Level Security (RLS) policies so clients only receive events for their own auth.uid().',
      'Use @supabase/supabase-js client channel.on("postgres_changes") on React/NextJS/Vue/Mobile frontend.',
      'Enjoy built-in WebSocket connection clustering, reconnection backoff, and zero Redis servers to manage.',
    ],
    architecturalComparison: {
      nestjs: 'NestJS @WebSocketGateway + Socket.io Server + socket.join(`user:${userId}`) + Redis IORedis adapter for multi-instance scaling.',
      supabase: 'PostgreSQL Realtime replication engine streaming changes directly to client via Supabase Gateway with RLS security evaluation.',
    },
    nestCode: `import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      client.join(\`user:\${userId}\`);
      console.log(\`Client \${client.id} joined room user:\${userId}\`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(\`Client \${client.id} disconnected\`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('sendNotification')
  async handleSendNotification(
    @MessageBody() payload: { targetUserId: string; title: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast to targeted user room
    this.server.to(\`user:\${payload.targetUserId}\`).emit('notificationReceived', {
      ...payload,
      id: Date.now().toString(),
      createdAt: new Date(),
    });
    return { status: 'dispatched' };
  }
}`,
    supabaseSql: `-- 1. Ensure Table Exists
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'system',
  channel VARCHAR(30) DEFAULT 'in_app',
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  payload JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only read and receive their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification read status"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Add to Supabase Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 4. Enable Replica Identity Full (for rich payload diffs)
ALTER TABLE public.notifications REPLICA IDENTITY FULL;`,
    supabaseClientCode: `import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * React Hook: Real-Time Notification Stream from Supabase
 * Replaces NestJS Socket.io Gateway Client listener
 */
export function useSupabaseNotifications(userId: string) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    // 1. Initial Fetch
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setNotifications(data);
          setUnreadCount(data.filter((n) => !n.is_read).length);
        }
      });

    // 2. Realtime Subscription Channel
    const channel = supabase
      .channel(\`notifications:\${userId}\`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: \`user_id=eq.\${userId}\`,
        },
        (payload) => {
          const newNotif = payload.new;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: \`user_id=eq.\${userId}\`,
        },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? payload.new : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { notifications, unreadCount };
}`,
    edgeFunctionCode: `// supabase/functions/send-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, title, message, type, priority, actionUrl, payload } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Insert into Postgres -> Supabase Realtime triggers instantly
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: userId,
        title,
        message,
        type: type || "system",
        priority: priority || "normal",
        action_url: actionUrl,
        payload: payload || {},
        is_read: false
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, notification: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});`,
  },
  {
    id: 'file-entity',
    title: 'notification.entity.ts (TypeORM / Prisma Entity -> Supabase DDL)',
    sourceType: 'entity',
    summary: 'Convert NestJS TypeORM @Entity() or Prisma models into PostgreSQL schema with optimized indexes, JSONB, CHECK constraints, and triggers.',
    migrationSteps: [
      'Translate @PrimaryGeneratedColumn("uuid") to id UUID PRIMARY KEY DEFAULT gen_random_uuid().',
      'Map relations @ManyToOne(() => User) to REFERENCES auth.users(id) ON DELETE CASCADE.',
      'Replace ORM enums with native Postgres CHECK constraints for high performance.',
      'Add partial indexes (e.g. user_id + is_read WHERE is_read = false) for instant sub-millisecond unread counts.',
    ],
    architecturalComparison: {
      nestjs: 'TypeORM / MikroORM / Prisma entity classes with decorators, requiring migration CLI and runtime DB connection pools.',
      supabase: 'Native SQL schema with auto-generated TypeScript types via `supabase gen types typescript --project-id ...`.',
    },
    nestCode: `import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('notifications')
@Index(['userId', 'isRead'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 50, default: 'system' })
  type: string;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, any>;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamp with time zone', nullable: true })
  readAt: Date;

  @Column({ name: 'action_url', type: 'text', nullable: true })
  actionUrl: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}`,
    supabaseSql: `-- PostgreSQL DDL for Supabase Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'system',
  channel VARCHAR(30) NOT NULL DEFAULT 'in_app',
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' 
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  action_label VARCHAR(100),
  sender JSONB DEFAULT '{"name":"System"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Partial Index for instant unread notification count
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON public.notifications (user_id, created_at DESC) 
  WHERE is_read = false;

-- Composite Index for user chronological queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_history 
  ON public.notifications (user_id, created_at DESC);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER trigger_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();`,
    supabaseClientCode: `// Automatically generated type definitions via Supabase CLI
export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'system' | 'security' | 'billing' | 'social' | 'tasks' | 'updates';
  channel: 'in_app' | 'push' | 'email' | 'sms' | 'webhook' | 'slack';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  payload: Record<string, any>;
  is_read: boolean;
  read_at: string | null;
  is_archived: boolean;
  action_url: string | null;
  created_at: string;
  updated_at: string;
}`,
    edgeFunctionCode: null,
  },
  {
    id: 'file-queue',
    title: 'notifications.processor.ts (NestJS BullMQ Queue -> Supabase Webhooks/Edge Functions)',
    sourceType: 'queue',
    summary: 'Replace Redis + BullMQ worker queue consumers with Supabase Database Webhooks triggering serverless Edge Functions or pg_cron.',
    migrationSteps: [
      'Eliminate Redis hosting costs and BullMQ cluster management.',
      'Configure Supabase Database Webhook to trigger on public.notifications INSERT.',
      'Edge Function automatically dispatches multi-channel deliveries (Email via Resend, Push via WebPush/FCM, SMS via Twilio, Slack via Webhook).',
      'Delivery status is recorded directly to public.delivery_logs table.',
    ],
    architecturalComparison: {
      nestjs: 'NestJS @Processor("notifications") + BullMQ + Redis + long-running background worker processes.',
      supabase: 'Database Webhook on INSERT -> Supabase Edge Function (Serverless Deno/V8) with auto-scaling to zero.',
    },
    nestCode: `import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '../mailer/mailer.service';
import { PushService } from '../push/push.service';

@Injectable()
@Processor('notification-dispatch')
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly pushService: PushService,
  ) {}

  @Process('send-multi-channel')
  async handleMultiChannelDispatch(job: Job<{
    userId: string;
    email: string;
    channels: string[];
    title: string;
    body: string;
  }>) {
    const { email, channels, title, body } = job.data;
    this.logger.log(\`Processing dispatch job \${job.id} for \${email}\`);

    if (channels.includes('email')) {
      await this.mailerService.sendEmail({ to: email, subject: title, text: body });
    }
    if (channels.includes('push')) {
      await this.pushService.sendPushNotification(job.data.userId, { title, body });
    }

    return { completed: true, timestamp: Date.now() };
  }
}`,
    supabaseSql: `-- Database Webhook Configuration (Can also be set in Supabase Dashboard > Webhooks)
-- 1. Create delivery logs table
CREATE TABLE IF NOT EXISTS public.delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'dispatched', 'delivered', 'failed', 'retried')),
  latency_ms INT DEFAULT 0,
  attempt_count INT DEFAULT 1,
  provider VARCHAR(50) NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own delivery logs"
ON public.delivery_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.id = delivery_logs.notification_id AND n.user_id = auth.uid()
  )
);`,
    supabaseClientCode: `// Client-side delivery log observer
export async function getDeliveryLogsForNotification(notificationId: string) {
  const { data, error } = await supabase
    .from('delivery_logs')
    .select('*')
    .eq('notification_id', notificationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}`,
    edgeFunctionCode: `// supabase/functions/notification-webhook-dispatcher/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

serve(async (req) => {
  const payload = await req.json();
  const record = payload.record; // The inserted notification from Database Webhook

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const startTime = Date.now();

  try {
    // 1. Fetch user preferences
    const { data: pref } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", record.user_id)
      .single();

    // 2. Dispatch based on channel (e.g. Email via Resend)
    if (record.channel === 'email' || (pref && pref.email_enabled)) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": \`Bearer \${Deno.env.get("RESEND_API_KEY")}\`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "notifications@yourapp.com",
          to: record.payload?.userEmail || "user@example.com",
          subject: record.title,
          html: \`<p>\${record.message}</p>\`,
        }),
      });

      // 3. Log delivery outcome
      await supabase.from("delivery_logs").insert({
        notification_id: record.id,
        channel: "email",
        status: res.ok ? "delivered" : "failed",
        latency_ms: Date.now() - startTime,
        provider: "Resend",
      });
    }

    return new Response(JSON.stringify({ processed: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});`,
  },
  {
    id: 'file-controller',
    title: 'notifications.controller.ts (NestJS REST API -> Supabase PostgREST & Hooks)',
    sourceType: 'controller',
    summary: 'Eliminate manual CRUD controllers, JWT guards, and DTO validations. Supabase PostgREST exposes instant auto-secured REST and GraphQL endpoints.',
    migrationSteps: [
      'Delete NestJS Controllers, Routes, and DTO files for notifications.',
      'Supabase exposes https://<project>.supabase.co/rest/v1/notifications automatically.',
      'Client performs type-safe queries directly: `supabase.from("notifications").select().eq("is_read", false)`.',
      'Database RLS guarantees that no user can query or modify another user data, eliminating the need for controller-level authorization checks.',
    ],
    architecturalComparison: {
      nestjs: 'NestJS @Controller("notifications") + @UseGuards(JwtAuthGuard) + @Get() / @Patch(":id/read") + custom DTOs.',
      supabase: 'Instant PostgREST API with Row Level Security, auto-generated OpenAPI spec, and zero controller code.',
    },
    nestCode: `import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('api/v1/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getMyNotifications(
    @Req() req: any,
    @Query('unreadOnly') unreadOnly?: boolean,
    @Query('limit') limit = 20,
  ) {
    const userId = req.user.id;
    return this.notificationsService.findByUserId(userId, {
      unreadOnly: Boolean(unreadOnly),
      limit: Number(limit),
    });
  }

  @Patch(':id/read')
  async markAsRead(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = req.user.id;
    return this.notificationsService.markRead(id, userId);
  }

  @Patch('mark-all-read')
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.id;
    return this.notificationsService.markAllRead(userId);
  }
}`,
    supabaseSql: `-- No Controller code required! PostgREST serves these endpoints natively.
-- SQL helper function for atomic "Mark All As Read"
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INT AS $$
DECLARE
  updated_count INT;
BEGIN
  UPDATE public.notifications
  SET is_read = true,
      read_at = timezone('utc'::text, now())
  WHERE user_id = auth.uid()
    AND is_read = false;
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`,
    supabaseClientCode: `// Clean, direct client SDK calls (Replaces all NestJS Controller routes)
import { supabase } from './supabaseClient';

// 1. Get My Notifications (with pagination & unread filter)
export async function getNotifications(unreadOnly = false, limit = 20) {
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// 2. Mark Single Notification As Read
export async function markNotificationAsRead(id: string) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 3. Mark All As Read (calls database RPC function)
export async function markAllNotificationsAsRead() {
  const { data, error } = await supabase.rpc('mark_all_notifications_read');
  if (error) throw error;
  return data; // Returns number of records updated
}`,
    edgeFunctionCode: null,
  },
];
