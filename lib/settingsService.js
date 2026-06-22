// Site-wide settings service. Reads from / writes to the singleton row in
// the wedding_settings table. Falls back to env vars if the DB row is
// missing (e.g. before the migration is run).
//
// Includes a tiny in-process cache so we don't hammer Supabase on every
// page load. Cache invalidates on update OR after a short TTL.

const { supabaseAdmin } = require('../database/supabase-config');

const CACHE_TTL_MS = 2 * 1000;
let cached = null;
let cacheExpiry = 0;

const ENV_FALLBACK_REVEAL_AT = process.env.GALLERY_REVEAL_AT || '2026-06-27T00:00:00-07:00';

const DEFAULTS = {
    camera_popup_enabled: true,
    camera_popup_title: '📷 Be our photographer',
    camera_popup_body: "Help us capture every angle of our day! Each guest gets a 24-shot disposable camera roll. Snap candid moments throughout the wedding — every photo will be revealed in a shared gallery the day after.",
    camera_popup_cta: 'Pick up your camera',
    gallery_reveal_at: ENV_FALLBACK_REVEAL_AT,
    game_results: {},
    game_questions: [
        {id: "first_tear", label: "Who will cry first?", options: [
            {value: "bride", label: "Đại (Bride)"},
            {value: "groom", label: "Minh (Groom)"},
            {value: "both", label: "Both at once"},
            {value: "neither", label: "Neither"}
        ]},
        {id: "speech_length", label: "Longest speech length?", options: [
            {value: "under_5", label: "Under 5 mins"},
            {value: "5_to_10", label: "5 - 10 mins"},
            {value: "over_10", label: "Over 10 mins"},
            {value: "no_speeches", label: "No speeches!"}
        ]},
        {id: "dance_dip", label: "Will there be a \"dip\" during the first dance?", options: [
            {value: "yes", label: "Yes, definitely"},
            {value: "no", label: "No way"}
        ]}
    ]
};

function fromRow(row) {
    return {
        camera_popup_enabled: row.camera_popup_enabled,
        camera_popup_title: row.camera_popup_title,
        camera_popup_body: row.camera_popup_body,
        camera_popup_cta: row.camera_popup_cta,
        // Always serialise as ISO so the client can parse predictably.
        gallery_reveal_at: new Date(row.gallery_reveal_at).toISOString(),
        game_results: row.game_results || {},
        game_questions: row.game_questions || DEFAULTS.game_questions,
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null
    };
}

async function fetchFromDb() {
    try {
        const { data, error } = await supabaseAdmin
            .from('wedding_settings')
            .select('*')
            .eq('id', 1)
            .maybeSingle();

        if (error) throw error;
        if (!data) return { ...DEFAULTS, updated_at: null };
        return fromRow(data);
    } catch (e) {
        // If the table doesn't exist yet (migration not run), fall back to
        // env defaults so the site keeps working. Logged once per cache cycle.
        console.warn('settingsService: falling back to defaults -', e.message);
        return { ...DEFAULTS, updated_at: null };
    }
}

async function getSettings() {
    if (cached && Date.now() < cacheExpiry) return cached;
    cached = await fetchFromDb();
    cacheExpiry = Date.now() + CACHE_TTL_MS;
    return cached;
}

function invalidate() {
    cached = null;
    cacheExpiry = 0;
}

/**
 * Apply a partial update. Whitelisted fields only.
 * Returns the fresh settings.
 */
async function updateSettings(patch) {
    const allowed = {};
    if (typeof patch.camera_popup_enabled === 'boolean') allowed.camera_popup_enabled = patch.camera_popup_enabled;
    if (typeof patch.camera_popup_title === 'string')    allowed.camera_popup_title = patch.camera_popup_title.trim().substring(0, 120);
    if (typeof patch.camera_popup_body === 'string')     allowed.camera_popup_body = patch.camera_popup_body.trim().substring(0, 1000);
    if (typeof patch.camera_popup_cta === 'string')      allowed.camera_popup_cta = patch.camera_popup_cta.trim().substring(0, 60);
    if (patch.gallery_reveal_at) {
        const d = new Date(patch.gallery_reveal_at);
        if (isNaN(d.getTime())) {
            throw Object.assign(new Error('Invalid gallery_reveal_at'), { code: 'INVALID_DATE' });
        }
        allowed.gallery_reveal_at = d.toISOString();
    }
    if (patch.game_results && typeof patch.game_results === 'object') {
        allowed.game_results = patch.game_results;
    }
    if (patch.game_questions && Array.isArray(patch.game_questions)) {
        allowed.game_questions = patch.game_questions;
    }

    if (Object.keys(allowed).length === 0) {
        throw Object.assign(new Error('No valid fields to update'), { code: 'NO_FIELDS' });
    }

    const { data, error } = await supabaseAdmin
        .from('wedding_settings')
        .update(allowed)
        .eq('id', 1)
        .select()
        .single();

    if (error) {
        // If the row doesn't exist yet (singleton wasn't seeded), upsert it.
        if (error.code === 'PGRST116' || /no rows/i.test(error.message)) {
            const { data: upserted, error: upErr } = await supabaseAdmin
                .from('wedding_settings')
                .upsert({ id: 1, ...DEFAULTS, ...allowed })
                .select()
                .single();
            if (upErr) throw upErr;
            invalidate();
            return fromRow(upserted);
        }
        throw error;
    }

    invalidate();
    return fromRow(data);
}

// Convenience getters
async function getRevealDate() {
    const s = await getSettings();
    return new Date(s.gallery_reveal_at);
}

async function isRevealed() {
    return Date.now() >= (await getRevealDate()).getTime();
}

module.exports = {
    DEFAULTS,
    getSettings,
    updateSettings,
    invalidate,
    getRevealDate,
    isRevealed
};
