import { HttpStatusCode } from 'axios';

import AppError from '@errors/AppError';

import ReplyMessage from '@rabbitmq/dto/outgoing-messages/ReplyMessage';

export default class FailedReplyMessage extends ReplyMessage {
  constructor(err: AppError | Error | unknown) {
    super(
      (err as AppError)?.statusCode || HttpStatusCode.InternalServerError,
      { error: err }
    );
  }
}
