import mongoose from 'mongoose';

export interface ITest {
  contract: string;
  test: string;
  weight: number;
}

// TestSchema
export default new mongoose.Schema<ITest>(
  {
    contract: { type: String, required: true },
    test: { type: String, required: true },
    weight: { type: Number, required: true }
  },
  {
    _id: false
  }
);
