import { STATUS_CODES } from 'http';

class HTTPError extends Error {
  statusCode: number;
  status: string | undefined;
  data?: object;

  constructor(code: number, message?: string, data?: object) {
    super(message || STATUS_CODES[code]);

    this.statusCode = code;
    this.status = STATUS_CODES[code];
    this.data = data;
  }
}

export default HTTPError;
