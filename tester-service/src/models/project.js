const mongoose = require("mongoose");

const TestSchema = new mongoose.Schema({
  testName: { type: String, required: true },
  weight: { type: Number, required: true }
});

const ProjectSchema = new mongoose.Schema({
  projectName: { type: String, required: true, unique: true },
  dockerImageID: { type: String, required: true },
  deployer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  tests: [TestSchema],
});

const Project = mongoose.model("Project", ProjectSchema);

module.exports = Project;
