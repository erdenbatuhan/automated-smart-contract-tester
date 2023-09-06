import mongoose, { Document, Schema } from 'mongoose';

export interface IFile {
  path: string;
  content: string;
}

export interface IUpload extends Document {
  _id: Schema.Types.ObjectId;
  files: IFile[];
}

const FileSchema = new Schema<IFile>(
  {
    path: { type: String, required: true },
    content: { type: String, required: true }
  },
  {
    _id: false // Prevent Mongoose from adding an _id field to embedded documents
  }
);

const UploadSchema = new Schema<IUpload>(
  {
    files: { type: [FileSchema], required: true }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

export default mongoose.model<IUpload>('Upload', UploadSchema);
