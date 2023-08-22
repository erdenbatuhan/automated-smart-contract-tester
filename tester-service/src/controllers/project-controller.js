const Project = require("../models/project");

const fsUtils = require("../utils/fs-utils");
const dockerUtils = require("../utils/docker-utils");

const createNewProject = async (projectName, zipBuffer) => {
  // Read project from zip buffer and create docker image
  await fsUtils.readProjectFromZipBuffer(projectName, zipBuffer);
  const imageId = await dockerUtils.createDockerImage(projectName);

  // Run docker container to get the tests
  const tests = [];
  const averageTestWeight = 1.0 / tests.length;

  // Save the project to DB (or update it if it exists), and then return it
  return await Project.findOneAndUpdate(
    { projectName },
    {
      dockerImageID: imageId,
      deployer: null,
      tests: tests.map(testName => ({ testName, weight: averageTestWeight }))
    },
    { upsert: true, new: true }
  );
};

module.exports = { createNewProject };
