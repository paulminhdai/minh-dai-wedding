// Bets service: handles guest predictions for the "Place Your Bets" game.
// Stores submissions in the wedding_bets table.

const { supabaseAdmin } = require('../database/supabase-config');

/**
 * Save a guest's bet. Enforces one bet per device.
 */
async function placeBet({ deviceId, guestName, predictions }) {
    if (!deviceId) throw new Error('MISSING_DEVICE_ID');
    if (!guestName || guestName.trim().length < 1) throw new Error('MISSING_NAME');
    if (!predictions || typeof predictions !== 'object') throw new Error('INVALID_PREDICTIONS');

    const { data, error } = await supabaseAdmin
        .from('wedding_bets')
        .upsert([{
            device_id: deviceId,
            guest_name: guestName.trim().substring(0, 100),
            predictions: predictions
        }], { onConflict: 'device_id' })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') { // Unique constraint violation
            throw new Error('ALREADY_BET');
        }
        throw error;
    }

    return data;
}

/**
 * Get a guest's existing bet by device_id.
 */
async function getBetByDevice(deviceId) {
    if (!deviceId) return null;

    const { data, error } = await supabaseAdmin
        .from('wedding_bets')
        .select('*')
        .eq('device_id', deviceId)
        .maybeSingle();

    if (error) throw error;
    return data;
}

/**
 * List all bets for the admin dashboard.
 */
async function adminListBets() {
    const { data, error } = await supabaseAdmin
        .from('wedding_bets')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Delete a bet (admin only).
 */
async function deleteBet(betId) {
    const { data, error } = await supabaseAdmin
        .from('wedding_bets')
        .delete()
        .eq('id', betId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

module.exports = {
    placeBet,
    getBetByDevice,
    adminListBets,
    deleteBet
};
