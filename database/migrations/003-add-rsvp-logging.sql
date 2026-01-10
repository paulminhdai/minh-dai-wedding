-- Migration: Add RSVP submission logging and remove view logging
-- Date: 2024-01-09
-- Purpose: Track RSVP submissions in admin logs, remove excessive view logging

-- Add new admin action type for RSVP submissions
ALTER TYPE admin_action ADD VALUE IF NOT EXISTS 'rsvp_submitted';

-- Optional: Clean up old view logs to reduce clutter
-- DELETE FROM admin_logs WHERE action IN ('view_rsvps', 'view_guests');

-- Add comment
COMMENT ON TYPE admin_action IS 'Admin actions: view_rsvps, delete_rsvp, add_guest, export_data, update_guest, send_reminder, view_guests, delete_guest, rsvp_submitted';
