import {RequestWithFiles} from '@/middleware/fileUpload';
import {categoriesTypes} from '@/utils/audio_category';
import {RequestHandler} from 'express';
import formidable from 'formidable';
import cloudinary from '@/cloud';
import Audio from '@/models/audioModel';
import {PopulateFavList} from '@/types/audio';
import {PipelineStage} from 'mongoose';
import {getUsersPreviousHistory} from '@/utils/helper';

interface CreateAudioRequest extends RequestWithFiles {
  body: {
    title: string;
    about: string;
    category: categoriesTypes;
  };
}

export const createAudio: RequestHandler = async (
  req: CreateAudioRequest,
  res,
) => {
  const {title, about, category} = req.body;
  const poster = req.files?.poster as formidable.File;
  const audioFile = req.files?.file as formidable.File;
  const ownerId = req.user.id;

  if (!audioFile) return res.status(422).json({error: 'Audio file is missing'});

  try {
    //uploading to cloudinary
    const audioRes = await cloudinary.uploader.upload(audioFile.filepath, {
      resource_type: 'video',
    });

    const newAudio = new Audio({
      title,
      about,
      category,
      owner: ownerId,
      file: {
        url: audioRes.secure_url,
        publicId: audioRes.public_id,
      },
    });

    if (poster) {
      const posterRes = await cloudinary.uploader.upload(poster.filepath, {
        width: 300,
        height: 300,
        crop: 'thumb',
        gravity: 'face',
      });

      newAudio.poster = {
        url: posterRes.secure_url,
        publicId: posterRes.public_id,
      };
    }

    await newAudio.save();

    res.status(201).json({
      audio: {
        title,
        about,
        file: newAudio.file.url,
        poster: newAudio.poster?.url,
      },
    });
  } catch (error) {
    res.json(error);
  }
};

export const updateAudio: RequestHandler = async (
  req: CreateAudioRequest,
  res,
) => {
  const {title, about, category} = req.body;
  const poster = req.files?.poster as formidable.File;
  const ownerId = req.user.id;
  const {audioId} = req.params;

  const audio = await Audio.findOneAndUpdate(
    {owner: ownerId, _id: audioId},
    {
      title,
      about,
      category,
    },
    {
      new: true,
    },
  );

  if (!audio) return res.status(404).json({error: 'Record not found'});

  if (poster) {
    if (audio.poster?.publicId) {
      await cloudinary.uploader.destroy(audio.poster?.publicId);
    }
    const posterRes = await cloudinary.uploader.upload(poster.filepath, {
      width: 300,
      height: 300,
      crop: 'thumb',
      gravity: 'face',
    });
    audio.poster = {url: posterRes.secure_url, publicId: posterRes.public_id};

    await audio.save();
  }

  res.status(201).json({
    audio: {
      title,
      about,
      file: audio.file.url,
      poster: audio.poster?.url,
    },
  });
};

export const getLastestUploads: RequestHandler = async (req, res) => {
  const list = await Audio.find()
    .sort('-createdAt')
    .limit(10)
    .populate<PopulateFavList>('owner');

  const latestAudio = list.map(item => {
    return {
      id: item._id,
      title: item.title,
      about: item.about,
      category: item.category,
      file: item.file.url,
      poster: item.poster?.url,
      owner: {name: item.owner.name, id: item.owner._id},
    };
  });

  res.status(201).json({latestAudio});
};

export const getRecommended: RequestHandler = async (req, res) => {
  const user = req.user;

  let matchOptions: PipelineStage.Match = {
    $match: {_id: {$exists: true}},
  };

  if (user) {
    // then we want to send by the profile

    // fetch users previous history
    const category = await getUsersPreviousHistory(req);

    if (category.length) {
      matchOptions = {$match: {category: {$in: category}}};
    }
  }

  // otherwise we will send generic audios
  const audios = await Audio.aggregate([
    matchOptions,
    {
      $sort: {
        'likes.count': -1,
      },
    },
    {$limit: 10},
    {
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'owner',
      },
    },
    {$unwind: '$owner'},
    {
      $project: {
        _id: 0,
        id: '$_id',
        title: '$title',
        category: '$category',
        about: '$about',
        file: '$file.url',
        poster: '$poster.url',
        owner: {name: '$owner.name', id: '$owner._id'},
      },
    },
  ]);

  res.json({audios});
};
