const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const Logger = require('./src/logging/logger');

// Read environment variables
const { PORT, MONGO_DB_URI } = process.env;
if (!PORT || !MONGO_DB_URI) throw new Error('Missing environment variables!');

// Connect to MongoDB
mongoose
  .connect(MONGO_DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => Logger.info('Connected to the DB!'))
  .catch((err) => Logger.error(err ? err.message : 'An error occurred while connecting to the DB!'));

// Start the express app
const app = express();

// The express app settings
app.use(cors()); // CORS
app.use(bodyParser.json({ limit: '50mb' })); // Parses the text as JSON and exposes the resulting object on req.body

// Use the modular routes with the common prefix
app.use('/test-runner/api/v1', require('./api-routes'));

// Listen on the port specified
app.listen(PORT, () => {
  Logger.info(`Server is running on port ${PORT}`);
});
