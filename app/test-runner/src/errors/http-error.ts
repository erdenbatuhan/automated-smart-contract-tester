import { STATUS_CODES } from 'http';

class HTTPError extends Error {
  statusCode: number;

  constructor(code: number, message?: string) {
    super(message || STATUS_CODES[code]);
    this.statusCode = code;
  }
}

export default HTTPError;
