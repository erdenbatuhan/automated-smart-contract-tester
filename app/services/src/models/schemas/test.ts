import { Schema } from 'mongoose';

export interface ITest {
  test: string;
  weight: number;
}

// TestSchema
export default new Schema<ITest>(
  {
    test: { type: String, required: true },
    weight: { type: Number, required: true }
  },
  {
    _id: false // Prevent Mongoose from adding an _id field to embedded documents
  }
);
