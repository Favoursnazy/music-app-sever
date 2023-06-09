import {
  getIsFavourite,
  getUserFavourites,
  toggleFavourite,
} from '@/controllers/favouriteController';
import {authUser, isVerified} from '@/middleware/auth';
import {Router} from 'express';

const router = Router();

router.post('/', authUser, isVerified, toggleFavourite);
router.get('/', authUser, isVerified, getUserFavourites);
router.get('/is-fav', authUser, isVerified, getIsFavourite);

export default router;
