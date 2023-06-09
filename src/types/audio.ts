import {AudioDocument} from '@/models/audioModel';
import {Request} from 'express';
import {ObjectId} from 'mongoose';

export type PopulateFavList = AudioDocument<{
  _id: ObjectId;
  name: string;
  url?: string;
  avatar: any;
}>;

export interface CreatePlaylistRequest extends Request {
  body: {
    title: string;
    audioId: string;
    visibility: 'public' | 'private';
  };
}
export interface UpdatePlayListRequest extends Request {
  body: {
    title: string;
    item: string;
    visibility: 'public' | 'private';
    id: string;
  };
}
