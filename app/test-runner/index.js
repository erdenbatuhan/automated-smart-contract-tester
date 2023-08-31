const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const appProps = require('./application-properties.json');
const apiRoutes = require('./api-routes');

const Logger = require('./src/logging/logger');

const app = express();

// Connect to MongoDB
mongoose
  .connect(appProps.mongo.dbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => Logger.info('Connected to the DB!'))
  .catch((err) => Logger.error(err ? err.message : 'An error occurred while connecting to the DB!'));

app.use(cors()); // CORS
app.use(bodyParser.json({ limit: '50mb' })); // Parses the text as JSON and exposes the resulting object on req.body

// Use the modular routes with the common prefix
app.use('/test-runner/api/v1', apiRoutes);

// Listen on the port specified
app.listen(appProps.port, () => {
  Logger.info(`Server is running on port ${appProps.port}`);
});
