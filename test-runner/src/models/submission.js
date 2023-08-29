const mongoose = require("mongoose");

const Project = require("./project");
const ContentSchema = require("./schemas/content-schema");

const SubmissionSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: Project.name, required: true },
    contents: { type: [ContentSchema], required: true },
    results: { type: Object }
  }, 
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

const Submission = mongoose.model("Submission", SubmissionSchema);

module.exports = Submission;
