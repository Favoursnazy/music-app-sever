import {isValidObjectId} from 'mongoose';
import * as yup from 'yup';
import {categories} from './audio_category';

export const createUserSchema = yup.object().shape({
  name: yup
    .string()
    .required('Name is required')
    .trim()
    .min(3, 'name is too short')
    .max(10, 'Name is too long'),
  email: yup.string().email('Invalid email id').required('email is required'),
  password: yup
    .string()
    .trim()
    .required('Password is required')
    .min(8, 'Password is too short')
    .matches(
      /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#\$%\^&\*])[a-zA-Z\d!@#\$%\^&\*]+$/,
      'Use a strong password',
    ),
});

export const TokenAndIDValidation = yup.object().shape({
  token: yup.string().trim().required('Invalid Token!'),
  userId: yup
    .string()
    .transform(function (value) {
      if (this.isType(value) && isValidObjectId(value)) {
        return value;
      }
      return '';
    })
    .required('Invalid userId!'),
});

export const PasswordUpdateSchema = yup.object().shape({
  token: yup.string().trim().required('Invalid Token!'),
  userId: yup
    .string()
    .transform(function (value) {
      if (this.isType(value) && isValidObjectId(value)) {
        return value;
      }
      return '';
    })
    .required('Invalid userId!'),
  password: yup
    .string()
    .trim()
    .required('Password is required')
    .min(8, 'Password is too short')
    .matches(
      /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#\$%\^&\*])[a-zA-Z\d!@#\$%\^&\*]+$/,
      'Use a strong password',
    ),
});

export const LoginUserValidationSchema = yup.object().shape({
  email: yup
    .string()
    .required('Email is required')
    .email('This is not a valid email'),
  password: yup.string().trim().required('Password is required!'),
});

export const AudioValidationSchema = yup.object().shape({
  title: yup.string().required('Title is required'),
  about: yup.string().required('Decription is required'),
  category: yup
    .string()
    .oneOf(categories, 'Invalid categories')
    .required('Category is required'),
});

export const NewPlayListValidationSchema = yup.object().shape({
  title: yup.string().required('Title is required'),
  audioId: yup.string().transform(function (value) {
    return this.isType(value) && isValidObjectId(value) ? value : '';
  }),
  visibility: yup
    .string()
    .oneOf(['public', 'private'], 'Visibility must be public or private')
    .required('Visibility is required'),
});

export const UpdatePlayListValidationSchema = yup.object().shape({
  title: yup.string().required('Title is required'),
  item: yup.string().transform(function (value) {
    return this.isType(value) && isValidObjectId(value) ? value : '';
  }),
  id: yup.string().transform(function (value) {
    return this.isType(value) && isValidObjectId(value) ? value : '';
  }),
  visibility: yup
    .string()
    .oneOf(['public', 'private'], 'Visibility must be public or private')
    .required('Visibility is required'),
});

export const UpdateHistorySchema = yup.object().shape({
  audio: yup
    .string()
    .transform(function (value) {
      return this.isType(value) && isValidObjectId(value) ? value : '';
    })
    .required('Audio is required!'),
  progress: yup.number().required('History Progress is required'),
  date: yup
    .string()
    .transform(function (value) {
      const date = new Date(value);
      if (date instanceof Date) return value;
      return '';
    })
    .required('Invalid Date!'),
});
