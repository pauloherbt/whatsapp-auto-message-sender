'use strict';

/**
 * Setup script — run once to:
 *  1. Create the Evolution API instance
 *  2. Display the QR code to scan with WhatsApp
 *  3. Configure the webhook URL
 *
 * Usage: node scripts/setup.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const axios = require('axios');
const readline = require('readline');

const BASE_URL = process.env.EVOLUTION_API_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE = process.env.EVOLUTION_INSTANCE;
const WEBHOOK = process.env.BOT_WEBHOOK_URL;

const client = axios.create({
    baseURL: `${BASE_URL}/`,
    headers: { apikey: API_KEY },
});

function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans); }));
}

async function main() {
    console.log('\n🚀 Setup — WhatsApp Group Manager\n');
    console.log(`Evolution API: ${BASE_URL}`);
    console.log(`Instance name: ${INSTANCE}`);
    console.log(`Webhook URL:   ${WEBHOOK}\n`);

    // 1. Create instance
    console.log('1️⃣  Creating instance...');
    try {
        const res = await client.post('instance/create', {
            instanceName: INSTANCE,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
        });
        console.log(`   ✅ Instance created: ${res.data?.instance?.instanceName ?? INSTANCE}`);
    } catch (err) {
        if (err.response?.status === 409 || err.response?.data?.error?.includes('already')) {
            console.log('   ℹ️  Instance already exists, skipping creation.');
        } else {
            console.error('   ❌ Error creating instance:', err.response?.data ?? err.message);
            process.exit(1);
        }
    }

    // 2. Set webhook
    console.log('\n2️⃣  Configuring webhook...');
    try {
        await client.post(`webhook/set/${INSTANCE}`, {
            url: WEBHOOK,
            webhook_by_events: false,
            webhook_base64: false,
            events: [
                'MESSAGES_UPSERT',
                'CONNECTION_UPDATE',
            ],
        });
        console.log(`   ✅ Webhook set to: ${WEBHOOK}`);
    } catch (err) {
        console.error('   ❌ Error setting webhook:', err.response?.data ?? err.message);
    }

    // 3. Get QR code
    console.log('\n3️⃣  Fetching QR code...');
    let attempts = 0;
    while (attempts < 5) {
        try {
            const res = await client.get(`instance/connect/${INSTANCE}`);
            const qrcode = res.data?.qrcode;
            if (qrcode?.base64) {
                console.log('\n📱 QR Code gerado!');
                console.log('   Abra o WhatsApp no celular do bot → Dispositivos conectados → Conectar dispositivo');
                console.log('   Escaneie o QR code que aparece no arquivo qrcode.txt ou via manager:\n');
                // Save base64 for reference
                const fs = require('fs');
                const imagePath = require('path').join(__dirname, '..', 'qrcode_temp.txt');
                fs.writeFileSync(imagePath, qrcode.base64);
                console.log(`   QR Code (base64) salvo em: qrcode_temp.txt`);
                console.log(`\n   Ou acesse o manager do Evolution API: ${BASE_URL}/manager\n`);
                break;
            } else if (res.data?.instance?.state === 'open') {
                console.log('\n   ✅ WhatsApp já está conectado!');
                break;
            }
        } catch (err) {
            // ignore, retry
        }
        attempts++;
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log('\n✅ Setup concluído!');
    console.log('   Agora rode: npm start\n');
}

main().catch(console.error);
