const mongoose = require("mongoose");

const TestSchema = require("./schemas/test-schema");
const ContentSchema = require("./schemas/content-schema");

const ProjectSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true, unique: true },
    dockerImageID: { type: String, required: true },
    executorEnvironmentConfig: { type: Object },
    tests: { type: [TestSchema], required: true },
    contents: { type: [ContentSchema], required: true }
  }, 
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

const Project = mongoose.model("Project", ProjectSchema);

module.exports = Project;
