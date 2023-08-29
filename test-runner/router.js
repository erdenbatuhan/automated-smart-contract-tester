const express = require("express");
const router = express.Router();

const healthCheckRoutes = require("./src/routes/health-check-routes");
const forgeRoutes = require("./src/routes/forge-routes");
const projectRoutes = require("./src/routes/project-routes");

router.use("/", healthCheckRoutes);
router.use("/forge", forgeRoutes);
router.use("/project", projectRoutes);

module.exports = router;
