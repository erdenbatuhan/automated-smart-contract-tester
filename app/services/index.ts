import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';

import Logger from '@logging/logger';

import healthCheckMiddlewares from '@middlewares/health-check-middlewares';
import projectMiddlewares from '@middlewares/project-middlewares';

import apiRoutes from './api-routes';

// Read environment variables
const { APP_NAME, SERVICE_NAME, PORT, MONGODB_URI } = process.env;
if (!APP_NAME || !SERVICE_NAME || !PORT || !MONGODB_URI) throw new Error('Missing environment variables!');

// Initialize the Express app with middleware configurations
const app = express();
app.use(cors()); // Enable Cross-Origin Resource Sharing (CORS)
app.use(helmet()); // Enhance security using Helmet middleware
app.use(bodyParser.json({ limit: '50mb' })); // Parse JSON requests and set body size limit
app.use(cookieParser()); // Enable cookie parsing
app.get('/', healthCheckMiddlewares.performHealthCheck); // Endpoint to perform a health check on the service to see if it's healthy
app.use(`/api/${APP_NAME}/${SERVICE_NAME}/v1`, apiRoutes); // Mount modular routes with the common prefix

// (1) Establish a connection to MongoDB
mongoose.connect(MONGODB_URI).then(() => {
  // (2) Prepare the test runner service by uploading all projects to it
  projectMiddlewares.prepareTestRunnerService().then(() => {
    // (3) Start the application server on the specified port
    app.listen(PORT, () => {
      Logger.info(`The service '${APP_NAME}/${SERVICE_NAME}' is running on port ${PORT}!`);
    });
  }).catch((err: Error | unknown) => {
    Logger.error(`Could not prepare the test runner service: ${(err as Error)?.message}`);
    throw err;
  });
}).catch((err: Error | unknown) => {
  Logger.error(`Could not connect to the DB: ${(err as Error)?.message}`);
  throw err;
});
