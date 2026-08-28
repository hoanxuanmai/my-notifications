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

-- 2. Seed Sample Notifications
INSERT INTO public.notifications (
  id,
  recipient_id,
  title,
  content,
  message,
  category,
  channel,
  priority,
  payload,
  is_read,
  is_pinned,
  sender
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
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'hoanxuanmai',
    'RLS Policy Protection Verified',
    'Row Level Security is active. Only users matching auth.uid() or recipient_id can access records.',
    'Row Level Security is active. Only users matching auth.uid() or recipient_id can access records.',
    'security',
    'in_app',
    'urgent',
    '{"securityLevel":"high","rlsEnabled":true}'::jsonb,
    false,
    false,
    '{"name":"Security Guard","role":"Database Enforcer"}'::jsonb
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'hoanxuanmai',
    'Kafka Event Processed via Edge Function',
    'Consumer consumed message from topic notification.send and written to PostgreSQL in 14ms.',
    'Consumer consumed message from topic notification.send and written to PostgreSQL in 14ms.',
    'tasks',
    'webhook',
    'normal',
    '{"topic":"notification.send","partition":2,"offset":1094}'::jsonb,
    true,
    false,
    '{"name":"Kafka Edge Bridge","role":"Event Pipeline"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Initial Delivery Logs
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
