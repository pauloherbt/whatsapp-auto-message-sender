import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { getOrCreateSession, destroySession } from '../../messaging/WhatsAppClientPool';
import listRepo from '../../persistence/SqliteListRepository';
import groupRepo from '../../persistence/SqliteGroupRepository';
import messageRepo from '../../persistence/SqliteMessageRepository';
import ManageLists from '../../../application/use-cases/ManageLists';
import ManageGroups from '../../../application/use-cases/ManageGroups';
import BroadcastMessage from '../../../application/use-cases/BroadcastMessage';

const listUC = new ManageLists();
const groupUC = new ManageGroups(groupRepo, listRepo);

const router = Router();

// ── WhatsApp Status & Connection ───────────────────────────────────────────

router.get('/wpp/status', (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    const session = getOrCreateSession(userId);
    res.json({
        connected: session.isConnected,
        authenticating: session.isAuthenticating,
        qr: session.qr,
        qrGeneratedAt: session.qrGeneratedAt,
        pairingCode: session.pairingCode,
    });
});

router.post('/wpp/connect', (req: AuthRequest, res: Response) => {
    const userId = req.userId!;
    getOrCreateSession(userId); // lazy-init
    res.json({ message: 'Connecting...' });
});

router.post('/wpp/disconnect', async (req: AuthRequest, res: Response) => {
    await destroySession(req.userId!);
    res.json({ message: 'Disconnected and session cleared.' });
});

router.post('/wpp/request-pairing-code', async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const session = getOrCreateSession(userId);
    if (session.isConnected) { res.status(400).json({ error: 'Already connected' }); return; }

    // requestPairingCode() only works after the 'qr' event has fired at least once,
    // because that's when WhatsApp Web finishes loading and sets up window.onCodeReceivedEvent.
    if (!session.qr) {
        res.status(503).json({ error: 'WhatsApp Web is still loading. Wait for the QR to appear and try again.' });
        return;
    }

    const { phone } = req.body;
    if (!phone) { res.status(400).json({ error: 'phone is required' }); return; }
    const normalized = String(phone).replace(/\D/g, '');
    try {
        const pupPage = (session.client as any).pupPage;

        // whatsapp-web.js only exposes window.onCodeReceivedEvent when the client is
        // initialized with pairWithPhoneNumber option. Since we use QR-first init,
        // we must inject the function manually before calling requestPairingCode().
        await pupPage.evaluate(() => {
            if (typeof (window as any).onCodeReceivedEvent === 'undefined') {
                (window as any).onCodeReceivedEvent = (code: string) => code;
            }
        });

        const code = await session.client.requestPairingCode(normalized);
        session.pairingCode = code;
        res.json({ code });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/wpp/groups', async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const session = getOrCreateSession(userId);
    if (!session.isConnected) { res.status(400).json({ error: 'WhatsApp not connected' }); return; }
    try {
        const forceRefresh = req.query.refresh === 'true';
        const groups = await session.gateway.fetchGroups(forceRefresh);
        res.json(groups);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ── Lists ──────────────────────────────────────────────────────────────────

router.get('/lists', (req: AuthRequest, res: Response) => {
    res.json(listUC.getAll(req.userId!));
});

router.post('/lists', (req: AuthRequest, res: Response): void => {
    try {
        const { name } = req.body;
        if (!name) { res.status(400).json({ error: 'Name is required' }); return; }
        res.json(listUC.create(req.userId!, name));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.put('/lists/:id', (req: AuthRequest, res: Response) => {
    try {
        res.json(listUC.rename(String(req.params.id), req.body.name));
    } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.delete('/lists/:id', (req: AuthRequest, res: Response) => {
    try {
        listUC.remove(String(req.params.id));
        res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ── Groups in lists ────────────────────────────────────────────────────────

router.get('/lists/:id/groups', (req: AuthRequest, res: Response) => {
    try { res.json(groupUC.forList(String(req.params.id))); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.post('/lists/:id/groups', (req: AuthRequest, res: Response) => {
    try {
        const { wppId, name } = req.body;
        groupUC.add(String(req.params.id), wppId, name || '');
        res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.delete('/groups/:id', (req: AuthRequest, res: Response) => {
    try {
        groupUC.remove(String(req.params.id));
        res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ── Broadcast ──────────────────────────────────────────────────────────────

router.post('/broadcast', async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const session = getOrCreateSession(userId);
    if (!session.isConnected) { res.status(400).json({ error: 'WhatsApp not connected' }); return; }
    try {
        const { listId, message } = req.body;
        const broadcastUC = new BroadcastMessage(session.gateway);
        const result = await broadcastUC.execute({ userId, listId, content: message, sentBy: 'Web UI' });
        res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── History ────────────────────────────────────────────────────────────────

router.get('/history', (req: AuthRequest, res: Response) => {
    res.json(messageRepo.getHistory(req.userId!));
});

export { router as apiRouter };
