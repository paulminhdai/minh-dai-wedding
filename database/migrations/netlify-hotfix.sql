-- Quick fix for Netlify deployment
-- This adds the columns that the Netlify functions are trying to use

-- Add missing columns to rsvps table if they don't exist
DO $$
BEGIN
    -- Add guest_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'rsvps' AND column_name = 'guest_name') THEN
        ALTER TABLE rsvps ADD COLUMN guest_name VARCHAR(255);
    END IF;

    -- Add phone column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'rsvps' AND column_name = 'phone') THEN
        ALTER TABLE rsvps ADD COLUMN phone VARCHAR(50);
    END IF;

    -- Add attending column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'rsvps' AND column_name = 'attending') THEN
        ALTER TABLE rsvps ADD COLUMN attending VARCHAR(10);
    END IF;

    -- Add guests column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'rsvps' AND column_name = 'guests') THEN
        ALTER TABLE rsvps ADD COLUMN guests INTEGER DEFAULT 1;
    END IF;
END $$;
