import {CreateUser, VerifyEmailRequest} from '@/types/user';
import {RequestHandler} from 'express';
import {generateToken, getUserProfile} from '@/utils/helper';
import {
  sendForgotPasswordLink,
  sendPasswordResetSuccessEmail,
  sendVerificationMail,
} from '@/utils/mailHelper';
import EmailVerificationToken from '@/models/emailVerificationTokenModel';
import User from '@/models/userModel';
import {isValidObjectId} from 'mongoose';
import PasswordResetToken from '@/models/passwordResetTokenModel';
import crypto from 'crypto';
import {JWT_SECRET, PASSWORD_RESET_LINK} from '@/utils/variables';
import jwt from 'jsonwebtoken';
import {RequestWithFiles} from '@/middleware/fileUpload';
import cloudinary from '@/cloud';
import formidable from 'formidable';

export const createUser: RequestHandler = async (req: CreateUser, res) => {
  const {name, email, password} = req.body;

  const alreadyUser = await User.findOne({email});

  if (alreadyUser)
    return res.status(403).json({error: 'Email is already in use'});

  const user = await User.create({
    name,
    email,
    password,
  });

  //send verification email
  const token = generateToken();

  await EmailVerificationToken.create({
    owner: user._id,
    token,
  });

  sendVerificationMail(token, {name, email, userId: user._id.toString()});

  res.status(201).json({user: {id: user._id, name, email}});
};

export const verifyEmail: RequestHandler = async (
  req: VerifyEmailRequest,
  res,
) => {
  const {token, userId} = req.body;

  const verificationToken = await EmailVerificationToken.findOne({
    owner: userId,
  });

  if (!verificationToken)
    return res.status(403).json({error: 'Invalid token!'});

  const matched = await verificationToken?.compareToken(token);

  if (!matched) return res.status(403).json({error: 'invalid token!'});

  await User.findByIdAndUpdate(userId, {
    verified: true,
  });

  await EmailVerificationToken.findByIdAndDelete(verificationToken._id);

  res.status(201).json({message: 'Your email is verified'});
};

export const sendReVerificationToken: RequestHandler = async (req, res) => {
  const {userId} = req.body;

  if (!isValidObjectId) return res.status(403).json({error: 'Invalid request'});

  const user = await User.findById(userId);
  if (!user) return res.status(403).json({error: 'User not found!'});

  if (user.verified)
    return res.json(422).json({error: 'This user is already verified!'});

  await EmailVerificationToken.findOneAndDelete({
    owner: userId,
  });

  const token = generateToken();

  await EmailVerificationToken.create({
    owner: userId,
    token,
  });

  sendVerificationMail(token, {
    name: user?.name,
    email: user?.email,
    userId: user._id.toString(),
  });

  res.status(201).json({message: 'Verification link has been sent'});
};

export const generateForgetPasswordLink: RequestHandler = async (req, res) => {
  const {email} = req.body;

  const user = await User.findOne({email});

  if (!user) return res.status(404).json({error: 'Account not found!'});
  await PasswordResetToken.findOneAndDelete({owner: user._id});
  const token = crypto.randomBytes(36).toString('hex');

  await PasswordResetToken.create({
    owner: user._id,
    token,
  });

  const resetLink = `${PASSWORD_RESET_LINK}?token=${token}&userId=${user._id}`;

  sendForgotPasswordLink({email: user.email, link: resetLink});
  res.json({message: 'Please check your registered mail.'});
};

export const grantValid: RequestHandler = async (req, res) => {
  res.json({valid: true});
};

export const updatePassword: RequestHandler = async (req, res) => {
  const {userId, password} = req.body;

  const user = await User.findById(userId);
  if (!user) return res.status(403).json({error: 'Unauthorized access'});

  const matched = await user.comparePassword(password);
  if (matched)
    return res.status(422).json({error: 'Password must be different'});

  user.password = password;
  await user.save();

  await PasswordResetToken.findOneAndDelete({
    owner: user._id,
  });

  //send the sucess email
  sendPasswordResetSuccessEmail(user.name, user.email);
  res.status(201).json({message: 'Password resets succesfully.'});
};

export const signIn: RequestHandler = async (req, res) => {
  const {email, password} = req.body;

  const user = await User.findOne({
    email,
  });
  if (!user) return res.status(403).json({error: 'Wrong Credentials!!'});

  //Compare the user
  const matched = await user.comparePassword(password);
  if (!matched) return res.status(403).json({error: 'Wrong Credentials!!'});

  // generate Jwt token for our user
  const token = jwt.sign({userId: user._id}, JWT_SECRET);
  user.tokens.push(token);

  await user.save();

  res.status(201).json({
    profile: {
      id: user._id,
      name: user.name,
      email: user.email,
      verified: user.verified,
      avatar: user.avatar?.url,
      followers: user.followers.length,
      followings: user.followings.length,
    },
    token,
  });
};

export const updateProfile: RequestHandler = async (
  req: RequestWithFiles,
  res,
) => {
  const {name} = req.body;
  const avatar = req.files?.avatar as formidable.File;

  const user = await User.findById(req.user.id);
  if (!user) return new Error('Something went wrong, user not found');

  if (typeof name !== 'string')
    return res.status(422).json({error: 'Invalid name'});

  if (name.trim().length < 3)
    return res.status(422).json({error: 'Name too short!'});

  user.name = name;

  //upload avatar file
  if (avatar) {
    //if there is already an avatar, we delete it before uploading
    if (user.avatar?.publicId) {
      await cloudinary.uploader.destroy(user.avatar?.publicId);
    }

    // upload new avatar  file
    const {secure_url, public_id} = await cloudinary.uploader.upload(
      avatar.filepath,
      {
        width: 300,
        height: 300,
        crop: 'thumb',
        gravity: 'face',
      },
    );
    user.avatar = {url: secure_url, publicId: public_id};
  }

  await user.save();

  res.status(201).json({profile: getUserProfile(user)});
};

export const userProfile: RequestHandler = (req, res) => {
  res.status(201).json({profile: req.user});
};

export const logOut: RequestHandler = async (req, res) => {
  const {fromAll} = req.query;

  const token = req.token;
  const user = await User.findById(req.user.id);
  if (!user) throw new Error('Something went wrong, user not found!');

  //logout from all devices
  if (fromAll === 'yes') user.tokens = [];
  else user.tokens = user.tokens.filter(t => t !== token);

  await user.save();

  res.status(201).json({success: true});
};

export const sendProfile: RequestHandler = async (req, res) => {
  res.status(200).json({profile: req.user});
};
