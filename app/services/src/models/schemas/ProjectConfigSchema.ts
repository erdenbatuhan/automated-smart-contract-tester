import mongoose from 'mongoose';

import Constants from '~Constants';

import TestSchema from '@models/schemas/TestSchema';
import type { ITest } from '@models/schemas/TestSchema';

import TestExecutionArgumentsSchema from '@models/schemas/TestExecutionArgumentsSchema';
import type { ITestExecutionArguments } from '@models/schemas/TestExecutionArgumentsSchema';

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
