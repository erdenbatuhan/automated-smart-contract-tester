import mongoose from 'mongoose';

import Constants from '~constants';

import TestSchema from '@models/schemas/test';
import type { ITest } from '@models/schemas/test';

import TestExecutionArgumentsSchema from '@models/schemas/test-execution-arguments';
import type { ITestExecutionArguments } from '@models/schemas/test-execution-arguments';

export interface IProjectConfig {
  tests: ITest[];
  containerTimeout?: number;
  testExecutionArguments?: ITestExecutionArguments;
}

// ProjectConfigSchema
export default new mongoose.Schema<IProjectConfig>(
  {
    tests: { type: [TestSchema], required: true },
    containerTimeout: { type: Number, default: Constants.CONTAINER_TIMEOUT_DEFAULT },
    testExecutionArguments: { type: TestExecutionArgumentsSchema }
  },
  {
    _id: false
  }
);
