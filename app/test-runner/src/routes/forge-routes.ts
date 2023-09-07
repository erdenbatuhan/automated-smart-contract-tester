import express from 'express';
import type { Request, Response } from 'express';

import executorEnvironmentConfig from '~data/forge/executor-environment-config.json';

const router = express.Router();

/**
 * Returns the possible options for configuring the execution environment that can be used with the "forge test" command.
 *
 * @returns {object} 200 - The executor environment configuration options.
 * @returns {object} 500 - Internal server error, indicating a failure to retrieve the options.
 */
router.get('/test/options/executor-environment-config', async (req: Request, res: Response) => {
  res.status(200).json(executorEnvironmentConfig);
});

export default router;
