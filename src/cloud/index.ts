import {
  CLOUDINARY_KEY,
  CLOUDINARY_NAME,
  CLOUDINARY_SECRET,
} from '@/utils/variables';
import {v2 as cloudinary} from 'cloudinary';

cloudinary.config({
  cloud_name: CLOUDINARY_NAME,
  api_key: CLOUDINARY_KEY,
  api_secret: CLOUDINARY_SECRET,
  secure: true,
});

export default cloudinary;
