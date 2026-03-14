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
        try {
            console.log(`[whatsapp-web] Sending to ${target}: "${text.substring(0, 30)}..."`);
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

        console.log(`[whatsapp-web] Fetching groups from WhatsApp...`);

        try {
            // Fast path: access WhatsApp Web's in-memory Store directly inside Chromium.
            // This filters groups BEFORE serialisation to Node.js, avoiding the full
            // getChats() round-trip which serialises every single chat.
            const page = (this.client as any).pupPage;
            const result: { id: string; subject: string }[] = await page.evaluate(() => {
                const store = (window as any).Store;
                if (!store?.Chat) return null; // Store not ready yet

                const allChats = store.Chat.getModelsArray();
                // Groups always have JIDs ending in @g.us — isGroup is a class getter
                // not available on the raw Store model, so we filter by JID server instead.
                const groups = allChats.filter((chat: any) => chat.id?.server === 'g.us');

                return groups.map((chat: any) => ({
                    id: chat.id._serialized,
                    subject: chat.name || chat.formattedTitle || ''
                }));
            });

            if (result !== null) {
                this.groupsCache = { data: result, fetchedAt: Date.now() };
                console.log(`[whatsapp-web] Fetched and cached ${result.length} groups (via Store).`);
                return result;
            }

            // Fallback: Store not available yet, use the regular API
            console.log(`[whatsapp-web] Store not ready, falling back to getChats()...`);
            const chats = await this.client.getChats();
            const groups = chats.filter((chat: any) => chat.isGroup);
            const fallbackResult = groups.map((g: any) => ({
                id: g.id._serialized,
                subject: g.name
            }));

            this.groupsCache = { data: fallbackResult, fetchedAt: Date.now() };
            console.log(`[whatsapp-web] Fetched and cached ${fallbackResult.length} groups (via getChats fallback).`);
            return fallbackResult;

        } catch (err: any) {
            console.error(`[whatsapp-web] Error fetching groups:`, err.message);
            throw err;
        }
    }
}

export default WhatsAppWebJsGateway;


