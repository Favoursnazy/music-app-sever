import express from 'express';
import 'express-async-errors';
import 'dotenv/config';
import '@/db';
import authRouter from '@/routes/authRoutes';
import audioRouter from '@/routes/audioRoutes';
import favoutiteRouter from '@/routes/favouriteRoutes';
import playListRouter from '@/routes/playListRoutes';
import profileRouter from '@/routes/profileRoutes';
import historyRouter from '@/routes/historyRoutes';
import '@/utils/schedule';
import {errorHandler} from './middleware/errorHandler';
import cors from 'cors';

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cors());

// register our middlewares
app.use('/api/auth', authRouter);
app.use('/api/audio', audioRouter);
app.use('/api/favourite', favoutiteRouter);
app.use('/api/playlist', playListRouter);
app.use('/api/profile', profileRouter);
app.use('/api/history', historyRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
