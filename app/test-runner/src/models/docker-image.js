const mongoose = require('mongoose');

const DockerImageSchema = new mongoose.Schema(
  {
    imageID: { type: String, required: true, unique: true },
    imageName: { type: String, required: true, unique: true },
    imageBuildTimeSeconds: { type: Number },
    imageSizeMB: { type: Number, required: true }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

const DockerImage = mongoose.model('DockerImage', DockerImageSchema);

module.exports = DockerImage;
