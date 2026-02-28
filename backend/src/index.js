'use strict';

require('dotenv').config();
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

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './data/auth'
    }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

const messagingGateway = new WhatsAppWebJsGateway(client);
const broadcastUC = new BroadcastMessage(messagingGateway, listRepo, groupRepo, messageRepo);

let latestQR = null;
let isConnected = false;

client.on('qr', (qr) => {
    console.log('[whatsapp-web] Target acquired. QR Code ready to scan.');
    latestQR = qr;
    isConnected = false;
});

client.on('ready', () => {
    console.log(`✅ WhatsApp Web Client Ready!`);
    latestQR = null;
    isConnected = true;
});

client.on('disconnected', () => {
    console.log(`❌ WhatsApp Web Client Disconnected!`);
    isConnected = false;
});

// Start the client
console.log('Initializing WhatsApp Client...');
client.initialize();

// --- API ROUTES ---

// 1. Status & Auth
app.get('/api/status', (req, res) => {
    res.json({
        connected: isConnected,
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`🚀 Backend API running on port ${port}`);
});
