const express = require("express");
const router = express.Router();

const healthCheckRoutes = require("./src/routes/health-check-routes");
const forgeRoutes = require("./src/routes/forge-routes");
const projectRoutes = require("./src/routes/project-routes");
const submissionRoutes = require("./src/routes/submission-routes");

router.use("/", healthCheckRoutes);
router.use("/forge", forgeRoutes);
router.use("/project", projectRoutes);
router.use("/project/:projectName/submission", submissionRoutes);

module.exports = router;
