import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';

import Logger from '@logging/logger';

import apiRoutes from './api-routes';

// Read environment variables
const {
  SERVICES_APP_NAME: APP_NAME,
  SERVICES_PORT: PORT,
  SERVICES_MONGO_DB_URI: MONGO_DB_URI
} = process.env;
if (!APP_NAME || !PORT || !MONGO_DB_URI) throw new Error('Missing environment variables!');

// Initialize the Express app with middleware configurations
const app = express();
app.use(cors()); // Enable Cross-Origin Resource Sharing (CORS)
app.use(helmet()); // Enhance security using Helmet middleware
app.use(bodyParser.json({ limit: '50mb' })); // Parse JSON requests and set body size limit
app.use(`/app/${APP_NAME}/api/v1`, apiRoutes); // Mount modular routes with the common prefix

// Establish a connection to MongoDB and start the application server on the specified port
mongoose.connect(MONGO_DB_URI)
  .then(() => { app.listen(PORT, () => { Logger.info(`${APP_NAME} is running on port ${PORT}!`); }); })
  .catch((err: Error | unknown) => { Logger.error((err as Error)?.message || 'Could not connect to the DB!'); });
