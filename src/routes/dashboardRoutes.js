const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/admin/dashboard', requireAuth, requireAdmin, dashboardController.renderDashboardPage);

module.exports = router;
