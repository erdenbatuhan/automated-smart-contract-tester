const Project = require("../models/project");

const constantUtils = require("../utils/constant-utils");
const fsUtils = require("../utils/fs-utils");
const dockerUtils = require("../utils/docker-utils");
const testOutputUtils = require("../utils/test-output-utils");

const createNewProject = async (projectName, zipBuffer, executorEnvironmentConfig) => {
  // Read project from zip buffer and create Docker image
  await fsUtils.readProjectFromZipBuffer(projectName, zipBuffer);
  const imageId = await dockerUtils.createDockerImage(projectName);

  // Run the Docker container to retrieve the names of the tests from the gas snapshot file and assign an average weight to each test
  const gasSnapshot = await dockerUtils.runDockerContainer(projectName, ["cat", constantUtils.PROJECT_FILES.GAS_SNAPSHOT]);
  const tests = testOutputUtils.getTestNamesFromGasSnapshot(gasSnapshot);
  const averageTestWeight = 1.0 / tests.length;

  // Save the project in the DB (or update it if it already exists)
  return await Project.findOneAndUpdate(
    { projectName },
    {
      dockerImageID: imageId,
      deployer: null,
      executorEnvironmentConfig,
      tests: tests.map(test => ({ test, weight: averageTestWeight }))
    },
    { upsert: true, new: true }
  );
};

module.exports = { createNewProject };
