import {ObjectId, Schema, model, Model} from 'mongoose';
import {hash, compare} from 'bcrypt';

interface EmailVerificationSchemaDocument {
  owner: ObjectId;
  token: string;
  createdAt: Date;
}

interface Methods {
  compareToken(token: string): Promise<boolean>;
}

const emailVerificationSchema = new Schema<
  EmailVerificationSchemaDocument,
  {},
  Methods
>({
  owner: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    expires: 3600,
    default: Date.now(),
  },
});

emailVerificationSchema.pre('save', async function (next) {
  //hash password
  if (this.isModified('token')) {
    this.token = await hash(this.token, 10);
  }

  next();
});

emailVerificationSchema.methods.compareToken = async function (token) {
  const result = await compare(token, this.token);
  return result;
};

export default model(
  'EmailVerificationToken',
  emailVerificationSchema,
) as Model<EmailVerificationSchemaDocument, {}, Methods>;
