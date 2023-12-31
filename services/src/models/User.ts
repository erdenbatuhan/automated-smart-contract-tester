import mongoose from 'mongoose';
import type { CallbackWithoutResultAndOptionalError } from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcrypt';
import { HttpStatusCode } from 'axios';

import AppError from '@errors/AppError';

import UserRole from '@models/enums/UserRole';

export interface IUser extends mongoose.Document {
  _id: mongoose.Schema.Types.ObjectId;
  email: string;
  password: string;
  role: UserRole;

  toLean(this: IUser): object;
}

interface UserModel extends mongoose.Model<IUser> {
  register(email: string, password: string, type?: UserRole): Promise<IUser>;
  login(email: string, password: string): Promise<IUser>;
}

const UserSchema = new mongoose.Schema<IUser, UserModel>(
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
      select: false, // Not returned with "find" unless specifically stated
      required: [true, 'Password is required.'],
      minlength: [8, 'Password should be at least 8 characters long.']
    },
    role: { type: String, enum: UserRole, required: true, default: UserRole.USER }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

UserSchema.pre<IUser>('save',
  /**
   * Pre-save middleware to hash the user's password before saving.
   *
   * @param {CallbackWithoutResultAndOptionalError} next - Callback function to continue the save operation.
   * @returns {Promise<void>} A promise that resolves once the password is hashed.
   */
  async function preSave(this: IUser, next: CallbackWithoutResultAndOptionalError): Promise<void> {
    this.password = await bcrypt.genSalt().then((salt) => bcrypt.hash(this.password, salt)); // Hash the password
    next();
  }
);

/**
 * Converts the user document to a plain JavaScript object (POJO)
 * while including virtuals, removing version keys, and depopulating populated fields.
 *
 * @returns {object} A plain JavaScript object representing the document.
 */
UserSchema.methods.toLean = function toLean(this: IUser): object {
  // Depopulate, remove version keys, and use projection (removes password as its select property is false)
  return this.toObject({ depopulate: true, versionKey: false, useProjection: true });
};

UserSchema.static('register',
  /**
   * Registers a new user with the provided email, password, and optional user role.
   *
   * @static
   * @param {string} email - The email of the new user.
   * @param {string} password - The password for the new user.
   * @param {UserRole} [type] - The optional user role.
   * @returns {Promise<IUser>} A promise that resolves to the newly created user.
   * @throws {AppError} Throws an error if a user with the same email already exists.
   */
  async function register(email: string, password: string, type?: UserRole): Promise<IUser> {
    // Check if a user with the same email already exists
    const userExists = await this.exists({ email }).exec();
    if (userExists) throw new AppError(HttpStatusCode.Conflict, `A user with the email '${email}' already exists.`);

    // Create a new user (The password is hashed with mongoose pre-save hooks)
    return this.create({ email, password, type });
  }
);

UserSchema.static('login',
  /**
   * Logs in a user with the provided email and password.
   *
   * @static
   * @param {string} email - The email of the user to log in.
   * @param {string} password - The password for the user.
   * @returns {Promise<IUser>} A promise that resolves to the authenticated user.
   * @throws {AppError} Throws an error if no user is found with the provided email or if the credentials are invalid.
   */
  async function login(email: string, password: string): Promise<IUser> {
    // Find the user by email
    const user = await this.findOne({ email }).select('+password').exec();
    if (!user) throw AppError.createAppError(new AppError(HttpStatusCode.NotFound, `No user with the email '${email}' found.`));

    // Check credentials
    const credentialsApproved = await bcrypt.compare(password, user.password);
    if (!credentialsApproved) throw AppError.createAppError(new AppError(HttpStatusCode.Unauthorized, 'Invalid credentials!'));

    return user;
  }
);

// User
export default mongoose.model<IUser, UserModel>('User', UserSchema);
