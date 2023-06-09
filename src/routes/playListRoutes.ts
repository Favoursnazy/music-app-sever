import {
  createPlayList,
  deletePlaylist,
  getPlayListByProfile,
  getSinglePlayList,
  updatePlaylist,
} from '@/controllers/playListContoller';
import {authUser, isVerified} from '@/middleware/auth';
import {validate} from '@/middleware/validator';
import {
  NewPlayListValidationSchema,
  UpdatePlayListValidationSchema,
} from '@/utils/validationSchema';
import {Router} from 'express';

const router = Router();

router.post(
  '/create',
  authUser,
  isVerified,
  validate(NewPlayListValidationSchema),
  createPlayList,
);
router.patch(
  '/update',
  authUser,
  validate(UpdatePlayListValidationSchema),
  updatePlaylist,
);
router.delete('/', authUser, deletePlaylist);
router.get('/by-profile', authUser, getPlayListByProfile);
router.get('/:playlistid', authUser, getSinglePlayList);

export default router;
