import {
  createAudio,
  getLastestUploads,
  getRecommended,
  updateAudio,
} from '@/controllers/audioController';
import {authUser, isAuth, isVerified} from '@/middleware/auth';
import {fileUpload} from '@/middleware/fileUpload';
import {validate} from '@/middleware/validator';
import {AudioValidationSchema} from '@/utils/validationSchema';
import {Router} from 'express';

const router = Router();

router.post(
  '/create',
  authUser,
  isVerified,
  fileUpload,
  validate(AudioValidationSchema),
  createAudio,
);
router.patch(
  '/:audioId',
  authUser,
  isVerified,
  fileUpload,
  validate(AudioValidationSchema),
  updateAudio,
);
router.get('/latest', getLastestUploads);
router.get('/recomended', isAuth, getRecommended);

export default router;
