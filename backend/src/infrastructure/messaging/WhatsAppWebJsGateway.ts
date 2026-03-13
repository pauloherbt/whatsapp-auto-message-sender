import type { Client } from 'whatsapp-web.js';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

class WhatsAppWebJsGateway {
    private client: Client;
    private groupsCache: { data: any[]; fetchedAt: number } | null = null;

    constructor(client: Client) {
        this.client = client;
    }

    async sendText(to: string, text: string) {
        let target = to;
        // whatsapp-web.js usually expects numbers or groups without "@s.whatsapp.net" or with it?
        // the library uses "number@c.us" or "number@g.us".
        // Often full JIDs look like 123456789@c.us
        // Let's ensure the format is correct based on whether it's a group or dm.

        try {
            console.log(`[whatsapp-web] Sending to ${target}: "${text.substring(0, 30)}..."`);
            // We can just use client.sendMessage
            const chat = await this.client.sendMessage(target, text);
            return chat;
        } catch (err: any) {
            console.error(`[whatsapp-web] Error sending to ${target}:`, err.message);
            throw err;
        }
    }

    invalidateCache() {
        this.groupsCache = null;
    }

    async fetchGroups(forceRefresh = false) {
        const now = Date.now();
        const isCacheValid = !forceRefresh &&
            this.groupsCache !== null &&
            (now - this.groupsCache.fetchedAt) < CACHE_TTL_MS;

        if (isCacheValid) {
            console.log(`[whatsapp-web] Returning cached groups (age: ${Math.round((now - this.groupsCache!.fetchedAt) / 1000)}s)`);
            return this.groupsCache!.data;
        }

        try {
            console.log(`[whatsapp-web] Fetching groups from WhatsApp...`);

            const chats = await this.client.getChats();

            const groups = chats.filter((chat: any) => chat.isGroup);

            // Format to match old evolution response somewhat:
            // { id, subject }
            const result = groups.map((g: any) => ({
                id: g.id._serialized,
                subject: g.name
            }));

            this.groupsCache = { data: result, fetchedAt: Date.now() };
            console.log(`[whatsapp-web] Fetched and cached ${result.length} groups.`);
            return result;
        } catch (err: any) {
            console.error(`[whatsapp-web] Error fetching groups:`, err.message);
            throw err;
        }
    }
}

export default WhatsAppWebJsGateway;

