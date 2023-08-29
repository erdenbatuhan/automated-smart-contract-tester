const mongoose = require("mongoose");

const DockerImageSchema = new mongoose.Schema(
  {
    dockerImageName: { type: String, required: true, unique: true },
    dockerImageID: { type: String, required: true, unique: true },
    dockerImageBuildTimeMs: { type: Number },
    dockerImageSizeMB: { type: Number, required: true }
  },
  {
    _id: false // Prevent Mongoose from adding an _id field to embedded documents
  }
);

module.exports = DockerImageSchema;
