import {
  getAllHistories,
  getRecentlyPlayed,
  removeHistory,
  updateHistory,
} from '@/controllers/historyController';
import {authUser} from '@/middleware/auth';
import {validate} from '@/middleware/validator';
import {UpdateHistorySchema} from '@/utils/validationSchema';
import {Router} from 'express';

const router = Router();

router.post('/', authUser, validate(UpdateHistorySchema), updateHistory);
router.delete('/', authUser, removeHistory);
router.get('/', authUser, getAllHistories);
router.get('/recently-played', authUser, getRecentlyPlayed);

export default router;
