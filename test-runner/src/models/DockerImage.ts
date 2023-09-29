import mongoose from 'mongoose';

export interface IDockerImage extends mongoose.Document {
  _id: mongoose.Schema.Types.ObjectId;
  imageID: string;
  imageName: string;
  imageBuildTimeSeconds: number;
  imageSizeMB: number;
}

const DockerImageSchema = new mongoose.Schema<IDockerImage>(
  {
    imageID: { type: String, unique: true, required: true },
    imageName: { type: String, maxlength: 20, unique: true, required: true },
    imageBuildTimeSeconds: { type: Number, required: true },
    imageSizeMB: { type: Number, required: true }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

export default mongoose.model<IDockerImage>('DockerImage', DockerImageSchema);
