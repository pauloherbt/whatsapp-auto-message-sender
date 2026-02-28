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

// Initialize WhatsApp Client & App
const app = express();
app.use(express.json());
app.use(cors());

// --- START SERVER IMMEDIATELY FOR FLY.IO HEALTH CHECKS ---
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Backend API running on port ${port}`);
});

app.get('/', (req, res) => res.send('WhatsApp Bot API is running!'));

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
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
    }
});

const messagingGateway = new WhatsAppWebJsGateway(client);
const broadcastUC = new BroadcastMessage(messagingGateway, listRepo, groupRepo, messageRepo);

let latestQR = null;
let isConnected = false;
let isAuthenticating = false;

console.log('[whatsapp-web] Hooking events...');

client.on('qr', (qr) => {
    // Sanitize QR string: some versions/environments prefix it with 'undefined,'
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

// Function to cleanup Puppeteer locks that might cause hangs on persistent volumes
function cleanupLocks() {
    try {
        const lockPath = path.join(process.cwd(), 'data', 'auth', 'Default', 'SingletonLock');
        if (fs.existsSync(lockPath)) {
            console.log('[cleanup] Removing stale SingletonLock...');
            fs.unlinkSync(lockPath);
        }
        const socketPath = path.join(process.cwd(), 'data', 'auth', 'Default', 'SingletonSocket');
        if (fs.existsSync(socketPath)) {
            console.log('[cleanup] Removing stale SingletonSocket...');
            fs.unlinkSync(socketPath);
        }
    } catch (err) {
        console.warn('[cleanup] Warning while clearing locks:', err.message);
    }
}

// Start the client
console.log('[whatsapp-web] Cleaning up potential locks...');
cleanupLocks();

console.log('[whatsapp-web] Initializing WhatsApp Client...');
client.initialize().then(() => {
    console.log('[whatsapp-web] client.initialize() promise resolved.');
}).catch(err => {
    console.error('[whatsapp-web] client.initialize() error:', err);
});

// --- API ROUTES ---

// Root Health Check for Fly.io
app.get('/', (req, res) => {
    res.send(`
        <h1>WPP Group Manager API</h1>
        <p>Status: Running</p>
        <p>WhatsApp Connected: ${isConnected}</p>
        <p>Authenticating: ${isAuthenticating}</p>
        <p>QR Code Ready: ${latestQR ? 'Yes' : 'No'}</p>
        <hr>
        <form action="/api/reset-session" method="POST">
            <button type="submit" style="background:red; color:white; padding:10px; border:none; border-radius:5px; cursor:pointer;">
                DANGER: Reset WhatsApp Session
            </button>
        </form>
    `);
});

// Emergency Reset Route
app.post('/api/reset-session', (req, res) => {
    console.log('[danger] Manual Session Reset Triggered');
    try {
        const authPath = path.join(process.cwd(), 'data', 'auth');
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
            console.log('[danger] Session folder deleted. Restarting process...');
            res.send('Session deleted. The app will restart now (Fly.io will auto-restart it).');
            setTimeout(() => process.exit(1), 1000); // Exit and let Fly.io restart it
        } else {
            res.send('Session folder not found.');
        }
    } catch (err) {
        res.status(500).send('Error resetting session: ' + err.message);
    }
});

// 1. Status & Auth
app.get('/api/status', (req, res) => {
    res.json({
        connected: isConnected,
        authenticating: isAuthenticating,
        qr: latestQR
    });
});

// 2. WhatsApp Groups integration
app.get('/api/whatsapp-groups', async (req, res) => {
    if (!isConnected) return res.status(400).json({ error: 'Client not connected' });
    try {
        const groups = await messagingGateway.fetchGroups();
        res.json(groups);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. Lists Management
app.get('/api/lists', (req, res) => {
    res.json(listUC.getAll());
});

app.post('/api/lists', (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        const list = listUC.create(name);
        res.json(list);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.put('/api/lists/:id', (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'New name is required' });
        const list = listUC.rename(req.params.id, name);
        res.json(list);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.delete('/api/lists/:id', (req, res) => {
    try {
        listUC.remove(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// 4. Groups in Lists Management
app.get('/api/lists/:id/groups', (req, res) => {
    try {
        const groups = groupUC.forList(req.params.id);
        res.json(groups);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/api/lists/:id/groups', (req, res) => {
    try {
        const { wppId, name } = req.body;
        if (!wppId) return res.status(400).json({ error: 'wppId is required' });

        groupUC.add(req.params.id, wppId, name || '');
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.delete('/api/groups/:id', (req, res) => {
    try {
        groupUC.remove(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// 5. Broadcasts
app.post('/api/broadcast', async (req, res) => {
    if (!isConnected) return res.status(400).json({ error: 'Client not connected' });
    try {
        const { listId, message } = req.body;
        if (!listId || !message) return res.status(400).json({ error: 'listId and message are required' });

        const result = await broadcastUC.execute({ listId, content: message, sentBy: 'Web UI' });
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// 6. History
app.get('/api/history', (req, res) => {
    res.json(messageRepo.getHistory());
});
