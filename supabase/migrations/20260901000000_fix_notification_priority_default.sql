-- ==============================================================================
-- FIX: notifications.priority was locked down by a CHECK constraint
-- ("notifications_priority_check") that only allowed
-- ('low', 'normal', 'high', 'urgent'). That rejected any other value
-- (e.g. priority: "medium" from a webhook caller) with error 23514.
--
-- priority is just a free-form label consumers can filter/sort on -- it
-- should accept whatever the caller sends, so this migration drops the
-- constraint instead of trying to keep the allowed list in sync with every
-- caller.
-- ==============================================================================

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_priority_check;
