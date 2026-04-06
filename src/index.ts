import express from 'express';
import cors, { type CorsOptions } from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';

import authRoutes from './routes/auth';
import creatorRoutes from './routes/creators';
import campaignRoutes from './routes/campaigns';
import applicationRoutes from './routes/applications';
import feedbackRoutes from './routes/feedback';
import messageRoutes from './routes/messages';

dotenv.config({ override: true });
connectDB();

const app = express();

const corsOptions: CorsOptions = {
  // Allow configured frontend origins in dev/prod, or reflect the request origin locally.
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/creators', creatorRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/messages', messageRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));