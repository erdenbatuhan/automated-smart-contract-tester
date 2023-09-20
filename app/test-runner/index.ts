import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';

import Logger from '@Logger';
import AppError from '@errors/AppError';

import apiRouter from '@rest';
import rabbitmq from '@rabbitmq';

// Read environment variables
const { APP_NAME, SERVICE_NAME, PORT, MONGODB_URI } = process.env;
if (!APP_NAME || !SERVICE_NAME || !PORT || !MONGODB_URI) throw new Error('Missing environment variables!');

// Initialize the Express app with middleware configurations
const app = express();
app.use(cors()); // Enable Cross-Origin Resource Sharing (CORS)
app.use(helmet()); // Enhance security using Helmet middleware
app.use(bodyParser.json({ limit: '50mb' })); // Parse JSON requests and set body size limit
app.use(`/api/${APP_NAME}/${SERVICE_NAME}/v1`, apiRouter); // Mount modular routes with the common prefix

Promise.all([
  // (1) Establish a connection to MongoDB
  mongoose.connect(MONGODB_URI).catch((err: Error | unknown) => {
    throw AppError.createAppError(err, 'Could not connect to the DB.');
  }),
  // (2) Initialize the RabbitMQ message consumers
  rabbitmq.initializeMessageConsumers()
]).then(() => {
  // (3) Start the application server on the specified port
  app.listen(PORT, () => {
    Logger.info(`The service '${APP_NAME}/${SERVICE_NAME}' is running on port ${PORT}!`);
  });
});
