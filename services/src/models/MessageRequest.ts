import mongoose from 'mongoose';

import Constants from '@Constants';

import type { IUser } from '@models/User';

export interface IMessageRequest extends mongoose.Document {
  _id: mongoose.Schema.Types.ObjectId;
  deployer?: IUser;
  channel: string;
  completed: boolean;
  messageInfo: {
    associatedDocumentId?: mongoose.Schema.Types.ObjectId;
    associatedDocumentType?: string;
    startingPositionInQueue?: number;
    isError?: boolean;
    output?: object;
  };
  elapsedTime: number; // Virtual Field

  toLean(this: IMessageRequest): object;
}

interface MessageRequestModel extends mongoose.Model<IMessageRequest> {
  existsByIdAndDeployer(messageRequestId: string, deployer: IUser): Promise<boolean>;
}

const MessageRequestSchema = new mongoose.Schema<IMessageRequest, MessageRequestModel>(
  {
    deployer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    channel: { type: String, required: true },
    completed: { type: Boolean, required: true, default: false },
    messageInfo: { type: Object }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

// Set a TTL for the request (It will be deleted after X seconds if the request is still not completed)
MessageRequestSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: Constants.MESSAGE_REQUEST_DOC_TTL, partialFilterExpression: { completed: false } }
);

MessageRequestSchema.virtual<IMessageRequest>('elapsedTime', {
  get() { return this.updatedAt.getTime() - this.createdAt.getTime(); }
});

/**
 * Converts the message request to a plain JavaScript object (POJO) while including virtuals and depopulating populated fields.
 *
 * @returns {object} A plain JavaScript object representing the document.
 */
MessageRequestSchema.methods.toLean = function toLean(this: IMessageRequest): object {
  return this.toObject({ virtuals: true, depopulate: true });
};

MessageRequestSchema.static('existsByIdAndDeployer',
  /**
   * Checks if a message request with the specified ID was created by the given user.
   *
   * @param {string} messageRequestId - The ID of the message request to check.
   * @param {IUser} deployer - The user to check against.
   * @returns {Promise<boolean>} A promise that resolves to true if the message request was created by the user, otherwise false.
   */
  async function existsByIdAndDeployer(messageRequestId: string, deployer: IUser): Promise<boolean> {
    return this.findById(messageRequestId).exec()
      .then((messageRequestFound) => !!messageRequestFound && String(messageRequestFound.deployer) === String(deployer._id));
  }
);

// MessageRequest
export default mongoose.model<IMessageRequest, MessageRequestModel>('MessageRequest', MessageRequestSchema);
