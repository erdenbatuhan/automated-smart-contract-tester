import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';

import Logger from '@logging/logger';

import apiRoutes from './api-routes';

// Read environment variables
const {
  TESTNUMMER_APP_NAME: APP_NAME,
  TESTRUNNER_PORT: PORT,
  TESTRUNNER_MONGO_DB_URI: MONGO_DB_URI
} = process.env;
if (!APP_NAME || !PORT || !MONGO_DB_URI) throw new Error('Missing environment variables!');

// Connect to MongoDB
mongoose
  .connect(MONGO_DB_URI)
  .then(() => Logger.info('Connected to the DB!'))
  .catch((err: Error) => Logger.error(err ? err.message : 'An error occurred while connecting to the DB!'));

// Start the express app
const app = express();

// The express app settings
app.use(cors()); // CORS
app.use(helmet()); // Initializes helmet to mitigate common web vulnerabilities
app.use(bodyParser.json({ limit: '50mb' })); // Parses the text as JSON and exposes the resulting object on req.body

// Use the modular routes with the common prefix
app.use(`/automated-smart-contract-tester/${APP_NAME}/api/v1`, apiRoutes);

// Listen on the port specified
app.listen(PORT, () => {
  Logger.info(`Server is running on port ${PORT}`);
});
