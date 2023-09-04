const express = require('express');

const router = express.Router();

const executorEnvironmentConfig = require('../../data/forge/executor-environment-config.json');

/**
 * Returns the possible options for configuring the execution environment that can be used with the "forge test" command.
 *
 * @returns {Object} 200 - The executor environment configuration options.
 * @returns {Object} 500 - Internal server error, indicating a failure to retrieve the options.
 */
router.get('/test/options/executor-environment-config', async (req, res) => {
  res.status(200).json(executorEnvironmentConfig);
});

module.exports = router;
