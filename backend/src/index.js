'use strict';

require('dotenv').config();
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const cors = require('cors');

// Infrastructure
const WhatsAppWebJsGateway = require('./infrastructure/messaging/WhatsAppWebJsGateway');
const listRepo = require('./infrastructure/persistence/SqliteListRepository');
const groupRepo = require('./infrastructure/persistence/SqliteGroupRepository');
const messageRepo = require('./infrastructure/persistence/SqliteMessageRepository');

// Application Use Cases
const ManageLists = require('./application/use-cases/ManageLists');
const ManageGroups = require('./application/use-cases/ManageGroups');
const BroadcastMessage = require('./application/use-cases/BroadcastMessage');

const listUC = new ManageLists(listRepo);
const groupUC = new ManageGroups(groupRepo, listRepo);

const fs = require('fs');

// Initialize WhatsApp Client & App
const app = express();
app.use(express.json());
app.use(cors());

// Variables for status tracking
let latestQR = null;
let isConnected = false;
let isAuthenticating = false;

// --- START SERVER IMMEDIATELY FOR FLY.IO HEALTH CHECKS ---
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
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

app.post('/api/reset-session', (req, res) => {
    console.log('[danger] Manual Session Reset Triggered');
    try {
        const authPath = path.join(process.cwd(), 'data', 'auth');
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
            console.log('[danger] Session folder deleted.');
        }
        res.send('Session deleted. The app will restart now.');
        setTimeout(() => process.exit(1), 1000);
    } catch (err) {
        res.status(500).send('Error resetting session: ' + err.message);
    }
});

app.get('/api/status', (req, res) => {
    res.json({
        connected: isConnected,
        authenticating: isAuthenticating,
        qr: latestQR
    });
});

app.listen(port, '0.0.0.0', () => {
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
    authTimeoutMs: 120000,
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

client.on('qr', (qr) => {
    const sanitizedQR = qr.startsWith('undefined,') ? qr.substring(10) : qr;
    console.log('[whatsapp-web] QR Code received! Ready to scan.');
    latestQR = sanitizedQR;
    isConnected = false;
    isAuthenticating = false;
});

client.on('loading_screen', (percent, message) => {
    console.log('[whatsapp-web] Loading:', percent, message);
});

client.on('authenticated', () => {
    console.log(`✅ WhatsApp Authenticated! Creating session...`);
    latestQR = null;
    isAuthenticating = true;
});

client.on('auth_failure', (msg) => {
    console.error(`❌ Authentication Failure: ${msg}`);
    isAuthenticating = false;
});

client.on('ready', () => {
    console.log(`✅ WhatsApp Web Client Ready and Session Active!`);
    latestQR = null;
    isConnected = true;
    isAuthenticating = false;
});

client.on('disconnected', (reason) => {
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

app.get('/api/whatsapp-groups', async (req, res) => {
    if (!isConnected) return res.status(400).json({ error: 'Client not connected' });
    try {
        const groups = await messagingGateway.fetchGroups();
        res.json(groups);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/lists', (req, res) => res.json(listUC.getAll()));

app.post('/api/lists', (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        res.json(listUC.create(name));
    } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/lists/:id', (req, res) => {
    try {
        const { name } = req.body;
        res.json(listUC.rename(req.params.id, name));
    } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/lists/:id', (req, res) => {
    try {
        listUC.remove(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/lists/:id/groups', (req, res) => {
    try { res.json(groupUC.forList(req.params.id)); }
    catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/lists/:id/groups', (req, res) => {
    try {
        const { wppId, name } = req.body;
        groupUC.add(req.params.id, wppId, name || '');
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/groups/:id', (req, res) => {
    try {
        groupUC.remove(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/broadcast', async (req, res) => {
    if (!isConnected) return res.status(400).json({ error: 'Client not connected' });
    try {
        const { listId, message } = req.body;
        const result = await broadcastUC.execute({ listId, content: message, sentBy: 'Web UI' });
        res.json(result);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/history', (req, res) => res.json(messageRepo.getHistory()));
