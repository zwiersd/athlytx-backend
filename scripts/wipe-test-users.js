#!/usr/bin/env node
// Wipes coach/athlete test data (users + linked data) from the current DB connection.
// Use with caution; run with --force to execute.

require('dotenv').config();
const { Op } = require('sequelize');
const {
    sequelize,
    User,
    MagicLink,
    OAuthToken,
    CoachAthlete,
    DailyMetric,
    Activity,
    TrainingSummary,
    Invite,
    DeviceShare,
    APILog,
    initializeDatabase
} = require('../backend/models');

async function wipe() {
    if (!process.argv.includes('--force')) {
        console.error('Add --force to perform deletion.');
        process.exit(1);
    }

    const ok = await initializeDatabase();
    if (!ok) {
        console.error('Database init failed; aborting.');
        process.exit(1);
    }

    const tx = await sequelize.transaction();
    try {
        const users = await User.findAll({
            attributes: ['id', 'email'],
            where: { role: { [Op.in]: ['coach', 'athlete'] } },
            transaction: tx
        });

        const userIds = users.map(u => u.id);
        const emails = users.map(u => u.email).filter(Boolean);

        if (!userIds.length) {
            console.log('No coach/athlete users found; nothing to delete.');
            await tx.commit();
            return;
        }

        const summary = {};

        summary.coachAthletes = await CoachAthlete.destroy({
            where: { [Op.or]: [{ coachId: { [Op.in]: userIds } }, { athleteId: { [Op.in]: userIds } }] },
            transaction: tx
        });

        summary.deviceShares = await DeviceShare.destroy({
            where: { [Op.or]: [{ coachId: { [Op.in]: userIds } }, { athleteId: { [Op.in]: userIds } }] },
            transaction: tx
        });

        summary.tokens = await OAuthToken.destroy({ where: { userId: { [Op.in]: userIds } }, transaction: tx });
        summary.magicLinks = await MagicLink.destroy({ where: { userId: { [Op.in]: userIds } }, transaction: tx });
        summary.activities = await Activity.destroy({ where: { userId: { [Op.in]: userIds } }, transaction: tx });
        summary.dailyMetrics = await DailyMetric.destroy({ where: { userId: { [Op.in]: userIds } }, transaction: tx });
        summary.trainingSummaries = await TrainingSummary.destroy({ where: { userId: { [Op.in]: userIds } }, transaction: tx });
        summary.invites = await Invite.destroy({
            where: { [Op.or]: [{ coachId: { [Op.in]: userIds } }, { athleteEmail: { [Op.in]: emails } }] },
            transaction: tx
        });
        summary.apiLogs = await APILog.destroy({ where: { userId: { [Op.in]: userIds } }, transaction: tx });

        summary.users = await User.destroy({ where: { id: { [Op.in]: userIds } }, transaction: tx });

        await tx.commit();
        console.log('Deleted coach/athlete data:', summary);
    } catch (err) {
        await tx.rollback();
        console.error('Wipe failed:', err);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

wipe();
