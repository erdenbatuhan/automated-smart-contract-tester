const { STATUS_CODES } = require('http');

class HTTPError extends Error {
  constructor(code, message) {
    super(message || STATUS_CODES[code]);
    this.statusCode = code;
  }
}

module.exports = HTTPError;
