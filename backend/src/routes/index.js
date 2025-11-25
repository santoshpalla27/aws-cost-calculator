/**
 * API Routes Index
 * Aggregates all route modules
 */

const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const quizRoutes = require('./quiz.routes');
const scenarioRoutes = require('./scenario.routes');
const puzzleRoutes = require('./puzzle.routes');
const leaderboardRoutes = require('./leaderboard.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/quizzes', quizRoutes);
router.use('/scenarios', scenarioRoutes);
router.use('/puzzles', puzzleRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/admin', adminRoutes);

module.exports = router;