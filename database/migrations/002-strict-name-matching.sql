-- Migration: Implement stricter name matching to prevent ambiguous matches
-- Date: 2024-01-09
-- Issue: Single names like "Khoa" matching multiple guests

-- Drop the old function
DROP FUNCTION IF EXISTS check_guest_exists(text);

-- Create improved function with stricter matching rules
CREATE OR REPLACE FUNCTION check_guest_exists(guest_name text)
RETURNS boolean AS $$
DECLARE
    name_words text[];
    match_count integer;
BEGIN
    -- Split the input name into words
    name_words := string_to_array(lower(trim(guest_name)), ' ');
    
    -- If it's a single short name (less than 6 characters), require exact match
    IF array_length(name_words, 1) = 1 AND length(name_words[1]) < 6 THEN
        RETURN EXISTS (
            SELECT 1 FROM guests 
            WHERE lower(name) = lower(guest_name)
        );
    END IF;
    
    -- For longer names or multiple words, use similarity matching
    -- But require higher similarity threshold
    RETURN EXISTS (
        SELECT 1 FROM guests 
        WHERE similarity(lower(name), lower(guest_name)) > 0.7  -- Increased from 0.6
        OR (
            -- Only allow partial matches if the input is at least 8 characters
            length(guest_name) >= 8 
            AND (
                lower(name) LIKE '%' || lower(guest_name) || '%'
                OR lower(guest_name) LIKE '%' || lower(name) || '%'
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a new function to find potential matches for validation
CREATE OR REPLACE FUNCTION find_guest_matches(guest_name text)
RETURNS TABLE(name text, similarity_score float) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.name,
        similarity(lower(g.name), lower(guest_name)) as similarity_score
    FROM guests g
    WHERE 
        lower(g.name) LIKE '%' || lower(guest_name) || '%'
        OR lower(guest_name) LIKE '%' || lower(g.name) || '%'
        OR similarity(lower(g.name), lower(guest_name)) > 0.3
    ORDER BY similarity_score DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION find_guest_matches(text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION check_guest_exists(text) IS 'Checks if a guest exists with stricter matching for short names';
COMMENT ON FUNCTION find_guest_matches(text) IS 'Finds potential guest matches for validation and suggestions';
