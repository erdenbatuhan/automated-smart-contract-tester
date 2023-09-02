const Logger = require('../logging/logger');

const getErrorWithoutDetails = (abstractErrorMessage, fullError) => {
  Logger.error(`${abstractErrorMessage} (${fullError ? fullError.message : 'null'})`);

  fullError.message = abstractErrorMessage;
  throw fullError;
};

module.exports = { getErrorWithoutDetails };
