import mongoose, { Document, Schema } from 'mongoose';

import type { IUser } from '@models/user';

// FileSchema
import FileSchema from '@models/schemas/file';
import type { IFile } from '@models/schemas/file';

export interface IUpload extends Document {
  _id: Schema.Types.ObjectId;
  deployer: IUser;
  files: IFile[];
}

const UploadSchema = new Schema<IUpload>(
  {
    deployer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, select: false },
    files: { type: [FileSchema], required: true }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

// Upload
export default mongoose.model<IUpload>('Upload', UploadSchema);
