import Audio, {AudioDocument} from '@/models/audioModel';
import AutoGeneratedPlaylist from '@/models/autoGeneratedPlaylistModel';
import History from '@/models/historyModel';
import PlayList from '@/models/playListModel';
import User from '@/models/userModel';
import {paginationQuery} from '@/types/misc';
import {getUsersPreviousHistory} from '@/utils/helper';
import {RequestHandler} from 'express';
import {ObjectId, PipelineStage, Types, isValidObjectId} from 'mongoose';

export const updateFollower: RequestHandler = async (req, res) => {
  const {profileId} = req.params;
  let status = 'follow' || 'unfollow';

  if (!isValidObjectId(profileId))
    return res.status(422).json({error: 'Invalid Profile Id!'});

  if (profileId === req.user.id.toString())
    return res.status(422).json({error: 'You cant follow your own account!'});

  const profile = await User.findById(profileId);
  if (!profile) return res.status(422).json({error: 'User not found!'});

  //check if the user is already a follower
  const alreadyAfollower = await User.findOne({
    _id: profileId,
    followers: req.user.id,
  });

  if (alreadyAfollower) {
    // unfollow
    await User.findByIdAndUpdate(
      profileId,
      {$pull: {followers: req.user.id}},
      {new: true},
    );
    status = 'unfollow';
  } else {
    //follow the user
    await User.findByIdAndUpdate(
      profileId,
      {$addToSet: {followers: req.user.id}},
      {new: true},
    );
    status = 'follow';
  }

  if (status === 'follow') {
    await User.updateOne(
      {_id: req.user.id},
      {$addToSet: {followings: profileId}},
    );
  }

  if (status === 'unfollow') {
    await User.updateOne({_id: req.user.id}, {$pull: {followings: profileId}});
  }

  res.json({status});
};

export const getPublicUploads: RequestHandler = async (req, res) => {
  const {limit = '20', pageNo = '0'} = req.query as paginationQuery;

  const {profileid} = req.params;

  if (!isValidObjectId(profileid))
    return res.status(422).json({error: 'Invalid profile Id!'});

  const data = await Audio.find({owner: profileid})
    .skip(parseInt(limit) * parseInt(pageNo))
    .limit(parseInt(limit))
    .sort('-createdAt')
    .populate<AudioDocument<{name: string; _id: ObjectId}>>('owner');

  const audios = data.map(item => {
    return {
      id: item._id,
      title: item.title,
      file: item.file,
      about: item.about,
      poster: item.poster?.url,
      date: item.createdAt,
      owner: {
        name: item.owner.name,
        id: item.owner._id,
      },
    };
  });

  res.json({audios});
};

export const getUploads: RequestHandler = async (req, res) => {
  const {limit = '20', pageNo = '0'} = req.query as paginationQuery;

  const data = await Audio.find({owner: req.user.id})
    .skip(parseInt(limit) * parseInt(pageNo))
    .limit(parseInt(limit))
    .sort('-createdAt');

  const audios = data.map(item => {
    return {
      id: item._id,
      title: item.title,
      file: item.file.url,
      about: item.about,
      poster: item.poster?.url,
      category: item.category,
      owner: {
        name: req.user.name,
        id: req.user.id,
      },
    };
  });

  res.json({audios});
};

export const getPublicProfile: RequestHandler = async (req, res) => {
  const {profileId} = req.params;

  if (!isValidObjectId(profileId))
    return res.status(422).json({error: 'Invalid Profile Id!'});

  const user = await User.findById(profileId);
  if (!user) return res.status(422).json({error: 'User not found!'});

  res.json({
    profile: {
      id: user._id,
      name: user.name,
      followers: user.followers.length,
      avatar: user.avatar?.url,
    },
  });
};

export const getPublicPlaylist: RequestHandler = async (req, res) => {
  const {profileid} = req.params;
  const {limit = '20', pageNo = '0'} = req.query as paginationQuery;

  if (!isValidObjectId(profileid))
    return res.status(422).json({error: 'Invalid Profile Id!'});

  const playlist = await PlayList.find({
    owner: profileid,
    visibility: 'public',
  })
    .skip(parseInt(limit) * parseInt(pageNo))
    .limit(parseInt(limit))
    .sort('-createdAt');

  if (!playlist) return res.json({playlist: []});

  res.json({
    playlist: playlist.map(item => {
      return {
        id: item._id,
        title: item.title,
        itemsCount: item.items.length,
        visibility: item.visibility,
      };
    }),
  });
};

export const getAutoGeneratedPlaylist: RequestHandler = async (req, res) => {
  //1 mix 20
  const [result] = await History.aggregate([
    {$match: {owner: req.user.id}},
    {$unwind: '$all'},
    {$group: {_id: '$all.audio', items: {$addToSet: '$all.audio'}}},
    {$sample: {size: 20}},
    {$group: {_id: null, items: {$push: '$_id'}}},
  ]);

  const title = 'Mix 20';

  if (result) {
    await PlayList.updateOne(
      {owner: req.user.id, title},
      {
        $set: {title, items: result.items, visibility: 'auto'},
      },
      {upsert: true},
    );
  }

  const category = await getUsersPreviousHistory(req);
  let matchOptions: PipelineStage.Match = {
    $match: {_id: {$exists: true}},
  };

  if (category.length) {
    matchOptions = {$match: {title: {$in: category}}};
  }

  const auto_gen_playlist = await AutoGeneratedPlaylist.aggregate([
    matchOptions,
    {$sample: {size: 4}},
    {
      $project: {
        _id: 0,
        id: '$_id',
        title: '$title',
        itemsCount: {$size: '$items'},
      },
    },
  ]);

  const playlist = await PlayList.findOne({owner: req.user.id, title});

  const finalList = auto_gen_playlist.concat({
    id: playlist?._id,
    title: playlist?.title,
    itemsCount: playlist?.items.length,
  });

  res.json({playlist: finalList});
};

