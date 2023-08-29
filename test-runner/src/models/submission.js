const mongoose = require("mongoose");

const ContentSchema = require("./schemas/content-schema");

const SubmissionSchema = new mongoose.Schema(
  {
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
