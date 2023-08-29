const mongoose = require("mongoose");

const Submission = require("../models/submission");

const fsUtils = require("../utils/fs-utils");
const HTTPError = require("../errors/http-error");

const runSubmission = async (projectName, zipBuffer) => {

};

const getSubmissionFilesInZipBuffer = async (submissionId) => {
  const submission = await Submission.findById(new mongoose.Types.ObjectId(submissionId)).select("contents");
  if (!submission) {
    throw new HTTPError(404, `Submission with ID=${submissionId} not found!`);
  }

  return fsUtils.writeStringifiedContentsToZipBuffer(`Submission ${submissionId}`, submission.contents);
};

module.exports = { getSubmissionFilesInZipBuffer };
