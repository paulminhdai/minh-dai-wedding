-- Migration: Add comprehensive RSVP attempt logging
-- Date: 2024-01-09
-- Purpose: Track all RSVP attempts including rejections and errors

-- Add new admin action types for RSVP attempts
ALTER TYPE admin_action ADD VALUE IF NOT EXISTS 'rsvp_rejected';
ALTER TYPE admin_action ADD VALUE IF NOT EXISTS 'rsvp_error';

-- Update comment to reflect all action types
COMMENT ON TYPE admin_action IS 'Admin actions: view_rsvps, delete_rsvp, add_guest, export_data, update_guest, send_reminder, view_guests, delete_guest, rsvp_submitted, rsvp_rejected, rsvp_error';

-- Optional: Create a view to summarize RSVP attempts by type
CREATE OR REPLACE VIEW rsvp_attempt_summary AS
SELECT 
    DATE(created_at) as date,
    action,
    COUNT(*) as count,
    COUNT(DISTINCT ip_address) as unique_ips
FROM admin_logs
WHERE action IN ('rsvp_submitted', 'rsvp_rejected', 'rsvp_error')
GROUP BY DATE(created_at), action
ORDER BY date DESC, action;

-- Grant access to the view
GRANT SELECT ON rsvp_attempt_summary TO authenticated;
