const mongoose = require("mongoose");

const TestSchema = new mongoose.Schema(
  {
    fullTestName: { type: String, required: true },
    testName: { type: String, required: true },
    weight: { type: Number, required: true }
  },
  { _id: false } // Omit the _id field
);

const ProjectSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true, unique: true },
    dockerImageID: { type: String, required: true },
    deployer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    tests: [TestSchema],
  }
);

const Project = mongoose.model("Project", ProjectSchema);

module.exports = Project;
