const mongoose = require("mongoose");

const TestSchema = new mongoose.Schema(
  {
    test: { type: String, required: true },
    weight: { type: Number, required: true }
  },
  { _id: false } // Omit the _id field
);

const ProjectSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true, unique: true },
    dockerImageID: { type: String, required: true },
    deployer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    executorEnvironmentConfig: { type: Object },
    tests: [TestSchema],
  }
);

const Project = mongoose.model("Project", ProjectSchema);

module.exports = Project;