import mongoose from 'mongoose';
import type { CallbackWithoutResultAndOptionalError } from 'mongoose';

import Constants from '@Constants';

import TestSchema from '@models/schemas/TestSchema';
import type { ITest } from '@models/schemas/TestSchema';

import TestExecutionArgumentsSchema from '@models/schemas/TestExecutionArgumentsSchema';
import type { ITestExecutionArguments } from '@models/schemas/TestExecutionArgumentsSchema';

export interface IProjectConfig {
  tests?: ITest[];
  containerTimeout?: number;
  testExecutionArguments?: ITestExecutionArguments;
}

const ProjectConfigSchema = new mongoose.Schema<IProjectConfig>(
  {
    tests: { type: [TestSchema] },
    containerTimeout: { type: Number, default: Constants.CONTAINER_TIMEOUT_DEFAULT },
    testExecutionArguments: { type: TestExecutionArgumentsSchema }
  },
  {
    _id: false
  }
);

ProjectConfigSchema.pre<IProjectConfig>('save',
  /**
   * Middleware function to execute before saving a Project Configuration document.
   *
   * @param {CallbackWithoutResultAndOptionalError} next - The callback function to invoke after pre-processing.
   * @returns {Promise<void>} A Promise that resolves when the pre-processing is complete.
   */
  async function preSave(this: IProjectConfig, next: CallbackWithoutResultAndOptionalError): Promise<void> {
    this.tests = this.tests || [];
    this.containerTimeout = this.containerTimeout || Constants.CONTAINER_TIMEOUT_DEFAULT;
    this.testExecutionArguments = this.testExecutionArguments || {};

    next();
  }
);

export default ProjectConfigSchema;
