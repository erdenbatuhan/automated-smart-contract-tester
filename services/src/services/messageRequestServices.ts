import type { Schema } from 'mongoose';
import { HttpStatusCode } from 'axios';

import AppError from '@errors/AppError';

import type { IUser } from '@models/User';
import MessageRequest from '@models/MessageRequest';
import type { IMessageRequest } from '@models/MessageRequest';
import type ContainerExecutionResponse from '@rabbitmq/test-runner/dto/responses/ContainerExecutionResponse';

/**
 * Find all message requests associated with a user or all message requests.
 *
 * This function retrieves all message requests that match the given user's deployer field or returns all message requests if no user is provided.
 *
 * @param {IUser} [user] - The optional user for whom to find message requests. If omitted, all message requests are returned.
 * @returns {Promise<IMessageRequest[]>} A Promise that resolves to an array of message requests.
 * @throws {AppError} Throws an AppError if an error occurs during the database query.
 */
const findAllMessageRequests = async (
  user?: IUser
): Promise<IMessageRequest[]> => {
  const findFunction = user ? MessageRequest.find({ deployer: user }) : MessageRequest.find();
  return findFunction.exec()
    .catch((err: Error | unknown) => {
      throw AppError.createAppError(err, 'An error occurred while finding all message requests.');
    });
};

/**
 * Finds a message request by its ID.
 *
 * @param {Types.ObjectId | string} messageRequestId - The ID of the message request to find.
 * @returns {Promise<IMessageRequest>} A promise that resolves to the found message request.
 * @throws {AppError} If the message request with the specified ID is not found (HTTP 404).
 */
const findMessageRequest = (
  messageRequestId: Schema.Types.ObjectId | string
): Promise<IMessageRequest> => MessageRequest.findById(messageRequestId).exec()
  .then((messageRequest) => {
    if (!messageRequest) throw new AppError(HttpStatusCode.NotFound, `Message request with ID=${messageRequestId} not found.`);
    return messageRequest;
  });

/**
 * Checks if a message request with the specified ID belongs to the given user.
 *
 * @param {IUser} user - The user to check against.
 * @param {string} messageRequestId - The ID of the message request to check.
 * @returns {Promise<boolean>} A promise that resolves to true if the message request belongs to the given user, otherwise false.
 * @throws {AppError} If an error occurs during the check or if the message request is not found (HTTP 404).
 */
const doesMessageRequestBelongToGivenUser = (
  user: IUser, messageRequestId: string
): Promise<boolean> => MessageRequest.existsByIdAndDeployer(messageRequestId, user)
  .catch((err: Error | unknown) => {
    throw AppError.createAppError(err, `An error occurred while checking if the message request with the ID '${messageRequestId}' belongs to the user with email '${user.email}'.`);
  });

/**
 * Saves a message request.
 *
 * @param {IMessageRequest} messageRequest - The message request to save.
 * @returns {Promise<IMessageRequest>} A promise that resolves to the saved message request.
 */
const saveMessageRequest = (messageRequest: IMessageRequest): Promise<IMessageRequest> => messageRequest.save();

/**
 * Updates a message request with the provided update data.
 *
 * @param {IMessageRequest} messageRequest - The message request to update.
 * @param {Schema.Types.ObjectId} associatedDocumentId - The ID of the associated document.
 * @param {string} associatedDocumentType - The type of the associated document.
 * @param {{ isError: boolean; data: ContainerExecutionResponse | AppError }} [response] - Optional response data.
 * @param {number} [positionInTheQueue=0] - The position of the message in the queue (Optional).
 * @returns {Promise<IMessageRequest>} A promise that resolves to the updated message request.
 */
const updateMessageRequest = (
  messageRequest: IMessageRequest,
  associatedDocumentId: Schema.Types.ObjectId,
  associatedDocumentType: string,
  response?: { isError: boolean; data: ContainerExecutionResponse | AppError | object },
  positionInTheQueue?: number
): Promise<IMessageRequest> => findMessageRequest(messageRequest._id).then((messageRequestFound) => {
  messageRequestFound.completed = true;
  messageRequestFound.messageInfo = {
    associatedDocumentId,
    associatedDocumentType,
    startingPositionInQueue: positionInTheQueue || 0,
    isError: response?.isError,
    output: response?.data
  };

  return saveMessageRequest(messageRequestFound);
});

export default {
  findAllMessageRequests,
  findMessageRequest,
  doesMessageRequestBelongToGivenUser,
  saveMessageRequest,
  updateMessageRequest
};
