import mongoose, { Document, Schema } from 'mongoose';

// FileSchema
import FileSchema from '@models/schemas/file';
import type { IFile } from '@models/schemas/file';

export interface IUpload extends Document {
  _id: Schema.Types.ObjectId;
  files: IFile[];
}

const UploadSchema = new Schema<IUpload>(
  {
    files: { type: [FileSchema], required: true }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

// Upload
export default mongoose.model<IUpload>('Upload', UploadSchema);
