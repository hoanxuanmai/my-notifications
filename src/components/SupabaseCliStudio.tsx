import React, { useState } from 'react';
import {
  Terminal,
  FileCode,
  Copy,
  Check,
  Download,
  FolderGit2,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
  Cpu,
  Sparkles,
  Zap,
  Play,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';

interface SupabaseCliStudioProps {
  onConnectClick?: () => void;
}

export const SupabaseCliStudio: React.FC<SupabaseCliStudioProps> = ({ onConnectClick }) => {
  const [selectedFile, setSelectedFile] = useState<'config' | 'migration' | 'seed' | 'sendFn' | 'kafkaFn' | 'cancelFn' | 'readFn'>('migration');
  const [projectRef, setProjectRef] = useState<string>('f7dt4g2c62jvtjaf2xgdn2');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [simulatedLog, setSimulatedLog] = useState<string[]>([]);
  const [isRunningCommand, setIsRunningCommand] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSimulateCommand = (cmdKey: string, cmdStr: string) => {
    setIsRunningCommand(cmdKey);
    setSimulatedLog((prev) => [
      ...prev,
      `$ ${cmdStr}`,
      `[Executing in workspace root...]`,
    ]);

    setTimeout(() => {
      if (cmdKey === 'login') {
        setSimulatedLog((prev) => [
          ...prev,
          `✔ Logged in as hoanxuanmai@gmail.com`,
          `Access token configured in ~/.supabase/access-token`,
        ]);
      } else if (cmdKey === 'link') {
        setSimulatedLog((prev) => [
          ...prev,
          `✔ Linked to project ${projectRef}`,
          `Remote database: db.${projectRef}.supabase.co:5432`,
        ]);
      } else if (cmdKey === 'push') {
        setSimulatedLog((prev) => [
          ...prev,
          `Applying migration 20240101000000_create_notifications_schema.sql...`,
          `✔ Table public.notifications created`,
          `✔ Table public.delivery_logs created`,
          `✔ Table public.notification_preferences created`,
          `✔ Table public.notification_templates created`,
          `✔ Row Level Security (RLS) policies applied`,
          `✔ RPC functions (read, unread, cancel, count) created`,
          `✔ Realtime publications enabled`,
          `✔ Finished supabase db push on ${projectRef}`,
        ]);
      } else if (cmdKey === 'deploy') {
        setSimulatedLog((prev) => [
          ...prev,
          `Deploying functions (webhooks, send-webpush, kafka-bridge, cancel-notification, read-notification)...`,
          `✔ Deployed Function webhooks on https://${projectRef}.supabase.co/functions/v1/webhooks`,
          `✔ Deployed Function send-webpush on https://${projectRef}.supabase.co/functions/v1/send-webpush`,
          `✔ Deployed Function kafka-bridge on https://${projectRef}.supabase.co/functions/v1/kafka-bridge`,
          `✔ Deployed Function cancel-notification on https://${projectRef}.supabase.co/functions/v1/cancel-notification`,
          `✔ Deployed Function read-notification on https://${projectRef}.supabase.co/functions/v1/read-notification`,
        ]);
      }
      setIsRunningCommand(null);
    }, 1200);
  };

  const FILES_CONTENT = {
    config: {
      name: 'supabase/config.toml',
      type: 'toml',
      description: 'Supabase CLI configuration for local ports, Realtime WAL replication, Studio, and Edge Functions settings.',
      code: `# A string used to distinguish different Supabase projects on the same host.
project_id = "my-notifications"

[api]
enabled = true
port = 54321
schemas = ["public", "storage", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 15

[db.pooler]
enabled = false
port = 54329
pool_mode = "transaction"
default_pool_size = 20
max_client_conn = 100

[realtime]
enabled = true
port = 54323
max_header_length = 4096

[studio]
enabled = true
port = 54324
api_url = "http://127.0.0.1"

[auth]
enabled = true
port = 54325
site_url = "http://localhost:3000"
jwt_expiry = 3600
enable_signup = true

[functions.webhooks]
verify_jwt = false

[functions.kafka-bridge]
verify_jwt = false

[functions.cancel-notification]
verify_jwt = false

[functions.read-notification]
verify_jwt = false`,
    },
    migration: {
      name: 'supabase/migrations/20240101000000_create_notifications_schema.sql',
      type: 'sql',
      description: 'Main PostgreSQL schema migration including notifications, delivery logs, preferences, RLS policies, RPC stored procedures, and Realtime replication.',
      code: `-- ==============================================================================
-- MY-NOTIFICATIONS SUPABASE MIGRATION SCRIPT
-- Replaces NestJS Prisma Schema, Repository, Kafka Consumer, and WebSocket Gateway
-- Direct conversion for hoanxuanmai/my-notifications
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Notifications Table (Domain Model)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id VARCHAR(255) NOT NULL, -- Compatible with hoanxuanmai/my-notifications RecipientId
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,              -- Domain 'content' field
  message TEXT,                       -- Display message preview
  category VARCHAR(50) NOT NULL DEFAULT 'system',
  channel VARCHAR(30) NOT NULL DEFAULT 'in_app' 
    CHECK (channel IN ('in_app', 'push', 'email', 'sms', 'webhook', 'slack', 'discord')),
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' 
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,           -- Direct replacement for CancelNotification use case
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  action_label VARCHAR(100),
  sender JSONB DEFAULT '{"name":"Notification Hub","role":"Engine"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Create Delivery Logs Table (Multi-channel telemetry)
CREATE TABLE IF NOT EXISTS public.delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel VARCHAR(30) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'delivered'
    CHECK (status IN ('queued', 'dispatched', 'delivered', 'read', 'failed', 'retried')),
  latency_ms INTEGER NOT NULL DEFAULT 12,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  provider VARCHAR(50) NOT NULL DEFAULT 'supabase_wal_realtime',
  delivered_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Create Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  webhook_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  digest_frequency VARCHAR(20) NOT NULL DEFAULT 'instant'
    CHECK (digest_frequency IN ('instant', 'hourly', 'daily', 'weekly')),
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start VARCHAR(10) DEFAULT '22:00',
  quiet_hours_end VARCHAR(10) DEFAULT '07:00',
  category_matrix JSONB DEFAULT '{"system":{"in_app":true,"push":true,"email":true},"security":{"in_app":true,"push":true,"email":true},"billing":{"in_app":true,"push":true,"email":true},"tasks":{"in_app":true,"push":true,"email":false},"social":{"in_app":true,"push":false,"email":false},"updates":{"in_app":true,"push":false,"email":false}}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Create Notification Templates Table
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'system',
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  default_channel VARCHAR(30) NOT NULL DEFAULT 'in_app',
  variables TEXT[] DEFAULT ARRAY[]::TEXT[],
  sample_variables JSONB DEFAULT '{}'::jsonb,
  default_priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  action_url_template TEXT,
  email_subject_template TEXT,
  email_html_template TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient 
  ON public.notifications(recipient_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON public.notifications(user_id, is_read) 
  WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
  ON public.notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_notif_id 
  ON public.delivery_logs(notification_id);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- 8. Row Level Security Policies
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" 
  ON public.notifications FOR SELECT TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid()::text = recipient_id OR recipient_id IN ('all', 'broadcast') OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" 
  ON public.notifications FOR UPDATE TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid()::text = recipient_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "notifications_insert_all" ON public.notifications;
CREATE POLICY "notifications_insert_all" 
  ON public.notifications FOR INSERT TO authenticated, anon, service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "preferences_select_own" ON public.notification_preferences;
CREATE POLICY "preferences_select_own" 
  ON public.notification_preferences FOR SELECT TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "preferences_update_own" ON public.notification_preferences;
CREATE POLICY "preferences_update_own" 
  ON public.notification_preferences FOR ALL TO authenticated, anon
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

DROP POLICY IF EXISTS "templates_select_all" ON public.notification_templates;
CREATE POLICY "templates_select_all" 
  ON public.notification_templates FOR SELECT TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "delivery_logs_select" ON public.delivery_logs;
CREATE POLICY "delivery_logs_select" 
  ON public.delivery_logs FOR SELECT TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "delivery_logs_insert" ON public.delivery_logs;
CREATE POLICY "delivery_logs_insert" 
  ON public.delivery_logs FOR INSERT TO authenticated, anon, service_role
  WITH CHECK (true);

-- 9. Stored Procedures / RPC Functions (Replacements for NestJS UseCases)
CREATE OR REPLACE FUNCTION public.read_notification(p_notification_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_result JSONB;
BEGIN
  UPDATE public.notifications
  SET is_read = true, read_at = timezone('utc'::text, now()), updated_at = timezone('utc'::text, now())
  WHERE id = p_notification_id AND (auth.uid() = user_id OR auth.uid()::text = recipient_id OR auth.uid() IS NULL)
  RETURNING to_jsonb(notifications.*) INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.unread_notification(p_notification_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_result JSONB;
BEGIN
  UPDATE public.notifications
  SET is_read = false, read_at = NULL, updated_at = timezone('utc'::text, now())
  WHERE id = p_notification_id AND (auth.uid() = user_id OR auth.uid()::text = recipient_id OR auth.uid() IS NULL)
  RETURNING to_jsonb(notifications.*) INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_notification(p_notification_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_result JSONB;
BEGIN
  UPDATE public.notifications
  SET canceled_at = timezone('utc'::text, now()), is_archived = true, updated_at = timezone('utc'::text, now())
  WHERE id = p_notification_id AND (auth.uid() = user_id OR auth.uid()::text = recipient_id OR auth.uid() IS NULL)
  RETURNING to_jsonb(notifications.*) INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_recipient_notifications(p_recipient_id VARCHAR)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE v_total INTEGER; v_unread INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_read = false AND is_archived = false AND canceled_at IS NULL)
  INTO v_total, v_unread FROM public.notifications WHERE recipient_id = p_recipient_id;
  RETURN jsonb_build_object('recipient_id', p_recipient_id, 'total', v_total, 'unread', v_unread);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_recipient_id VARCHAR)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.notifications SET is_read = true, read_at = timezone('utc'::text, now()), updated_at = timezone('utc'::text, now())
  WHERE recipient_id = p_recipient_id AND is_read = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 10. Enable Supabase Realtime for Tables
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_logs;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;`,
    },
    seed: {
      name: 'supabase/seed.sql',
      type: 'sql',
      description: 'Initial seed datasets with default templates, initial active notifications, and delivery log records for local testing.',
      code: `-- ==============================================================================
-- MY-NOTIFICATIONS SEED DATA FOR LOCAL DEVELOPMENT
-- ==============================================================================

INSERT INTO public.notification_templates (slug, name, category, title_template, body_template, default_channel, variables, default_priority)
VALUES 
  ('security-login-alert', 'New Device Login Alert', 'security', 'Security Alert: New Sign-in from {{device}}', 'A new sign-in was detected from {{ip_address}} ({{location}}). If this was not you, revoke access immediately.', 'in_app', ARRAY['device', 'ip_address', 'location'], 'urgent'),
  ('billing-invoice-ready', 'Monthly Invoice Available', 'billing', 'Invoice Ready: {{invoice_number}}', 'Your monthly subscription invoice for \${{amount}} is available for download.', 'email', ARRAY['invoice_number', 'amount'], 'normal'),
  ('task-assignment', 'Task Assigned', 'tasks', 'New Task: {{task_name}}', 'You have been assigned to task #{{task_id}} in project {{project_name}} by {{assigner}}.', 'in_app', ARRAY['task_name', 'task_id', 'project_name', 'assigner'], 'high')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.notifications (
  id, recipient_id, title, content, message, category, channel, priority, payload, is_read, is_pinned, sender
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'hoanxuanmai',
    'Supabase Realtime Replicated from NestJS',
    'Your migration from NestJS WebSocket Gateway to Supabase Realtime is complete and active.',
    'Your migration from NestJS WebSocket Gateway to Supabase Realtime is complete and active.',
    'system',
    'in_app',
    'high',
    '{"service":"my-notifications","source":"supabase_migration","protocol":"PostgreSQL_WAL"}'::jsonb,
    false,
    true,
    '{"name":"Migration Hub","role":"Architecture Engine"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;`,
    },
    sendFn: {
      name: 'supabase/functions/webhooks/index.ts',
      type: 'typescript',
      description: 'Deno Edge Function replacing NestJS WebhooksController. Handles payload validation, DB insertion, telemetry logging, and HTTP responses.',
      code: `// Supabase Edge Function: webhooks
// Replaces NestJS WebhooksController & SendNotificationUseCase
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  const startTime = Date.now();
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    if (!body.recipientId || !body.title || !body.content) {
      return new Response(JSON.stringify({ error: "Missing recipientId, title, content" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: notification, error: insertError } = await supabase
      .from("notifications")
      .insert({
        recipient_id: body.recipientId,
        title: body.title,
        content: body.content,
        message: body.content,
        category: body.category || 'system',
        channel: body.channel || 'in_app',
        priority: body.priority || 'normal',
        payload: body.payload || {},
        sender: body.sender || { name: "API Gateway", role: "Dispatcher" },
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const latencyMs = Date.now() - startTime;
    await supabase.from("delivery_logs").insert({
      notification_id: notification.id,
      channel: body.channel || 'in_app',
      status: "delivered",
      latency_ms: latencyMs,
      attempt_count: 1,
      provider: "supabase_edge_function",
    });

    return new Response(JSON.stringify({ success: true, notificationId: notification.id, latencyMs }), {
      status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});`,
    },
    kafkaFn: {
      name: 'supabase/functions/kafka-bridge/index.ts',
      type: 'typescript',
      description: 'Deno Edge Function replacing Kafka Consumer. Ingests microservice events, compiles notification templates, and broadcasts via Supabase Realtime.',
      code: `// Supabase Edge Function: kafka-bridge
// Ingests events from Kafka microservices / Upstash / Webhooks
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const event = await req.json();
    if (!event.value?.recipientId) {
      return new Response(JSON.stringify({ error: "Invalid Kafka event" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: notification, error } = await supabase
      .from("notifications")
      .insert({
        recipient_id: event.value.recipientId,
        title: event.value.title || \`Event from \${event.topic}\`,
        content: event.value.content || 'Kafka message processed',
        message: event.value.content || 'Kafka message processed',
        category: event.value.category || 'tasks',
        channel: 'in_app',
        priority: 'high',
        payload: {
          kafkaTopic: event.topic,
          kafkaPartition: event.partition,
          ...(event.value.payload || {}),
        },
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, notificationId: notification.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});`,
    },
    cancelFn: {
      name: 'supabase/functions/cancel-notification/index.ts',
      type: 'typescript',
      description: 'Deno Edge Function replacing NestJS CancelNotificationUseCase. Invokes cancel_notification PostgreSQL RPC.',
      code: `// Supabase Edge Function: cancel-notification
// Replaces NestJS CancelNotificationUseCase
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { notificationId } = await req.json();
    const { data, error } = await supabase.rpc("cancel_notification", {
      p_notification_id: notificationId,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, notification: data }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});`,
    },
    readFn: {
      name: 'supabase/functions/read-notification/index.ts',
      type: 'typescript',
      description: 'Deno Edge Function replacing NestJS ReadNotificationUseCase. Invokes read_notification PostgreSQL RPC.',
      code: `// Supabase Edge Function: read-notification
// Replaces NestJS ReadNotificationUseCase
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { notificationId } = await req.json();
    const { data, error } = await supabase.rpc("read_notification", {
      p_notification_id: notificationId,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, notification: data }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});`,
    },
  };

  const currentFile = FILES_CONTENT[selectedFile];

  const CLI_STEPS = [
    {
      id: 'login',
      title: '1. Đăng nhập Supabase CLI',
      desc: 'Mở trình duyệt để xác thực tài khoản Supabase trên máy tính của bạn',
      command: `npx supabase login`,
    },
    {
      id: 'link',
      title: '2. Liên kết Project ID trên Cloud',
      desc: 'Kết nối thư mục dự án cục bộ với Project Supabase trên cloud',
      command: `npx supabase link --project-ref ${projectRef}`,
    },
    {
      id: 'push',
      title: '3. Đẩy Database Migration & RLS lên Supabase (db push)',
      desc: 'Tạo tự động tất cả bảng notifications, delivery logs, policies RLS và RPC functions',
      command: `npx supabase db push`,
    },
    {
      id: 'deploy',
      title: '4. Triển khai các Supabase Edge Functions',
      desc: 'Deploy toàn bộ 4 hàm xử lý thông báo lên hạ tầng toàn cầu Deno Subhosting',
      command: `npx supabase functions deploy webhooks --no-verify-jwt\nnpx supabase functions deploy send-webpush --no-verify-jwt\nnpx supabase functions deploy kafka-bridge --no-verify-jwt\nnpx supabase functions deploy cancel-notification --no-verify-jwt\nnpx supabase functions deploy read-notification --no-verify-jwt`,
    },
    {
      id: 'types',
      title: '5. Tự động sinh TypeScript Types từ Database',
      desc: 'Sinh file kiểu dữ liệu chuẩn TypeScript từ bảng PostgreSQL đã tạo',
      command: `npx supabase gen types typescript --linked > src/types/supabase.ts`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Terminal className="h-48 w-48 text-emerald-400" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-500/30">
            <Terminal className="h-3.5 w-3.5" />
            Supabase CLI Project Bundle Ready
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Mã nguồn & Hướng dẫn CLI triển khai lên Supabase
          </h2>
          <p className="text-sm text-slate-300 max-w-3xl mt-1.5 leading-relaxed">
            Thư mục <code>/supabase</code> đã được tạo đầy đủ với <strong>config.toml</strong>, migration SQL <strong>20240101000000_create_notifications_schema.sql</strong> (bảng, RLS, RPC Stored Procedures, Realtime) và 4 <strong>Deno Edge Functions</strong> sẵn sàng để bạn chạy CLI đẩy lên Supabase Cloud hoặc chạy Local.
          </p>

          {/* Quick Project Ref Config */}
          <div className="mt-5 flex flex-wrap items-center gap-3 pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Supabase Project Ref:</span>
              <input
                type="text"
                value={projectRef}
                onChange={(e) => setProjectRef(e.target.value)}
                placeholder="e.g. f7dt4g2c62jvtjaf2xgdn2"
                className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500 w-48"
              />
            </div>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">
              Lấy từ: <code>https://supabase.com/dashboard/project/<strong>{projectRef}</strong></code>
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: CLI Workflow & File Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: CLI Deployment Steps (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <h3 className="font-semibold text-sm text-white">Các lệnh Supabase CLI</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Bash / Terminal</span>
            </div>

            <div className="space-y-4 mt-4">
              {CLI_STEPS.map((step) => (
                <div
                  key={step.id}
                  className="bg-slate-950 border border-slate-800/80 rounded-lg p-3.5 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-200">{step.title}</span>
                    <button
                      onClick={() => copyToClipboard(step.command, step.id)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                      title="Copy command"
                    >
                      {copiedId === step.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400">Đã copy</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2 leading-normal">{step.desc}</p>
                  
                  <div className="relative group bg-slate-900 border border-slate-800 rounded p-2.5 font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre">
                    {step.command}
                  </div>

                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => handleSimulateCommand(step.id, step.command.split('\n')[0])}
                      disabled={isRunningCommand !== null}
                      className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      <Play className="h-3 w-3" />
                      <span>{isRunningCommand === step.id ? 'Đang chạy mô phỏng...' : 'Mô phỏng output CLI'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Terminal Output Simulator */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs shadow-inner">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/80"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80"></span>
                <span className="ml-1 text-slate-400 font-sans">CLI Output Console</span>
              </div>
              {simulatedLog.length > 0 && (
                <button
                  onClick={() => setSimulatedLog([])}
                  className="text-slate-500 hover:text-slate-300 text-[10px]"
                >
                  Xoá log
                </button>
              )}
            </div>
            <div className="mt-2.5 max-h-48 overflow-y-auto space-y-1 text-slate-300 text-[11px]">
              {simulatedLog.length === 0 ? (
                <p className="text-slate-600 italic">Nhấn "Mô phỏng output CLI" ở trên để xem tiến trình thực thi của Supabase CLI.</p>
              ) : (
                simulatedLog.map((log, idx) => (
                  <div
                    key={idx}
                    className={
                      log.startsWith('$')
                        ? 'text-cyan-400 font-bold'
                        : log.startsWith('✔')
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                    }
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Supabase Project File Explorer & Viewer (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col h-full">
            
            {/* File Switcher Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  onClick={() => setSelectedFile('migration')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    selectedFile === 'migration'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <FileCode className="h-3.5 w-3.5 text-emerald-400" />
                  <span>migrations.sql</span>
                </button>
                <button
                  onClick={() => setSelectedFile('config')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    selectedFile === 'config'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Terminal className="h-3.5 w-3.5 text-amber-400" />
                  <span>config.toml</span>
                </button>
                <button
                  onClick={() => setSelectedFile('seed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    selectedFile === 'seed'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5 text-cyan-400" />
                  <span>seed.sql</span>
                </button>
                <button
                  onClick={() => setSelectedFile('sendFn')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    selectedFile === 'sendFn'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Cpu className="h-3.5 w-3.5 text-purple-400" />
                  <span>webhooks (Edge)</span>
                </button>
                <button
                  onClick={() => setSelectedFile('kafkaFn')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    selectedFile === 'kafkaFn'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Cpu className="h-3.5 w-3.5 text-blue-400" />
                  <span>kafka-bridge (Edge)</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(currentFile.code, 'file-' + selectedFile)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700"
                >
                  {copiedId === 'file-' + selectedFile ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Đã copy file</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy toàn bộ file</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => downloadFile(currentFile.name.split('/').pop() || 'file.txt', currentFile.code)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-sm"
                  title="Tải file về máy"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Tải file</span>
                </button>
              </div>
            </div>

            {/* File Path & Description */}
            <div className="py-2.5 text-xs text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderGit2 className="h-3.5 w-3.5 text-slate-500" />
                <code className="text-emerald-400 font-mono font-medium">{currentFile.name}</code>
              </div>
              <span className="text-[11px] text-slate-500 font-mono uppercase">{currentFile.type}</span>
            </div>
            <p className="text-xs text-slate-400 mb-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              {currentFile.description}
            </p>

            {/* Code Viewer */}
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-[540px]">
              <pre className="text-slate-300 leading-relaxed">
                <code>{currentFile.code}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
