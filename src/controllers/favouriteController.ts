import Audio from '@/models/audioModel';
import Favourite from '@/models/favouritesModel';
import {paginationQuery} from '@/types/misc';
import {RequestHandler} from 'express';
import {isValidObjectId} from 'mongoose';

export const toggleFavourite: RequestHandler = async (req, res) => {
  const audioId = req.query.audioId as string;
  let status = 'removed' || 'added';

  if (!isValidObjectId(audioId))
    return res.status(422).json({error: 'Invalid ObjectID'});

  const audio = await Audio.findById(audioId);
  if (!audio) res.status(404).json({error: 'Resource not found!'});

  //audio is alrady in fav
  const alreadyExist = await Favourite.findOne({
    owner: req.user.id,
    items: audioId,
  });
  if (alreadyExist) {
    // we want to remove from old lists
    await Favourite.updateOne(
      {owner: req.user.id},
      {
        $pull: {items: audioId},
      },
    );
    status = 'removed';
  } else {
    const favourite = await Favourite.findOne({owner: req.user.id});
    if (favourite) {
      // try to add a new audio to the old list
      await Favourite.updateOne(
        {owner: req.user.id},
        {
          $addToSet: {items: audioId},
        },
      );
    } else {
      // trying to create fresh fav list
      await Favourite.create({owner: req.user.id, items: [audioId]});
    }
    status = 'added';
  }

  if (status === 'added') {
    await Audio.findByIdAndUpdate(audioId, {
      $addToSet: {likes: req.user.id},
    });
  }
  if (status === 'removed') {
    await Audio.findByIdAndUpdate(audioId, {
      $pull: {likes: req.user.id},
    });
  }

  res.status(201).json({status});
};

export const getUserFavourites: RequestHandler = async (req, res) => {
  const userId = req.user.id;
  const {limit = '20', pageNo = '0'} = req.query as paginationQuery;

  const favourite = await Favourite.aggregate([
    {$match: {owner: userId}},
    {
      $project: {
        audioIds: {
          $slice: [
            '$items',
            parseInt(limit) * parseInt(pageNo),
            parseInt(limit),
          ],
        },
      },
    },
    {$unwind: '$audioIds'},
    {
      $lookup: {
        from: 'audios',
        localField: 'audioIds',
        foreignField: '_id',
        as: 'audioInfo',
      },
    },
    {$unwind: '$audioInfo'},
    {
      $lookup: {
        from: 'users',
        localField: 'audioInfo.owner',
        foreignField: '_id',
        as: 'ownerInfo',
      },
    },
    {$unwind: '$ownerInfo'},
    {
      $project: {
        _id: 0,
        id: '$audioInfo._id',
        title: '$audioInfo.title',
        about: '$audioInfo.about',
        file: '$audioInfo.file.url',
        poster: '$audioInfo.poster.url',
        category: '$audioInfo.category',
        owner: {
          name: '$ownerInfo.name',
          id: '$ownerInfo._id',
        },
      },
    },
  ]);

  res.status(201).json({audios: favourite});
};

export const getIsFavourite: RequestHandler = async (req, res) => {
  const audioId = req.query.audioId as string;

  if (!isValidObjectId(audioId))
    return res.status(422).json({error: 'Invalid object ID!'});

  const favourite = await Favourite.findOne({
    owner: req.user.id,
    items: audioId,
  });

  res.json({result: favourite ? true : false});
};
