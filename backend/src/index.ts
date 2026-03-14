import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';

import { authMiddleware } from './infrastructure/web/middleware/authMiddleware';
import authRoutes from './infrastructure/web/routes/authRoutes';
import { apiRouter } from './infrastructure/web/routes/api';

const app = express();
app.use(express.json());
app.use(cors());

const port = process.env.PORT || 8080;

// ── Public routes ───────────────────────────────────────────────────────────
app.get('/', (_req: Request, res: Response) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>WPP Group Manager API</title></head>
        <body style="font-family: sans-serif; padding: 20px; text-align: center;">
            <h1>WPP Group Manager API</h1>
            <p>Status: Running ✅</p>
            <p>Multi-tenant mode: each user manages their own WhatsApp session.</p>
        </body>
        </html>
    `);
});

app.use('/api/auth', authRoutes);

// ── Protected routes (require JWT) ─────────────────────────────────────────
app.use('/api', authMiddleware, apiRouter);

// ── Start server ───────────────────────────────────────────────────────────
app.listen(port, () => {
    console.log(`🚀 Backend API running on port ${port} (multi-tenant)`);
});

process.on('unhandledRejection', (reason, p) => {
    console.error('[process] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[process] Uncaught Exception:', err);
});
