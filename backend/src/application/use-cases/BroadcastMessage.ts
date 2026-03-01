import WhatsAppWebJsGateway from '../../infrastructure/messaging/WhatsAppWebJsGateway';
import listRepo from '../../infrastructure/persistence/SqliteListRepository';
import groupRepo from '../../infrastructure/persistence/SqliteGroupRepository';
import messageRepo from '../../infrastructure/persistence/SqliteMessageRepository';

interface BroadcastOptions {
    listId: number | string;
    content: string;
    sentBy: string;
}

class BroadcastMessage {
    private messaging: WhatsAppWebJsGateway;
    private listRepo: typeof listRepo;
    private groupRepo: typeof groupRepo;
    private messageRepo: typeof messageRepo;

    constructor(
        messagingGateway: WhatsAppWebJsGateway,
        lRepo: typeof listRepo,
        gRepo: typeof groupRepo,
        mRepo: typeof messageRepo
    ) {
        this.messaging = messagingGateway;
        this.listRepo = lRepo;
        this.groupRepo = gRepo;
        this.messageRepo = mRepo;
    }

    async execute({ listId, content, sentBy }: BroadcastOptions) {
        const list = this.listRepo.getById(listId);
        if (!list) throw new Error('Lista não encontrada.');

        const groups = this.groupRepo.forList(listId);
        if (groups.length === 0) throw new Error('Esta lista não tem grupos cadastrados.');

        let successCount = 0;
        const total = groups.length;

        for (const group of groups) {
            try {
                // We send to the group JID (starts with 55...-...)
                await this.messaging.sendText(group.wpp_group_id, content);
                successCount++;
            } catch (err: any) {
                console.error(`[Broadcast] Failed to send to group ${group.wpp_group_id}:`, err.message);
            }
        }

        // Log the result
        this.messageRepo.log(list.id, list.name, content, sentBy, total, successCount);

        return { total, success: successCount };
    }
}

export default BroadcastMessage;
