import mongoose from 'mongoose';
import {MONGO_URI} from '@/utils/variables';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Database Connected!!!');
  })
  .catch(error => {
    console.log('Database connection failed', error);
  });
