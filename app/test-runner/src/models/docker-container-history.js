const mongoose = require('mongoose');

const DockerImage = require('./docker-image');
const Status = require('./enums/status');

const DockerContainerHistorySchema = new mongoose.Schema(
  {
    dockerImage: { type: mongoose.Schema.Types.ObjectId, ref: DockerImage.name, required: true },
    containerName: { type: String },
    commandExecuted: { type: String, required: true },
    status: { type: String, enum: Status, required: true, default: Status.ERROR },
    statusCode: { type: Number },
    containerExecutionTimeSeconds: { type: Number },
    output: { type: Object }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

const DockerContainerHistory = mongoose.model('DockerContainerHistory', DockerContainerHistorySchema);

module.exports = DockerContainerHistory;
