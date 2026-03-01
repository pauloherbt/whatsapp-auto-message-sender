import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { Client, LocalAuth } from 'whatsapp-web.js';
import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';

// Infrastructure
import WhatsAppWebJsGateway from './infrastructure/messaging/WhatsAppWebJsGateway';
import listRepo from './infrastructure/persistence/SqliteListRepository';
import groupRepo from './infrastructure/persistence/SqliteGroupRepository';
import messageRepo from './infrastructure/persistence/SqliteMessageRepository';

// Application Use Cases
import ManageLists from './application/use-cases/ManageLists';
import ManageGroups from './application/use-cases/ManageGroups';
import BroadcastMessage from './application/use-cases/BroadcastMessage';

const listUC = new ManageLists(listRepo);
const groupUC = new ManageGroups(groupRepo, listRepo);

// Initialize WhatsApp Client & App
const app = express();
app.use(express.json());
app.use(cors());

// Variables for status tracking
let latestQR: string | null = null;
let isConnected = false;
let isAuthenticating = false;

// --- START SERVER IMMEDIATELY FOR FLY.IO HEALTH CHECKS ---
const port = process.env.PORT || 8080;

app.get('/', (req: Request, res: Response) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>WPP Recovery Dashboard</title></head>
        <body style="font-family: sans-serif; padding: 20px; text-align: center;">
            <h1>WPP Group Manager API</h1>
            <div style="background: #f0f0f0; padding: 15px; border-radius: 10px; display: inline-block; text-align: left;">
                <p><strong>Status:</strong> Running</p>
                <p><strong>WhatsApp:</strong> ${isConnected ? '✅ Connected' : '❌ Disconnected'}</p>
                <p><strong>Auth State:</strong> ${isAuthenticating ? '⏳ Authenticating...' : 'Idle'}</p>
                <p><strong>QR available:</strong> ${latestQR ? '✅ Yes' : '❌ No'}</p>
            </div>
            <hr style="margin: 20px 0;">
            <form action="/api/reset-session" method="POST" onsubmit="return confirm('ATENÇÃO: Isso vai apagar todo o login do WhatsApp. Tem certeza?')">
                <button type="submit" style="background:red; color:white; padding:15px; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">
                    DANGER: Reset WhatsApp Session & Data
                </button>
            </form>
            <p style="color: gray; font-size: 0.8em; margin-top: 20px;">Use este botão se o QR Code travar ou se o WhatsApp deslogar sozinho.</p>
        </body>
        </html>
    `);
});

app.post('/api/reset-session', (req: Request, res: Response) => {
    console.log('[danger] Manual Session Reset Triggered');
    try {
        const authPath = path.join(process.cwd(), 'data', 'auth');
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
            console.log('[danger] Session folder deleted.');
        }
        res.send('Session deleted. The app will restart now.');
        setTimeout(() => process.exit(1), 1000);
    } catch (err: any) {
        res.status(500).send('Error resetting session: ' + err.message);
    }
});

app.get('/api/status', (req: Request, res: Response) => {
    res.json({
        connected: isConnected,
        authenticating: isAuthenticating,
        qr: latestQR
    });
});

app.listen(port, () => {
    console.log(`🚀 Backend API running on port ${port}`);
});

process.on('unhandledRejection', (reason, p) => {
    console.error('[process] Unhandled Rejection at:', p, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[process] Uncaught Exception:', err);
});

// --- WHATSAPP CLIENT SETUP ---
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: path.join(process.cwd(), 'data', 'auth')
    }),
    authTimeoutMs: 180000, // Increase to 3 minutes
    webVersion: '2.3000.1015901307',
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1015901307-alt.html'
    },
    puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--disable-gpu',
            '--disable-extensions',
            '--no-default-browser-check',
            '--ignore-certificate-errors',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
    }
});

const messagingGateway = new WhatsAppWebJsGateway(client);
const broadcastUC = new BroadcastMessage(messagingGateway, listRepo, groupRepo, messageRepo);

client.on('qr', (qr: string) => {
    const sanitizedQR = qr.startsWith('undefined,') ? qr.substring(10) : qr;
    console.log('[whatsapp-web] QR Code received! Ready to scan.');
    latestQR = sanitizedQR;
    isConnected = false;
    isAuthenticating = false;
});

client.on('loading_screen', (percent: string, message: string) => {
    console.log(`[whatsapp-web] Loading Screen: ${percent}% - ${message}`);
});

client.on('authenticated', () => {
    console.log(`✅ WhatsApp Authenticated! Handshake complete. Syncing data...`);
    latestQR = null;
    isAuthenticating = true;
    isConnected = false;
});

client.on('auth_failure', (msg: string) => {
    console.error(`❌ Authentication Failure:`, msg);
    latestQR = null;
    isAuthenticating = false;
    isConnected = false;
});

client.on('ready', () => {
    console.log(`✅ WhatsApp Web Client Ready and Session Active!`);
    latestQR = null;
    isConnected = true;
    isAuthenticating = false;
});

client.on('disconnected', (reason: any) => {
    console.log(`❌ WhatsApp Web Client Disconnected: ${reason}`);
    isConnected = false;
    isAuthenticating = false;
});

function cleanupLocks() {
    try {
        const lockPath = path.join(process.cwd(), 'data', 'auth', 'Default', 'SingletonLock');
        if (fs.existsSync(lockPath)) {
            console.log('[cleanup] Removing stale SingletonLock...');
            fs.unlinkSync(lockPath);
        }
    } catch (err) { }
}

console.log('[whatsapp-web] Initializing...');
cleanupLocks();
client.initialize().catch(err => console.error('[whatsapp-web] Fatal init error:', err));

// --- API ROUTES ---

app.get('/api/whatsapp-groups', async (req: Request, res: Response): Promise<void> => {
    if (!isConnected) { res.status(400).json({ error: 'Client not connected' }); return; }
    try {
        const groups = await messagingGateway.fetchGroups();
        res.json(groups);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/lists', (req: Request, res: Response) => { res.json(listUC.getAll()); });

app.post('/api/lists', (req: Request, res: Response): void => {
    try {
        const { name } = req.body;
        if (!name) { res.status(400).json({ error: 'Name is required' }); return; }
        res.json(listUC.create(name));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.put('/api/lists/:id', (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        res.json(listUC.rename(req.params.id as string, name));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/lists/:id', (req: Request, res: Response) => {
    try {
        listUC.remove(req.params.id as string);
        res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.get('/api/lists/:id/groups', (req: Request, res: Response) => {
    try { res.json(groupUC.forList(req.params.id as string)); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post('/api/lists/:id/groups', (req: Request, res: Response) => {
    try {
        const { wppId, name } = req.body;
        groupUC.add(req.params.id as string, wppId, name || '');
        res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/groups/:id', (req: Request, res: Response) => {
    try {
        groupUC.remove(req.params.id as string);
        res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post('/api/broadcast', async (req: Request, res: Response): Promise<void> => {
    if (!isConnected) { res.status(400).json({ error: 'Client not connected' }); return; }
    try {
        const { listId, message } = req.body;
        const result = await broadcastUC.execute({ listId, content: message, sentBy: 'Web UI' });
        res.json(result);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.get('/api/history', (req: Request, res: Response) => { res.json(messageRepo.getHistory()); });
