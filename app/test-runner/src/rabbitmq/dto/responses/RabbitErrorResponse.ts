import { HttpStatusCode } from 'axios';

import AppError from '@errors/AppError';

import RabbitResponse from '@rabbitmq/dto/responses/RabbitResponse';

export default class RabbitErrorResponse extends RabbitResponse {
  constructor(err: AppError | Error | unknown) {
    super(
      (err as AppError)?.statusCode || HttpStatusCode.InternalServerError,
      { error: err }
    );
  }
}
