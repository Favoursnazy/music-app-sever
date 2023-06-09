import {Model, ObjectId, Schema, model, models} from 'mongoose';

interface PlayListDocument {
  title: string;
  owner: ObjectId;
  items: ObjectId[];
  visibility: 'public' | 'private' | 'auto';
}

const playListSchema = new Schema<PlayListDocument>(
  {
    title: {
      type: String,
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    items: [
      {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Audio',
      },
    ],
    visibility: {
      type: String,
      enum: ['public', 'private', 'auto'],
      default: 'public',
    },
  },
  {
    timestamps: true,
  },
);

const PlayList = models.PlayList || model('PlayList', playListSchema);

export default PlayList as Model<PlayListDocument>;
