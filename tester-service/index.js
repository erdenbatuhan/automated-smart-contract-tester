const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const appProps = require("./application-properties.json");
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

// Listen on the port specified
app.listen(appProps["port"], () => {
  console.log(`Server is running on port ${appProps["port"]}`);
});

// Routes: Health Check
const healthCheckRoutes = require("./src/routes/health-check-routes");
app.use("/", healthCheckRoutes);

// Routes: Project
const projectRoutes = require("./src/routes/project-routes");
app.use("/project", projectRoutes);