export const getUserFollowers: RequestHandler = async (req, res) => {
  const {limit = '20', pageNo = '0'} = req.query as paginationQuery;

  const [result] = await User.aggregate([
    {$match: {_id: req.user.id}},
    {
      $project: {
        followers: {
          $slice: [
            '$followers',
            parseInt(pageNo) * parseInt(limit),
            parseInt(limit),
          ],
        },
      },
    },
    {$unwind: '$followers'},
    {
      $lookup: {
        from: 'users',
        localField: 'followers',
        foreignField: '_id',
        as: 'userInfo',
      },
    },
    {$unwind: '$userInfo'},
    {
      $group: {
        _id: null,
        followers: {
          $push: {
            id: '$userInfo._id',
            name: '$userInfo.name',
            avatar: '$userInfo.avatar.url',
          },
        },
      },
    },
  ]);

  if (!result) {
    return res.json({followers: []});
  }

  res.json({followers: result.followers});
};

export const getUserFollowings: RequestHandler = async (req, res) => {
  const {limit = '20', pageNo = '0'} = req.query as paginationQuery;

  const [result] = await User.aggregate([
    {$match: {_id: req.user.id}},
    {
      $project: {
        followings: {
          $slice: [
            '$followings',
            parseInt(pageNo) * parseInt(limit),
            parseInt(limit),
          ],
        },
      },
    },
    {$unwind: '$followings'},
    {
      $lookup: {
        from: 'users',
        localField: 'followings',
        foreignField: '_id',
        as: 'userInfo',
      },
    },
    {$unwind: '$userInfo'},
    {
      $group: {
        _id: null,
        followings: {
          $push: {
            id: '$userInfo._id',
            name: '$userInfo.name',
            avatar: '$userInfo.avatar.url',
          },
        },
      },
    },
  ]);

  if (!result) {
    return res.json({followings: []});
  }

  res.json({followings: result.followings});
};

export const getFollowerProfile: RequestHandler = async (req, res) => {
  const {limit = '20', pageNo = '0'} = req.query as paginationQuery;

  const {profileid} = req.params;

  if (!isValidObjectId(profileid)) {
    return res.status(422).json({error: 'Invalid profile id'});
  }

  const [result] = await User.aggregate([
    {$match: {_id: new Types.ObjectId(profileid)}},
    {
      $project: {
        followers: {
          $slice: [
            '$followers',
            parseInt(pageNo) * parseInt(limit),
            parseInt(limit),
          ],
        },
      },
    },
    {$unwind: '$followers'},
    {
      $lookup: {
        from: 'users',
        localField: 'followers',
        foreignField: '_id',
        as: 'userInfo',
      },
    },
    {$unwind: '$userInfo'},
    {
      $group: {
        _id: null,
        followers: {
          $push: {
            id: '$userInfo._id',
            name: '$userInfo.name',
            avatar: '$userInfo.avatar.url',
          },
        },
      },
    },
  ]);

  if (!result) {
    return res.json({followers: []});
  }

  res.json({followers: result.followers});
};

export const getPlaylistAudios: RequestHandler = async (req, res) => {
  const {limit = '20', pageNo = '0'} = req.query as paginationQuery;
  const {playlistid} = req.params;

  if (!isValidObjectId(playlistid))
    return res.status(422).json({error: 'Invalid playlist id'});

  const aggregationLogic = [
    {
      $match: {
        _id: new Types.ObjectId(playlistid),
        visibility: {$ne: 'private'},
      },
    },
    {
      $project: {
        items: {
          $slice: [
            '$items',
            parseInt(limit) * parseInt(pageNo),
            parseInt(limit),
          ],
        },
        title: '$title',
      },
    },
    {$unwind: '$items'},
    {
      $lookup: {
        from: 'audios',
        localField: 'items',
        foreignField: '_id',
        as: 'audios',
      },
    },
    {$unwind: '$audios'},
    {
      $lookup: {
        from: 'users',
        localField: 'audios.owner',
        foreignField: '_id',
        as: 'userInfo',
      },
    },
    {$unwind: '$userInfo'},
    {
      $group: {
        _id: {
          id: '$_id',
          title: '$title',
        },
        audios: {
          $push: {
            id: '$audios._id',
            title: '$audios.title',
            about: '$audios.about',
            category: '$audios.category',
            file: '$audios.file.url',
            poster: '$audios.poster.url',
            owner: {
              name: '$userInfo.name',
              _id: '$userInfo._id',
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        id: '$_id.id',
        title: '$_id.title',
        audios: '$$ROOT.audios',
      },
    },
  ];

  const [playlistResult] = await PlayList.aggregate(aggregationLogic);

  if (!playlistResult) {
    const [autoPlaylistResult] = await AutoGeneratedPlaylist.aggregate(
      aggregationLogic,
    );
    return res.json({list: autoPlaylistResult});
  }

  res.json({list: playlistResult});
};

export const getIsFollowing: RequestHandler = async (req, res) => {
  const {profileid} = req.params;

  if (!isValidObjectId(profileid))
    return res.status(422).json({error: 'Invalid profile id'});

  const user = await User.findOne({_id: profileid, followers: req.user.id});

  res.json({status: user ? true : false});
};
