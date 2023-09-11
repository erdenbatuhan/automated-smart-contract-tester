import mongoose, { Document, Schema } from 'mongoose';
import validator from 'validator';

import UserType from '@models/enums/user-type';

export interface IUser extends Document {
  _id: Schema.Types.ObjectId;
  email: string;
  password: string;
  type: UserType;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      unique: true,
      required: [true, 'Email is required.'],
      validate: [validator.isEmail, 'Please provide a valid email address.'],
      lowercase: true
    },
    password: {
      type: String,
      required: [true, 'Password is required.'],
      minlength: [8, 'Password should be at least 8 characters long.']
    },
    type: { type: String, enum: UserType, required: true, default: UserType.USER }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

// User
export default mongoose.model<IUser>('User', UserSchema);
