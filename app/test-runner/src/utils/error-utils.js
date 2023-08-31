const Logger = require('../logging/logger');

const throwErrorWithoutDetails = (abstractErrorMessage, fullError) => {
  Logger.error(`${abstractErrorMessage} (${fullError ? fullError.message : 'null'})`);
  fullError.message = abstractErrorMessage;

  throw fullError;
};

module.exports = { throwErrorWithoutDetails };
