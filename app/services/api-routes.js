const express = require('express');

const router = express.Router();

const healthCheckRoutes = require('./src/routes/health-check-routes');

router.use('/', healthCheckRoutes);

module.exports = router;
