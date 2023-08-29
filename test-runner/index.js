const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const appProps = require("./application-properties.json");
const apiRoutes = require("./api-routes.js");

const app = express();

// Connect to MongoDB
mongoose
  .connect(appProps["mongo"]["dbURI"], {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to DB!"))
  .catch((err) => console.log(err));

app.use(cors()); // CORS
app.use(bodyParser.json({ limit: "50mb" })); // Parses the text as JSON and exposes the resulting object on req.body

// Use the modular routes with the common prefix
app.use("/test-runner/api/v1", apiRoutes);

// Listen on the port specified
app.listen(appProps["port"], () => {
  console.log(`Server is running on port ${appProps["port"]}`);
});
