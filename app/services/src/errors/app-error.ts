import { STATUS_CODES } from 'http';

export default class AppError extends Error {
  statusCode: number;
  status: string | undefined;
  message: string;
  reason: string;

  constructor(code: number, message: string, reason?: string) {
    super(message || STATUS_CODES[code]);

    this.statusCode = code;
    this.status = STATUS_CODES[code];
    this.message = message;
    this.reason = reason || message;
  }

  toJSON() {
    return {
      statusCode: this.statusCode,
      status: this.status,
      message: this.message,
      reason: this.reason
    };
  }
}
