/**
 * Leaderboard Routes
 */

const express = require('express');
const leaderboardController = require('../controllers/leaderboard.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', leaderboardController.getLeaderboard);

router.get('/rank', authenticate, leaderboardController.getUserRank);

module.exports = router;