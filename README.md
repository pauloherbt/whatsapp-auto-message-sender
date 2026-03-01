# 📱 WhatsApp Group Manager Bot

Bot que gerencia envio de mensagens para grupos do WhatsApp, controlado **por uma interface web**.

**Stack:** Node.js + React.js (Vite) + whatsapp-web.js + SQLite | **Custo:** Gratuito (self-hosted)

---

## 📋 Pré-requisitos

- Node.js 18+
- Um número WhatsApp dedicado para o bot (chip separado ou eSIM)

---

## 🚀 Instalação e Execução

O projeto agora é dividido em duas partes: **backend** (API e Bot do WhatsApp) e **frontend** (Interface web de gerenciamento).

### 1. Clonando o repositório

```bash
git clone <url-do-repo>
cd wpp-group-manager
```

### 2. Configurando e iniciando o Backend

O backend é responsável por conectar ao WhatsApp, gerenciar a sessão e fornecer uma API para o frontend.

```bash
cd backend
cp .env.example .env
```

Edite o `backend/.env` caso queira especificar o número do administrador:

```env
ADMIN_NUMBER=5511999999999 # seu número (ddd + número, sem +)
```

Instale as dependências e inicie o backend em modo de desenvolvimento:

```bash
npm install
npm run dev
```

> **Atenção:** Na primeira execução, o `whatsapp-web.js` irá gerar um QR Code no console do backend. Escaneie este QR Code com o aplicativo do WhatsApp no celular que servirá como bot (Dispositivos conectados → Conectar dispositivo).

### 3. Configurando e iniciando o Frontend

Em outro terminal, inicie a interface administrativa:

```bash
cd frontend
npm install
npm run dev
```

Acesse o painel web no seu navegador através do endereço exibido no terminal (geralmente `http://localhost:5173`).

---

## 📁 Estrutura do Projeto

```
wpp-group-manager/
├── backend/               # API Express + whatsapp-web.js
│   ├── .env.example       # Template de configuração
│   ├── src/
│   │   ├── index.js       # Entry point do backend
│   │   ├── application/   # (Services, Bot Logic, etc)
│   │   ├── domain/        # (Models, Entities)
│   │   └── infrastructure/# (Database SQLite, Repositories, Express Routers)
│   └── data/              # Banco SQLite (gerado automaticamente)
│
└── frontend/              # Interface Web Administrativa (React/Vite)
    ├── src/
    │   ├── components/    # Componentes UI (shadcn/ui, tailwind)
    │   ├── App.jsx        # Ponto de entrada das rotas e interface
    │   └── main.jsx
    └── public/
```

---

## 🏠 Hospedagem Recomendada

O backend possui um `fly.toml` configurado para rodar gratuitamente (ou com custos baixíssimos) na [Fly.io](https://fly.io), utilizando volumes persistentes para manter o banco de dados e a sessão do WhatsApp ativos.

Para publicar o backend na Fly.io:
1. Instale o CLI do Fly.io (`flyctl`)
2. `fly auth login`
3. Entre na pasta `backend/` e rode `fly deploy`

O frontend pode ser publicado em plataformas gratuitas de hospedagem estática como Vercel, Netlify ou Cloudflare Pages, apontando o diretório `frontend/` e utilizando o comando de build `npm run build`.

---

## ⚠️ Notas importantes

- **Limites do WhatsApp**: Tenha cuidado ao enviar mensagens em massa para não sofrer bloqueio (banimento). O ideal é utilizar intervalos de segurança (rate limiting) entre os envios.
- **Sessão**: Após ler o QR code, o `whatsapp-web.js` salva os dados da sessão na pasta `backend/.wwebjs_auth/`. Em um novo deploy, a menos que haja um volume configurado (como definido no `fly.toml`), será necessário reler o QR code.
