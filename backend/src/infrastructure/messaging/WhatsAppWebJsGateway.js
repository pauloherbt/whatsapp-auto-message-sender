'use strict';

class WhatsAppWebJsGateway {
    constructor(client) {
        this.client = client;
    }

    async sendText(to, text) {
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
        } catch (err) {
            console.error(`[whatsapp-web] Error sending to ${target}:`, err.message);
            throw err;
        }
    }

    async fetchGroups() {
        try {
            console.log(`[whatsapp-web] Fetching groups...`);

            const chatsPromise = this.client.getChats();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout fetching chats from WhatsApp')), 15000)
            );

            const chats = await Promise.race([chatsPromise, timeoutPromise]);
            const groups = chats.filter(chat => chat.isGroup);

            // Format to match old evolution response somewhat:
            // { id, subject }
            return groups.map(g => ({
                id: g.id._serialized,
                subject: g.name
            }));
        } catch (err) {
            console.error(`[whatsapp-web] Error fetching groups:`, err.message);
            throw err;
        }
    }
}

module.exports = WhatsAppWebJsGateway;
