import mongoose, { Document, Schema } from 'mongoose';

import type { IUpload } from './upload';

export interface ITest {
  test: string;
  weight: number;
}

export interface IProject extends Document {
  _id: Schema.Types.ObjectId;
  projectName: string,
  upload: IUpload,
  executorEnvironmentConfig: object,
  tests: ITest[]
}

const TestSchema = new Schema<ITest>(
  {
    test: { type: String, required: true },
    weight: { type: Number, required: true }
  },
  {
    _id: false // Prevent Mongoose from adding an _id field to embedded documents
  }
);

const ProjectSchema = new Schema<IProject>(
  {
    projectName: { type: String, required: true, unique: true },
    upload: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', required: true },
    executorEnvironmentConfig: { type: Object },
    tests: { type: [TestSchema], required: true }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

export default mongoose.model<IProject>('Project', ProjectSchema);
