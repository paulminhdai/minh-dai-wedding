-- Migration: Add game results to settings
-- Date: 2026-06-21
-- Purpose: Store the official answers for the prediction game.

ALTER TABLE wedding_settings 
ADD COLUMN IF NOT EXISTS game_results JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN wedding_settings.game_results IS 'Official answers for the prediction game (e.g. {"first_tear": "groom", ...})';
