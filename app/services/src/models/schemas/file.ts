import { Schema } from 'mongoose';

export interface IFile {
  path: string;
  content: string;
}

// FileSchema
export default new Schema<IFile>(
  {
    path: { type: String, required: true },
    content: { type: String, required: true }
  },
  {
    _id: false // Prevent Mongoose from adding an _id field to embedded documents
  }
);
