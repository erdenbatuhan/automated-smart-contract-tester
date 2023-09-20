import { Router } from 'express';
import type { Request, Response } from 'express';
import { HttpStatusCode } from 'axios';

import ForgeTestExecutionArgument from '@forge/types/enums/ForgeTestExecutionArgument';

const router = Router();

/**
 * Returns the possible options for configuring the execution environment that can be used with the "forge test" command.
 *
 * @returns {object} 200 - The executor environment configuration options.
 * @returns {object} 500 - Internal server error, indicating a failure to retrieve the options.
 */
router.get('/test/options/execution-arguments', async (req: Request, res: Response) => {
  res.status(HttpStatusCode.Ok).json(Object.values(ForgeTestExecutionArgument));
});

export default router;
