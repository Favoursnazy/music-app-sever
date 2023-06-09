import Audio from '@/models/audioModel';
import PlayList from '@/models/playListModel';
import {
  CreatePlaylistRequest,
  PopulateFavList,
  UpdatePlayListRequest,
} from '@/types/audio';
import {paginationQuery} from '@/types/misc';
import {RequestHandler} from 'express';
import {isValidObjectId} from 'mongoose';

export const createPlayList: RequestHandler = async (
  req: CreatePlaylistRequest,
  res,
) => {
  const {title, audioId, visibility} = req.body;
  const ownerId = req.user.id;

  if (audioId) {
    const audio = await Audio.findById(audioId);

    if (!audio)
      return res.status(404).json({error: 'Could not find the audio'});
  }

  const newPlaylist = new PlayList({
    title,
    owner: ownerId,
    visibility,
  });

  if (audioId) newPlaylist.items = [audioId as any];
  await newPlaylist.save();

  res.status(201).json({
    playlist: {
      id: newPlaylist._id,
      title: newPlaylist.title,
      visibility: newPlaylist.visibility,
    },
  });
};

export const updatePlaylist: RequestHandler = async (
  req: UpdatePlayListRequest,
  res,
) => {
  const {id, item, title, visibility} = req.body;
  const playlist = await PlayList.findOneAndUpdate(
    {_id: id, owner: req.user.id},
    {
      title,
      visibility,
    },
    {new: true},
  );
  if (!playlist) return res.status(433).json({error: 'Playlist not found'});

  if (item) {
    const audio = await Audio.findById(item);
    if (!audio) return res.status(401).json({error: 'Audio not found'});
    await PlayList.findByIdAndUpdate(playlist._id, {
      $addToSet: {items: item},
    });
  }

  res.status(201).json({
    playlist: {
      id: playlist._id,
      title: playlist.title,
      visibility: playlist.visibility,
    },
  });
};

export const deletePlaylist: RequestHandler = async (req, res) => {
  const {playlistId, audioId, all} = req.query;

  //checking if a valid object id
  if (!isValidObjectId(playlistId))
    return res.status(422).json('Invalid Playlist id!');

  if (all === 'yes') {
    const playlist = await PlayList.findOneAndDelete({
      _id: playlistId,
      owner: req.user.id,
    });
    if (!playlist) return res.status(404).json({error: 'Playlist not found'});
  }

  if (audioId) {
    if (!isValidObjectId(audioId))
      return res.status(422).json('Invalid Audio Id');

    const playlist = await PlayList.findOneAndUpdate(
      {
        _id: playlistId,
        owner: req.user.id,
      },
      {
        $pull: {items: audioId},
      },
    );

    if (!playlist) return res.status(404).json({error: 'Audio not found!'});
  }

  res.json({success: true});
};

export const getPlayListByProfile: RequestHandler = async (req, res) => {
  const {limit = '20', pageNo = '0'} = req.query as paginationQuery;

  const data = await PlayList.find({
    owner: req.user.id,
    visibility: {
      $ne: 'auto',
    },
  })
    .skip(parseInt(pageNo) * parseInt(limit))
    .limit(parseInt(limit))
    .sort('-createdAt');

  //destructing data
  const playlist = data.map(item => {
    return {
      id: item._id,
      title: item.title,
      itemsCount: item.items.length,
      visibility: item.visibility,
    };
  });

  res.status(201).json({playlist});
};

export const getSinglePlayList: RequestHandler = async (req, res) => {
  const {playlistid} = req.params;

  if (!isValidObjectId(playlistid))
    return res.status(422).json({error: 'Invalid playlist id!'});

  const singlePlaylist = await PlayList.findOne({
    owner: req.user.id,
    _id: playlistid,
  }).populate<{items: PopulateFavList[]}>({
    path: 'items',
    populate: {
      path: 'owner',
      select: 'name',
    },
  });

  if (!singlePlaylist) return res.json({list: []});

  const audios = singlePlaylist.items.map(item => {
    return {
      id: item._id,
      title: item.title,
      category: item.category,
      file: item.file.url,
      poster: item.poster?.url,
      owner: {
        name: item.owner.name,
        id: item.owner._id,
      },
    };
  });

  res.json({
    list: {
      id: singlePlaylist._id,
      title: singlePlaylist.title,
      audios,
    },
  });

  res.status(201).json({singlePlaylist});
};
