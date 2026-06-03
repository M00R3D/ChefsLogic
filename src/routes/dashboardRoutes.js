const express = require('express');
const dashboardController     = require('../controllers/dashboardController');
const userDashboardController = require('../controllers/userDashboardController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/admin/dashboard', requireAuth, requireAdmin, dashboardController.renderDashboardPage);
router.get('/mi-dashboard',    requireAuth, userDashboardController.renderUserDashboard);

module.exports = router;
