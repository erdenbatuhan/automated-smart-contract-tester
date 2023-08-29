const mongoose = require("mongoose");

const Project = require("./project");
const ContentSchema = require("./schemas/content-schema");

const ExecutionSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: Project.name, required: true },
    dockerContainerName: { type: String, required: true },
    contents: { type: [ContentSchema], required: true },
    results: { type: Object }
  }, 
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

const Execution = mongoose.model("Execution", ExecutionSchema);

module.exports = Execution;
