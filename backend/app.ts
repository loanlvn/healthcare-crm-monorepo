import express from 'express';
import cors from 'cors';
import helmet, { crossOriginResourcePolicy } from 'helmet';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import pinoHttp from 'pino-http';
import router from './src/routes';
import { errorHandler } from './src/middlewares/errorHandler'
import path from 'node:path';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(pinoHttp({ logger: pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' }) }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
}));

app.use('/api', router);


// 404 fallback
app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

// global error handler
app.use(errorHandler);

export default app;
