-- Migration: Add dynamic game questions to settings
-- Date: 2026-06-21
-- Purpose: Store customizable questions and options for the prediction game.

ALTER TABLE wedding_settings 
ADD COLUMN IF NOT EXISTS game_questions JSONB DEFAULT '[
    {"id": "first_tear", "label": "Who will cry first?", "options": [
        {"value": "bride", "label": "Đại (Bride)"},
        {"value": "groom", "label": "Minh (Groom)"},
        {"value": "both", "label": "Both at once"},
        {"value": "neither", "label": "Neither"}
    ]},
    {"id": "speech_length", "label": "Longest speech length?", "options": [
        {"value": "under_5", "label": "Under 5 mins"},
        {"value": "5_to_10", "label": "5 - 10 mins"},
        {"value": "over_10", "label": "Over 10 mins"},
        {"value": "no_speeches", "label": "No speeches!"}
    ]},
    {"id": "dance_dip", "label": "Will there be a \"dip\" during the first dance?", "options": [
        {"value": "yes", "label": "Yes, definitely"},
        {"value": "no", "label": "No way"}
    ]}
]'::jsonb;

COMMENT ON COLUMN wedding_settings.game_questions IS 'Customizable questions and options for the prediction game.';
