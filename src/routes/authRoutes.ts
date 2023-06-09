import {fileUpload} from './../middleware/fileUpload';
import {
  createUser,
  generateForgetPasswordLink,
  grantValid,
  sendProfile,
  logOut,
  sendReVerificationToken,
  signIn,
  updatePassword,
  updateProfile,
  userProfile,
  verifyEmail,
} from '@/controllers/authController';
import {authUser} from '@/middleware/auth';
import {isValidPasswordResetToken} from '@/middleware/auth';
import {validate} from '@/middleware/validator';
import {
  LoginUserValidationSchema,
  PasswordUpdateSchema,
  TokenAndIDValidation,
  createUserSchema,
} from '@/utils/validationSchema';
import {Router} from 'express';

const router = Router();

router.post('/register', validate(createUserSchema), createUser);
router.post('/verify', validate(TokenAndIDValidation), verifyEmail);
router.post('/re-verify', sendReVerificationToken);
router.post('/reset-password', generateForgetPasswordLink);
router.post('/update-profile', authUser, fileUpload, updateProfile);
router.get('/is-auth', authUser, sendProfile);
router.post(
  '/verify-token',
  validate(TokenAndIDValidation),
  isValidPasswordResetToken,
  grantValid,
);
router.post(
  '/update-password',
  validate(PasswordUpdateSchema),
  isValidPasswordResetToken,
  updatePassword,
);
router.post('/sign-in', validate(LoginUserValidationSchema), signIn);
router.post('/update-profile', authUser, fileUpload, updateProfile);
router.get('/profile', authUser, userProfile);
router.post('/log-out', authUser, logOut);

export default router;
