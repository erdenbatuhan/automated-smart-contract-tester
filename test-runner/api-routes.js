const express = require("express");
const router = express.Router();

const routerUtils = require("./src/utils/router-utils");

const healthCheckRoutes = require("./src/routes/health-check-routes");
const forgeRoutes = require("./src/routes/forge-routes");
const projectRoutes = require("./src/routes/project-routes");
const executionRoutes = require("./src/routes/execution-routes");

router.use("/", healthCheckRoutes);
router.use("/forge", forgeRoutes);
router.use("/project", projectRoutes);
router.use("/project/:projectName/execution", (req, _, next) => {
  req.locals = { ...routerUtils.extractRequiredParams(req, ["projectName"]) };
  next();
}, executionRoutes);

module.exports = router;
