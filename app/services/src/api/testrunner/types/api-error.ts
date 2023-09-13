import type AppError from '@errors/app-error';

export default interface ApiError {
  error?: AppError;
}
