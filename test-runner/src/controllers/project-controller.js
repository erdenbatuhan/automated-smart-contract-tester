const Project = require("../models/project");

const constantUtils = require("../utils/constant-utils");
const fsUtils = require("../utils/fs-utils");
const dockerUtils = require("../utils/docker-utils");
const testOutputUtils = require("../utils/test-output-utils");
const HTTPError = require("../errors/http-error");

const createNewProject = async (projectName, zipBuffer, executorEnvironmentConfig) => {
  // Read the project from the zip buffer
  const [tempProjectDirPath, projectContents] = await fsUtils.readFromZipBuffer(
    `${projectName}_creation`, zipBuffer,
    { requiredFiles: constantUtils.UPLOAD_REQUIREMENT_FILES, requiredFolders: constantUtils.UPLOAD_REQUIREMENT_FOLDERS },
    [constantUtils.PATH_PROJECT_TEMPLATE]
  );

  // Create a docker image from the project read from zip buffer
  const dockerImage = await dockerUtils.createDockerImage(projectName, tempProjectDirPath).finally(async () => {
    await fsUtils.removeDirectory(tempProjectDirPath); // Remove the temp directory after creating the image
  });

  // Run the Docker container to retrieve the names of the tests from the gas snapshot file
  const [dockerContainerName, gasSnapshot, elapsedTimeMs] = await dockerUtils.runDockerContainer(
    projectName, ["cat", constantUtils.PROJECT_FILES.GAS_SNAPSHOT]);
  const tests = testOutputUtils.extractTestNamesFromGasSnapshot(gasSnapshot);

  // Save the project in the DB (or update it if it already exists)
  return await Project.findOneAndUpdate(
    { projectName },
    { dockerImage, executorEnvironmentConfig, tests, contents: projectContents },
    { upsert: true, new: true }
  );
};

const findProjectByName = async (projectName, arg=null) => {
  const findOnePromise = !arg ? Project.findOne({ projectName }) : Project.findOne({ projectName }).select(arg.join(" "));

  return findOnePromise.then(project => {
    if (!project) throw new HTTPError(404, `Project with name=${projectName} not found!`);
    return project;
  });
};

const getProjectFilesInZipBuffer = async (projectName) => {
  const project = await findProjectByName(projectName, ["contents"]);
  return fsUtils.writeStringifiedContentsToZipBuffer(projectName, project.contents);
};

module.exports = { createNewProject, findProjectByName, getProjectFilesInZipBuffer };
