const Project = require("../models/project");

const constantUtils = require("../utils/constant-utils");
const fsUtils = require("../utils/fs-utils");
const dockerUtils = require("../utils/docker-utils");
const testOutputUtils = require("../utils/test-output-utils");

const createNewProject = async (projectName, zipBuffer, executorEnvironmentConfig) => {
  // Read project from zip buffer and create Docker image
  await fsUtils.readProjectFromZipBuffer(projectName, zipBuffer);
  const imageId = await dockerUtils.createDockerImage(projectName);

  // Run the Docker container to retrieve the names of the tests and assign an average weight to each test
  const testOutput = await dockerUtils.runDockerContainer(
    projectName, constantUtils.FORGE_COMMANDS.LIST_TEST_NAMES, constantUtils.PROJECT_FOLDERS.SOLUTION);
  const testNames = testOutputUtils.extractTestNamesFromTestListOutput(testOutput);
  const averageTestWeight = 1.0 / testNames.length;

  // Save the project in the DB (or update it if it already exists)
  return await Project.findOneAndUpdate(
    { projectName },
    {
      dockerImageID: imageId,
      deployer: null,
      executorEnvironmentConfig,
      tests: testNames.map(testName => ({ ...testName, weight: averageTestWeight }))
    },
    { upsert: true, new: true }
  );
};

module.exports = { createNewProject };
