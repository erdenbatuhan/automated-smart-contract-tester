const Project = require("../models/project");

const Logger = require("../logging/logger");
const HTTPError = require("../errors/http-error");

const constantUtils = require("../utils/constant-utils");
const errorUtils = require("../utils/error-utils");
const fsUtils = require("../utils/fs-utils");
const dockerUtils = require("../utils/docker-utils");
const testOutputUtils = require("../utils/test-output-utils");

const createNewProject = async (projectName, zipBuffer, executorEnvironmentConfig) => {
  try {
    Logger.info(`Creating the project ${projectName}..`);

    // Read the project from the zip buffer
    const [tempProjectDirPath, projectContents] = await fsUtils.readFromZipBuffer(
      `${projectName}_creation`, zipBuffer,
      { requiredFiles: constantUtils.UPLOAD_REQUIREMENT_FILES, requiredFolders: constantUtils.UPLOAD_REQUIREMENT_FOLDERS },
      [constantUtils.PATH_PROJECT_TEMPLATE]
    );

    // Create a docker image from the project read from zip buffer
    const dockerImage = await dockerUtils.createDockerImage(projectName, tempProjectDirPath).finally(() => {
      fsUtils.removeDirectorySync(tempProjectDirPath); // Remove the temp directory after creating the image
    });

    // Run the Docker container to retrieve the names of the tests from the gas snapshot file
    const [_, gasSnapshot] = await dockerUtils.runDockerContainer(projectName, ["cat", constantUtils.PROJECT_FILES.GAS_SNAPSHOT]);
    const tests = testOutputUtils.extractTestNamesFromGasSnapshot(gasSnapshot);

    // Save (or update it if it already exists) the project
    let project = await upsertProject(projectName, executorEnvironmentConfig, projectContents, dockerImage, tests);

    Logger.info(`Created the project ${projectName}! (ID=${project._id})`);
    return project;
  } catch (err) {
    errorUtils.throwErrorWithoutDetails(`An error occurred while creating the project ${projectName}!`, err);
  }
};

const upsertProject = async (projectName, executorEnvironmentConfig, contents, dockerImage, tests) => {
  let project = await Project.findOneAndUpdate(
    { projectName },
    { executorEnvironmentConfig, contents, tests },
    { upsert: true, new: true }
  );

  // Update the Docker image information only when the ID is changed
  if (!project.dockerImage || project.dockerImage.dockerImageID !== dockerImage.dockerImageID) {
    project.dockerImage = dockerImage;
    project = await project.save();
  }

  return project;
} 

const findProjectByName = async (projectName, arg=null) => {
  let project;
  try {
    project = !arg
      ? await Project.findOne({ projectName })
      : await Project.findOne({ projectName }).select(arg.join(" "));
  } catch (err) {
    errorUtils.throwErrorWithoutDetails(`An error occurred while finding the project with the name=${projectName}!`, err);
  }

  if (!project) throw new HTTPError(404, `Project with name=${projectName} not found!`);
  return project;
};

const getProjectFilesInZipBuffer = async (projectName) => {
  const project = await findProjectByName(projectName, ["contents"]);
  return fsUtils.writeStringifiedContentsToZipBuffer(projectName, project.contents);
};

module.exports = { createNewProject, findProjectByName, getProjectFilesInZipBuffer };
