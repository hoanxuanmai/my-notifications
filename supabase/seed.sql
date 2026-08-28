-- ==============================================================================
-- MY-NOTIFICATIONS SEED DATA FOR LOCAL DEVELOPMENT
-- ==============================================================================

-- 1. Seed Notification Templates
INSERT INTO public.notification_templates (slug, name, category, title_template, body_template, default_channel, variables, default_priority)
VALUES 
  ('security-login-alert', 'New Device Login Alert', 'security', 'Security Alert: New Sign-in from {{device}}', 'A new sign-in was detected from {{ip_address}} ({{location}}). If this was not you, revoke access immediately.', 'in_app', ARRAY['device', 'ip_address', 'location'], 'urgent'),
  ('billing-invoice-ready', 'Monthly Invoice Available', 'billing', 'Invoice Ready: {{invoice_number}}', 'Your monthly subscription invoice for ${{amount}} is available for download.', 'email', ARRAY['invoice_number', 'amount'], 'normal'),
  ('task-assignment', 'Task Assigned', 'tasks', 'New Task: {{task_name}}', 'You have been assigned to task #{{task_id}} in project {{project_name}} by {{assigner}}.', 'in_app', ARRAY['task_name', 'task_id', 'project_name', 'assigner'], 'high'),
  ('system-deploy-complete', 'Production Deployment Succeeded', 'system', 'Deployment Live: {{service_name}} v{{version}}', 'Version {{version}} has been rolled out across all edge nodes with 0 downtime.', 'in_app', ARRAY['service_name', 'version'], 'normal')
ON CONFLICT (slug) DO NOTHING;

-- 2. Seed Default Channels
INSERT INTO public.channels (
  id,
  name,
  description,
  webhook_token,
  settings,
  is_active,
  expires_at
)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'General Alerts',
    'Primary notification channel for general announcements and application updates',
    'webhook_token_general_01',
    '{"template":"default"}'::jsonb,
    true,
    timezone('utc'::text, now()) + interval '1 year'
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'Engineering & DevOps',
    'CI/CD pipeline alerts, Kafka broker events, and Supabase database migrations',
    'webhook_token_devops_02',
    '{"template":"slack"}'::jsonb,
    true,
    timezone('utc'::text, now()) + interval '1 year'
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Sample Notifications linked to Channels
INSERT INTO public.notifications (
  id,
  channel_id,
  recipient_id,
  title,
  content,
  message,
  category,
  channel,
  type,
  priority,
  payload,
  metadata,
  read,
  is_read,
  is_pinned,
  sender
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'a0000000-0000-0000-0000-000000000001',
    'hoanxuanmai',
    'Supabase Channel Realtime Synchronized',
    'Your channel "General Alerts" is live with real-time WebSocket replication enabled.',
    'Your channel "General Alerts" is live with real-time WebSocket replication enabled.',
    'system',
    'in_app',
    'info',
    'high',
    '{"service":"my-notifications","source":"supabase_channel"}'::jsonb,
    '{"service":"my-notifications","source":"supabase_channel"}'::jsonb,
    false,
    false,
    true,
    '{"name":"Notification Hub","role":"Engine"}'::jsonb
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'a0000000-0000-0000-0000-000000000002',
    'hoanxuanmai',
    'Channel Members RLS Enforced',
    'Only channel owners and invited members can view, read, and dispatch notifications in this channel.',
    'Only channel owners and invited members can view, read, and dispatch notifications in this channel.',
    'security',
    'in_app',
    'success',
    'urgent',
    '{"securityLevel":"high","channelAccess":"member_protected"}'::jsonb,
    '{"securityLevel":"high","channelAccess":"member_protected"}'::jsonb,
    false,
    false,
    false,
    '{"name":"Security Guard","role":"Database Enforcer"}'::jsonb
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'a0000000-0000-0000-0000-000000000002',
    'hoanxuanmai',
    'Kafka Event Dispatched into Channel',
    'Message received via Webhook & Kafka Bridge dispatched to Engineering & DevOps channel.',
    'Message received via Webhook & Kafka Bridge dispatched to Engineering & DevOps channel.',
    'tasks',
    'webhook',
    'info',
    'normal',
    '{"topic":"notification.send","partition":2,"offset":1094}'::jsonb,
    '{"topic":"notification.send","partition":2,"offset":1094}'::jsonb,
    true,
    true,
    false,
    '{"name":"Kafka Edge Bridge","role":"Event Pipeline"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Initial Delivery Logs
INSERT INTO public.delivery_logs (
  notification_id,
  channel,
  status,
  latency_ms,
  provider,
  metadata
)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'in_app', 'delivered', 8, 'supabase_wal_realtime', '{"protocol":"websocket_wal"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'in_app', 'delivered', 12, 'supabase_wal_realtime', '{"security":"enforced"}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', 'webhook', 'delivered', 22, 'edge_function_bridge', '{"httpStatus":200}'::jsonb)
ON CONFLICT DO NOTHING;
