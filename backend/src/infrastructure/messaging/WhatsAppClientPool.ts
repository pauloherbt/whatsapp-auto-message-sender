import path from 'path';
import fs from 'fs';
import { Client, LocalAuth } from 'whatsapp-web.js';
import WhatsAppWebJsGateway from '../messaging/WhatsAppWebJsGateway';

export interface TenantSession {
    client: Client;
    gateway: WhatsAppWebJsGateway;
    qr: string | null;
    qrGeneratedAt: number | null;
    pairingCode: string | null;
    isConnected: boolean;
    isAuthenticating: boolean;
}

const pool = new Map<number, TenantSession>();

function buildPuppeteerOptions() {
    const opts: any = {
        headless: true,
        protocolTimeout: 120000,
        args: [
            '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
            '--renderer-process-limit=1', '--js-flags=--max-old-space-size=256',
            '--disable-gpu', '--disable-accelerated-2d-canvas',
            '--disable-software-rasterizer', '--disable-extensions',
            '--disable-sync', '--disable-translate', '--disable-default-apps',
            '--disable-background-networking', '--disable-background-timer-throttling',
            '--disable-client-side-phishing-detection', '--disable-domain-reliability',
            '--disable-features=AudioServiceOutOfProcess,TranslateUI',
            '--no-first-run', '--no-default-browser-check',
            '--ignore-certificate-errors', '--mute-audio', '--window-size=1280,800',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
    };
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        opts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    return opts;
}

function cleanupLock(userId: number) {
    try {
        const lockPath = path.join(process.cwd(), 'data', `auth_${userId}`, 'Default', 'SingletonLock');
        if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
    } catch { }
}

export function getSession(userId: number): TenantSession | undefined {
    return pool.get(userId);
}

export function getOrCreateSession(userId: number): TenantSession {
    if (pool.has(userId)) return pool.get(userId)!;

    const session: TenantSession = {
        client: null as any,
        gateway: null as any,
        qr: null,
        qrGeneratedAt: null,
        pairingCode: null,
        isConnected: false,
        isAuthenticating: false,
    };
    pool.set(userId, session);

    const client = new Client({
        authStrategy: new LocalAuth({ dataPath: path.join(process.cwd(), 'data', `auth_${userId}`) }),
        authTimeoutMs: 180000,
        webVersion: '2.3000.1015901307',
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1015901307-alt.html'
        },
        puppeteer: buildPuppeteerOptions()
    });

    session.client = client;
    session.gateway = new WhatsAppWebJsGateway(client);

    client.on('qr', (qr: string) => {
        const sanitized = qr.startsWith('undefined,') ? qr.substring(10) : qr;
        console.log(`[wpp][user:${userId}] QR ready (len=${sanitized.length})`);
        session.qr = sanitized;
        session.qrGeneratedAt = Date.now();
        session.isConnected = false;
        session.isAuthenticating = false;
    });

    client.on('authenticated', () => {
        console.log(`[wpp][user:${userId}] Authenticated, syncing...`);
        session.qr = null;
        session.pairingCode = null;
        session.isAuthenticating = true;
        session.isConnected = false;
    });

    client.on('ready', () => {
        console.log(`[wpp][user:${userId}] Ready!`);
        session.qr = null;
        session.isConnected = true;
        session.isAuthenticating = false;
    });

    client.on('auth_failure', (msg: string) => {
        console.error(`[wpp][user:${userId}] Auth failure: ${msg}`);
        session.qr = null;
        session.isConnected = false;
        session.isAuthenticating = false;
    });

    client.on('disconnected', (reason: string) => {
        console.log(`[wpp][user:${userId}] Disconnected: ${reason}`);
        session.isConnected = false;
        session.isAuthenticating = false;
    });

    cleanupLock(userId);
    client.initialize().catch(err => console.error(`[wpp][user:${userId}] Init error:`, err.message));

    return session;
}

export async function destroySession(userId: number): Promise<void> {
    const session = pool.get(userId);
    if (!session) return;
    try {
        await session.client.destroy();
    } catch { }
    pool.delete(userId);

    // Remove auth data so user needs to re-authenticate
    const authPath = path.join(process.cwd(), 'data', `auth_${userId}`);
    if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
}
