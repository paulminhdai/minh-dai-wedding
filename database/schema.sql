-- Wedding Database Schema for Supabase
-- Enhanced database structure for wedding RSVP system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS event_attendance CASCADE;
DROP TABLE IF EXISTS rsvp_guests CASCADE;
DROP TABLE IF EXISTS admin_logs CASCADE;
DROP TABLE IF EXISTS rsvps CASCADE;
DROP TABLE IF EXISTS guests CASCADE;
DROP TABLE IF EXISTS wedding_events CASCADE;

-- Create enum types
CREATE TYPE rsvp_status AS ENUM ('attending', 'not_attending', 'maybe');
CREATE TYPE age_group AS ENUM ('adult', 'child', 'infant');
CREATE TYPE admin_action AS ENUM ('view_rsvps', 'delete_rsvp', 'add_guest', 'export_data', 'update_guest', 'send_reminder');

-- Guests table - stores invited guests and their contact info
CREATE TABLE guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    is_invited BOOLEAN DEFAULT true,
    guest_code VARCHAR(50) UNIQUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wedding events table - ceremony, reception, etc.
CREATE TABLE wedding_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    venue_name VARCHAR(255),
    venue_address TEXT,
    max_capacity INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RSVPs table - main RSVP responses
CREATE TABLE rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    status rsvp_status NOT NULL DEFAULT 'maybe',
    party_size INTEGER DEFAULT 1 CHECK (party_size > 0 AND party_size <= 10),
    dietary_restrictions TEXT,
    special_requests TEXT,
    message TEXT,
    ip_address INET,
    rsvp_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RSVP guests table - individual party members
CREATE TABLE rsvp_guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rsvp_id UUID REFERENCES rsvps(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    age_group age_group DEFAULT 'adult',
    meal_preference VARCHAR(100),
    dietary_restrictions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event attendance table - track attendance for specific events
CREATE TABLE event_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rsvp_id UUID REFERENCES rsvps(id) ON DELETE CASCADE,
    event_id UUID REFERENCES wedding_events(id) ON DELETE CASCADE,
    attending BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(rsvp_id, event_id)
);

-- Admin logs table - track admin actions
CREATE TABLE admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action admin_action NOT NULL,
    details TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_guests_name ON guests(name);
CREATE INDEX idx_guests_email ON guests(email);
CREATE INDEX idx_guests_phone ON guests(phone);
CREATE INDEX idx_guests_guest_code ON guests(guest_code);
CREATE INDEX idx_rsvps_guest_id ON rsvps(guest_id);
CREATE INDEX idx_rsvps_status ON rsvps(status);
CREATE INDEX idx_rsvps_rsvp_date ON rsvps(rsvp_date);
CREATE INDEX idx_rsvp_guests_rsvp_id ON rsvp_guests(rsvp_id);
CREATE INDEX idx_event_attendance_rsvp_id ON event_attendance(rsvp_id);
CREATE INDEX idx_event_attendance_event_id ON event_attendance(event_id);
CREATE INDEX idx_admin_logs_action ON admin_logs(action);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rsvps_updated_at BEFORE UPDATE ON rsvps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default wedding events
INSERT INTO wedding_events (name, description, start_time, venue_name, venue_address) VALUES
('Tea Ceremony', 'Traditional Vietnamese tea ceremony', '2026-06-26 09:00:00-07:00', 'Private Residence', 'Orange County, CA'),
('Wedding Ceremony', 'Catholic wedding mass', '2026-06-26 14:30:00-07:00', 'Korean Martys Catholic Center', 'Orange County, CA'),
('Cocktail Hour', 'Pre-reception cocktails and appetizers', '2026-06-26 18:00:00-07:00', 'White Place 2', 'Orange County, CA'),
('Reception', 'Wedding reception dinner and dancing', '2026-06-26 19:00:00-07:00', 'White Place 2', 'Orange County, CA');

-- Create Row Level Security (RLS) policies
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for wedding events
CREATE POLICY "Wedding events are publicly viewable" ON wedding_events
    FOR SELECT USING (is_active = true);

