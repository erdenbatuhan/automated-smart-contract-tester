const mongoose = require('mongoose');

const DockerImageSchema = require('./schemas/docker-image-schema');
const ContentSchema = require('./schemas/content-schema');

const ProjectSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true, unique: true },
    dockerImage: { type: DockerImageSchema, required: true, unique: true },
    executorEnvironmentConfig: { type: Object },
    tests: { type: [String], required: true },
    contents: { type: [ContentSchema], required: true }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

const Project = mongoose.model('Project', ProjectSchema);

module.exports = Project;
