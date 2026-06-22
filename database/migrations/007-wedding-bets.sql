-- Migration: Wedding "Place Your Bets" Game
-- Date: 2026-06-21
-- Purpose: Store guest predictions for the wedding game.

-- 1. Bets table
CREATE TABLE IF NOT EXISTS wedding_bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    guest_name VARCHAR(100) NOT NULL,
    
    -- Store predictions as a JSONB object for flexibility
    -- e.g. { "first_tear": "groom", "speech_length": "5-10", "first_dance_dip": true }
    predictions JSONB NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Enforce one bet per device
    CONSTRAINT wedding_bets_device_unique UNIQUE (device_id)
);

-- 2. Admin action enum value
ALTER TYPE admin_action ADD VALUE IF NOT EXISTS 'bet_deleted';

-- 3. RLS - bets are managed via service role or specific policies
ALTER TABLE wedding_bets ENABLE ROW LEVEL SECURITY;

-- Allow public to insert bets
CREATE POLICY "Allow public to insert bets" ON wedding_bets
    FOR INSERT WITH CHECK (true);

-- Allow service role (admin) full access
CREATE POLICY "Allow service role full access on bets" ON wedding_bets
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE wedding_bets IS 'Guest predictions for the wedding game.';
