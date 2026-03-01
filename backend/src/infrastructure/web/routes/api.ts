import { Router, Request, Response } from 'express';

// Interfaces for dependency injection
interface MessagingGateway {
    fetchGroups(): Promise<any[]>;
}

interface ListUseCase {
    create(name: string): any;
    getAll(): any[];
    rename(id: string, name: string): any;
    remove(id: string): any;
}

interface GroupUseCase {
    forList(listId: string): any[];
    add(listId: string, wppId: string, name: string): any;
    remove(id: string): any;
}

interface BroadcastUseCase {
    execute(options: { listId: string, content: string, sentBy: string }): Promise<any>;
}

interface MessageRepository {
    getHistory(): any[];
}

export function createApiRouter(
    getConnectionStatus: () => boolean,
    messagingGateway: MessagingGateway,
    listUC: ListUseCase,
    groupUC: GroupUseCase,
    broadcastUC: BroadcastUseCase,
    messageRepo: MessageRepository
): Router {
    const router = Router();

    router.get('/whatsapp-groups', async (req: Request, res: Response): Promise<void> => {
        if (!getConnectionStatus()) { res.status(400).json({ error: 'Client not connected' }); return; }
        try {
            const groups = await messagingGateway.fetchGroups();
            res.json(groups);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    router.get('/lists', (req: Request, res: Response) => { res.json(listUC.getAll()); });

    router.post('/lists', (req: Request, res: Response): void => {
        try {
            const { name } = req.body;
            if (!name) { res.status(400).json({ error: 'Name is required' }); return; }
            res.json(listUC.create(name));
        } catch (e: any) { res.status(400).json({ error: e.message }); }
    });

    router.put('/lists/:id', (req: Request, res: Response) => {
        try {
            const { name } = req.body;
            res.json(listUC.rename(req.params.id as string, name));
        } catch (e: any) { res.status(400).json({ error: e.message }); }
    });

    router.delete('/lists/:id', (req: Request, res: Response) => {
        try {
            listUC.remove(req.params.id as string);
            res.json({ success: true });
        } catch (e: any) { res.status(400).json({ error: e.message }); }
    });

    router.get('/lists/:id/groups', (req: Request, res: Response) => {
        try { res.json(groupUC.forList(req.params.id as string)); }
        catch (e: any) { res.status(400).json({ error: e.message }); }
    });

    router.post('/lists/:id/groups', (req: Request, res: Response) => {
        try {
            const { wppId, name } = req.body;
            groupUC.add(req.params.id as string, wppId, name || '');
            res.json({ success: true });
        } catch (e: any) { res.status(400).json({ error: e.message }); }
    });

    router.delete('/groups/:id', (req: Request, res: Response) => {
        try {
            groupUC.remove(req.params.id as string);
            res.json({ success: true });
        } catch (e: any) { res.status(400).json({ error: e.message }); }
    });

    router.post('/broadcast', async (req: Request, res: Response): Promise<void> => {
        if (!getConnectionStatus()) { res.status(400).json({ error: 'Client not connected' }); return; }
        try {
            const { listId, message } = req.body;
            const result = await broadcastUC.execute({ listId, content: message, sentBy: 'Web UI' });
            res.json(result);
        } catch (e: any) { res.status(400).json({ error: e.message }); }
    });

    router.get('/history', (req: Request, res: Response) => { res.json(messageRepo.getHistory()); });

    return router;
}
