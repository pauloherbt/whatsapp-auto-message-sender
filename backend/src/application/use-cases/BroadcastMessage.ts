import WhatsAppWebJsGateway from '../../infrastructure/messaging/WhatsAppWebJsGateway';
import listRepo from '../../infrastructure/persistence/SqliteListRepository';
import groupRepo from '../../infrastructure/persistence/SqliteGroupRepository';
import messageRepo from '../../infrastructure/persistence/SqliteMessageRepository';

interface BroadcastOptions {
    userId: number;
    listId: number | string;
    content: string;
    sentBy: string;
}

class BroadcastMessage {
    private messaging: WhatsAppWebJsGateway;

    constructor(messagingGateway: WhatsAppWebJsGateway) {
        this.messaging = messagingGateway;
    }

    async execute({ userId, listId, content, sentBy }: BroadcastOptions) {
        const list = listRepo.getById(listId);
        if (!list) throw new Error('Lista não encontrada.');

        const groups = groupRepo.forList(listId);
        if (groups.length === 0) throw new Error('Esta lista não tem grupos cadastrados.');

        let successCount = 0;
        const total = groups.length;

        for (const group of groups) {
            try {
                await this.messaging.sendText(group.wpp_group_id, content);
                successCount++;
            } catch (err: any) {
                console.error(`[Broadcast] Failed to send to group ${group.wpp_group_id}:`, err.message);
            }
        }

        messageRepo.log(userId, list.id, list.name, content, sentBy, total, successCount);
        return { total, success: successCount };
    }
}

export default BroadcastMessage;
