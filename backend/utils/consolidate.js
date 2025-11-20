const { OAuthToken, Activity, DailyMetric, User } = require('../models');

/**
 * Consolidate ownership of Garmin tokens and data for a canonical user.
 * - Prefers non-guest (registered) user as canonical when conflicts exist
 * - Keeps newest token by connectedAt
 * - Reassigns Activities and DailyMetrics to canonical user
 */
async function consolidateUserOwnership(targetUserId) {
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) return { success: false, reason: 'target_user_not_found' };

    const result = { success: true, groupsProcessed: 0, tokensMoved: 0, activitiesMoved: 0, dailiesMoved: 0 };

    // Collect Garmin GUIDs for tokens already on the target user
    const myGarminTokens = await OAuthToken.findAll({
        where: { userId: targetUserId, provider: 'garmin' }
    });

    if (myGarminTokens.length === 0) return { ...result, note: 'no_garmin_tokens_for_user' };

    for (const myToken of myGarminTokens) {
        if (!myToken.providerUserId) continue;
        const guid = myToken.providerUserId;
        const group = await OAuthToken.findAll({
            where: { provider: 'garmin', providerUserId: guid },
            include: [{ model: User }]
        });

        if (group.length <= 1) continue;
        result.groupsProcessed += 1;

        // Pick canonical owner
        const registered = group.find(t => t.User && t.User.isGuest === false);
        const canonicalUserId = targetUser.isGuest ? (registered ? registered.userId : targetUserId) : targetUserId;

        // Identify newest token for GUID (by connectedAt)
        const newest = [...group].sort((a, b) => new Date(b.connectedAt) - new Date(a.connectedAt))[0];

        // Move data and drop duplicate tokens under other users
        for (const t of group) {
            if (t.userId === canonicalUserId) continue;
            const acts = await Activity.update(
                { userId: canonicalUserId },
                { where: { userId: t.userId, provider: 'garmin' } }
            );
            const dailies = await DailyMetric.update(
                { userId: canonicalUserId },
                { where: { userId: t.userId } }
            );
            result.activitiesMoved += acts[0];
            result.dailiesMoved += dailies[0];
            await t.destroy();
            result.tokensMoved += 1;
        }

        // Ensure newest token is owned by canonical
        if (newest.userId !== canonicalUserId) {
            await OAuthToken.upsert({
                id: newest.id,
                userId: canonicalUserId,
                provider: 'garmin',
                providerUserId: guid,
                accessTokenEncrypted: newest.accessTokenEncrypted,
                refreshTokenEncrypted: newest.refreshTokenEncrypted,
                expiresAt: newest.expiresAt,
                scopes: newest.scopes,
                connectedAt: newest.connectedAt
            });
        }
    }

    return result;
}

module.exports = { consolidateUserOwnership };

