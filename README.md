# 📱 WhatsApp Group Manager Bot

Bot que gerencia envio de mensagens para grupos do WhatsApp, controlado **pelo próprio WhatsApp como interface**.

**Stack:** Node.js + Evolution API v1 + SQLite | **Custo:** Gratuito (self-hosted)

---

## 📋 Pré-requisitos

- [Docker](https://docs.docker.com/engine/install/) + Docker Compose
- Node.js 18+
- Um número WhatsApp dedicado para o bot (chip separado ou eSIM)

---

## 🚀 Instalação

### 1. Clone e configure

```bash
git clone <url-do-repo>
cd wpp-group-manager
cp .env.example .env
```

Edite o `.env`:

```env
EVOLUTION_API_KEY=uma_senha_forte_aqui   # qualquer string — você define
EVOLUTION_INSTANCE=escola                # nome da instância (sem espaços)
ADMIN_NUMBER=5511999999999               # seu número (ddd + número, sem +)
BOT_WEBHOOK_URL=http://SEU_IP:3000/webhook
```

> **Sobre `BOT_WEBHOOK_URL`**: A Evolution API precisa alcançar seu bot.
> - **Rodando localmente**: use [ngrok](https://ngrok.com/) → `ngrok http 3000` → copie a URL HTTPS gerada
> - **Rodando em servidor**: use o IP/domínio público do servidor

### 2. Suba a Evolution API v1

```bash
docker compose up -d
```

Aguarde ~10s e verifique:

```bash
curl http://localhost:8080
```

### 3. Instale as dependências do bot

```bash
npm install
```

### 4. Execute o setup (primeira vez)

```bash
npm run setup
```

Isso vai:
- Criar a instância WhatsApp
- Configurar o webhook
- Gerar o QR code

**Abra** o WhatsApp no celular do bot → **Dispositivos conectados** → **Conectar dispositivo** → Escaneie o QR.

Ou acesse o manager visual: `http://localhost:8080/manager`

### 5. Inicie o bot

```bash
npm start
```

---

## 💬 Como usar (via WhatsApp)

O **administrador** (número configurado em `ADMIN_NUMBER`) envia mensagens para o número do bot.

### Menu principal

Envie `oi`, `menu` ou `inicio`:

```
👋 Olá! Bem-vindo ao Gestor de Grupos.

1️⃣ Enviar mensagem para uma lista de grupos
2️⃣ Ver listas e grupos cadastrados
3️⃣ Histórico de mensagens enviadas
```

### Fluxo de envio

```
Você: enviar
Bot: Escolha a lista (1. Turno Manhã / 2. Turno Tarde)
Você: 1
Bot: ✅ Lista: Turno Manhã (8 grupos). Envie a mensagem:
Você: Reunião de pais amanhã às 8h na quadra.
Bot: 📋 Resumo... Confirma? (s/n)
Você: s
Bot: 🎉 Enviado para 8/8 grupos!
```

---

## ⚙️ Comandos Admin

| Comando | Descrição |
|---|---|
| `!crialista Turno Manhã` | Cria uma nova lista de grupos |
| `!listasid` | Lista todas as listas (com seus IDs) |
| `!grupos` | Lista todos os grupos que o bot participa |
| `!addgrupo 1 120363xxx@g.us Nome do Grupo` | Adiciona grupo à lista |
| `!rmgrupo 3` | Remove um grupo pelo ID interno |

### Fluxo de cadastro inicial

```bash
# 1. Crie as listas
!crialista Turno Manhã
!crialista Turno Tarde

# 2. Veja os grupos disponíveis no WhatsApp
!grupos
# Bot retorna lista com IDs como: 120363xxxxxx@g.us

# 3. Veja as listas e seus IDs
!listasid

# 4. Adicione grupos às listas
!addgrupo 1 120363xxxxxx@g.us 1ºA Manhã
!addgrupo 1 120363yyyyyy@g.us 2ºA Manhã
!addgrupo 2 120363zzzzzz@g.us 1ºB Tarde
```

---

## 📁 Estrutura do Projeto

```
wpp-group-manager/
├── docker-compose.yml     # Evolution API v1 (file store, sem Postgres/Redis)
├── .env.example           # Template de configuração
├── src/
│   ├── index.js           # Entry point
│   ├── webhook.js         # Servidor Express (recebe eventos da Evolution API)
│   ├── bot.js             # Máquina de estados do bot
│   ├── sender.js          # Envio em massa com rate limiting
│   ├── evolution.js       # Cliente REST da Evolution API
│   └── db.js              # Banco SQLite (listas, grupos, histórico)
├── scripts/
│   └── setup.js           # Setup inicial (criar instância + QR code)
└── data/
    └── bot.db             # Banco SQLite (gerado automaticamente)
```

---

## 🏠 Onde hospedar gratuitamente

| Opção | RAM | Custo |
|---|---|---|
| Seu PC / notebook | Ilimitado | Grátis (elétrica) |
| Raspberry Pi | 1–4 GB | ~R$10/mês (elétrica) |
| **Oracle Cloud Free Tier** | 1 GB | **Grátis para sempre** |
| Fly.io | 256 MB | Grátis (pode ser limitado) |

> **Oracle Cloud** é a melhor opção de servidor gratuito permanente. Crie uma conta em cloud.oracle.com e use a instância AMD gratuita.

---

## ⚠️ Notas importantes

- **Rate limiting**: O bot espera 2.5s entre cada grupo para evitar bloqueios do WhatsApp
- **Grupos**: O bot precisa ser membro dos grupos para enviar mensagens
- **Sessão**: A sessão WhatsApp fica salva no volume Docker (`evolution_instances`). Não perde ao reiniciar o container.
