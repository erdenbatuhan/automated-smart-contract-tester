const mongoose = require("mongoose");

const Execution = require("../models/execution");

const fsUtils = require("../utils/fs-utils");
const HTTPError = require("../errors/http-error");

const runExecution = async (projectName, zipBuffer) => {

};

const getExecutionFilesInZipBuffer = async (executionId) => {
  const execution = await Execution.findById(new mongoose.Types.ObjectId(executionId)).select("contents");
  if (!execution) {
    throw new HTTPError(404, `Execution with ID=${executionId} not found!`);
  }

  return fsUtils.writeStringifiedContentsToZipBuffer(`Execution ${executionId}`, execution.contents);
};

module.exports = { getExecutionFilesInZipBuffer };
