const Project = require("../models/project");

const constantUtils = require("../utils/constant-utils");
const fsUtils = require("../utils/fs-utils");
const dockerUtils = require("../utils/docker-utils");
const testOutputUtils = require("../utils/test-output-utils");
const HTTPError = require("../errors/http-error");

const createNewProject = async (projectName, zipBuffer, executorEnvironmentConfig) => {
  // Read the project from the zip buffer
  const [tempProjectDirPath, projectContents] = await fsUtils.readFromZipBuffer(projectName, zipBuffer);

  // Create a docker image from the project read from zip buffer
  const dockerImageID = await dockerUtils.createDockerImage(projectName, tempProjectDirPath).finally(async () => {
    await fsUtils.removeDirectory(tempProjectDirPath); // Remove the temp directory after creating the image
  });

  // Run the Docker container to retrieve the names of the tests from the gas snapshot file and assign an average weight to each test
  const [_, gasSnapshot] = await dockerUtils.runDockerContainer(
    projectName, tempProjectDirPath, ["cat", constantUtils.PROJECT_FILES.GAS_SNAPSHOT]);
  const tests = testOutputUtils.getTestNamesFromGasSnapshot(gasSnapshot);

  // Save the project in the DB (or update it if it already exists)
  return await Project.findOneAndUpdate(
    { projectName },
    { dockerImageID, executorEnvironmentConfig, tests, contents: projectContents },
    { upsert: true, new: true }
  );
};

const getProjectFilesInZipBuffer = async (projectName) => {
  const project = await Project.findOne({ projectName }).select("contents");
  if (!project) {
    throw new HTTPError(404, `Project with name=${projectName} not found!`);
  }

  return fsUtils.writeStringifiedContentsToZipBuffer(projectName, project.contents);
};

module.exports = { createNewProject, getProjectFilesInZipBuffer };
