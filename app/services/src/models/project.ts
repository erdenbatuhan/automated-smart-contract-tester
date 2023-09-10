import mongoose, { Document, Schema } from 'mongoose';

import type { IUpload } from '@models/upload';

// TestExecutionArgumentsSchema
import TestExecutionArgumentsSchema from '@models/schemas/test-execution-arguments';
import type { ITestExecutionArguments } from '@/models/schemas/test-execution-arguments';

// TestSchema
import TestSchema from '@models/schemas/test';
import type { ITest } from '@models/schemas/test';

export interface IProject extends Document {
  _id: Schema.Types.ObjectId;
  projectName: string;
  upload: IUpload;
  testExecutionArguments?: ITestExecutionArguments;
  tests: ITest[];
}

const ProjectSchema = new Schema<IProject>(
  {
    projectName: { type: String, unique: true },
    upload: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', required: true },
    testExecutionArguments: { type: TestExecutionArgumentsSchema },
    tests: { type: [TestSchema], required: true }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

// Project
export default mongoose.model<IProject>('Project', ProjectSchema);