-- RSVP policies - anyone can create, only guests can view their own
CREATE POLICY "Anyone can create RSVPs" ON rsvps
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can create guests during RSVP" ON guests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can create RSVP guests" ON rsvp_guests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can create event attendance" ON event_attendance
    FOR INSERT WITH CHECK (true);

-- Admin access policies (you'll need to set up authentication)
-- For now, we'll use service role access for admin functions

-- Create views for easier querying
CREATE VIEW rsvp_summary AS
SELECT 
    r.id,
    g.name as guest_name,
    g.email,
    g.phone,
    r.status,
    r.party_size,
    r.dietary_restrictions,
    r.special_requests,
    r.message,
    r.rsvp_date,
    COALESCE(
        json_agg(
            json_build_object(
                'name', rg.name,
                'age_group', rg.age_group,
                'meal_preference', rg.meal_preference,
                'dietary_restrictions', rg.dietary_restrictions
            )
        ) FILTER (WHERE rg.id IS NOT NULL), 
        '[]'::json
    ) as party_members
FROM rsvps r
JOIN guests g ON r.guest_id = g.id
LEFT JOIN rsvp_guests rg ON r.id = rg.rsvp_id
GROUP BY r.id, g.name, g.email, g.phone, r.status, r.party_size, r.dietary_restrictions, r.special_requests, r.message, r.rsvp_date
ORDER BY r.rsvp_date DESC;

-- Create view for event attendance summary
CREATE VIEW event_attendance_summary AS
SELECT 
    we.name as event_name,
    we.start_time,
    we.venue_name,
    COUNT(ea.id) as total_attending,
    SUM(r.party_size) as total_guests
FROM wedding_events we
LEFT JOIN event_attendance ea ON we.id = ea.event_id AND ea.attending = true
LEFT JOIN rsvps r ON ea.rsvp_id = r.id
WHERE we.is_active = true
GROUP BY we.id, we.name, we.start_time, we.venue_name
ORDER BY we.start_time;

-- Create functions for common operations
CREATE OR REPLACE FUNCTION get_rsvp_stats()
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'total_rsvps', COUNT(*),
        'attending', COUNT(*) FILTER (WHERE status = 'attending'),
        'not_attending', COUNT(*) FILTER (WHERE status = 'not_attending'),
        'maybe', COUNT(*) FILTER (WHERE status = 'maybe'),
        'total_guests', COALESCE(SUM(party_size) FILTER (WHERE status = 'attending'), 0),
        'last_rsvp', MAX(rsvp_date)
    ) INTO result
    FROM rsvps;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if guest name exists (fuzzy matching)
CREATE OR REPLACE FUNCTION check_guest_exists(guest_name text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM guests 
        WHERE similarity(lower(name), lower(guest_name)) > 0.6
        OR lower(name) LIKE '%' || lower(guest_name) || '%'
        OR lower(guest_name) LIKE '%' || lower(name) || '%'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable similarity extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Comments for documentation
COMMENT ON TABLE guests IS 'Stores invited wedding guests and their contact information';
COMMENT ON TABLE rsvps IS 'Main RSVP responses from guests';
COMMENT ON TABLE rsvp_guests IS 'Individual party members for each RSVP';
COMMENT ON TABLE wedding_events IS 'Wedding events (ceremony, reception, etc.)';
COMMENT ON TABLE event_attendance IS 'Tracks which events each RSVP party will attend';
COMMENT ON TABLE admin_logs IS 'Logs all administrative actions for auditing';

COMMENT ON VIEW rsvp_summary IS 'Complete RSVP information with party members';
COMMENT ON VIEW event_attendance_summary IS 'Event attendance statistics';

-- Grant permissions for API access
-- Note: In production, you'll want more restrictive permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON wedding_events TO anon, authenticated;
GRANT INSERT ON guests, rsvps, rsvp_guests, event_attendance TO anon, authenticated;
GRANT SELECT ON rsvp_summary TO authenticated;
GRANT SELECT ON event_attendance_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_rsvp_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION check_guest_exists(text) TO authenticated;
