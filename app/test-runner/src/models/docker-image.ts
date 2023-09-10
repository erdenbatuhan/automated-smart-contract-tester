import mongoose, { Document, Schema } from 'mongoose';

export interface IDockerImage extends Document {
  _id: Schema.Types.ObjectId;
  imageID: string;
  imageName: string;
  imageBuildTimeSeconds: number;
  imageSizeMB: number;
}

const DockerImageSchema = new Schema<IDockerImage>(
  {
    imageID: { type: String, unique: true },
    imageName: { type: String, unique: true },
    imageBuildTimeSeconds: { type: Number, required: true },
    imageSizeMB: { type: Number, required: true }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

export default mongoose.model<IDockerImage>('DockerImage', DockerImageSchema);
