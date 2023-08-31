const mongoose = require('mongoose');

const Project = require('./project');
const StatusEnum = require('./enums/status-enum');
const ContentSchema = require('./schemas/content-schema');

const ExecutionSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: Project.name, required: true },
    status: {
      type: String, enum: StatusEnum, required: true, default: StatusEnum.FAILURE
    },
    dockerContainerName: { type: String },
    contents: { type: [ContentSchema] },
    results: { type: Object }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

const Execution = mongoose.model('Execution', ExecutionSchema);

module.exports = Execution;
