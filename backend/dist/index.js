"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var import_dotenv = __toESM(require("dotenv"));
var import_path2 = __toESM(require("path"));
var import_whatsapp_web = require("whatsapp-web.js");
var import_express2 = __toESM(require("express"));
var import_cors = __toESM(require("cors"));
var import_fs2 = __toESM(require("fs"));

// src/infrastructure/messaging/WhatsAppWebJsGateway.ts
var WhatsAppWebJsGateway = class {
  client;
  constructor(client2) {
    this.client = client2;
  }
  async sendText(to, text) {
    let target = to;
    try {
      console.log(`[whatsapp-web] Sending to ${target}: "${text.substring(0, 30)}..."`);
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
      const timeoutPromise = new Promise(
        (_, reject) => setTimeout(() => reject(new Error("Timeout fetching chats from WhatsApp")), 15e3)
      );
      const chats = await Promise.race([chatsPromise, timeoutPromise]);
      const groups = chats.filter((chat) => chat.isGroup);
      return groups.map((g) => ({
        id: g.id._serialized,
        subject: g.name
      }));
    } catch (err) {
      console.error(`[whatsapp-web] Error fetching groups:`, err.message);
      throw err;
    }
  }
};
var WhatsAppWebJsGateway_default = WhatsAppWebJsGateway;

// src/infrastructure/persistence/SqliteDatabase.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"));
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var SqliteDatabase = class {
  db;
  constructor() {
    const dbPath = import_path.default.join(process.cwd(), "data", "bot.db");
    import_fs.default.mkdirSync(import_path.default.dirname(dbPath), { recursive: true });
    this.db = new import_better_sqlite3.default(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this._initSchema();
  }
  _initSchema() {
    this.db.exec(`
          CREATE TABLE IF NOT EXISTS lists (
            id   INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT    NOT NULL UNIQUE
          );
        
          CREATE TABLE IF NOT EXISTS groups (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            list_id      INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
            wpp_group_id TEXT    NOT NULL,
            name         TEXT    NOT NULL DEFAULT '',
            added_at     TEXT    NOT NULL DEFAULT (datetime('now'))
          );
        
          CREATE TABLE IF NOT EXISTS messages (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            list_id      INTEGER REFERENCES lists(id) ON DELETE SET NULL,
            list_name    TEXT    NOT NULL DEFAULT '',
            content      TEXT    NOT NULL,
            sent_at      TEXT    NOT NULL DEFAULT (datetime('now')),
            sent_by      TEXT    NOT NULL DEFAULT '',
            total_groups INTEGER NOT NULL DEFAULT 0,
            success      INTEGER NOT NULL DEFAULT 0
          );
        `);
  }
  prepare(sql) {
    return this.db.prepare(sql);
  }
  exec(sql) {
    return this.db.exec(sql);
  }
};
var SqliteDatabase_default = new SqliteDatabase();

// src/infrastructure/persistence/SqliteListRepository.ts
var SqliteListRepository = class {
  createStmt = SqliteDatabase_default.prepare("INSERT INTO lists (name) VALUES (?)");
  getAllStmt = SqliteDatabase_default.prepare("SELECT * FROM lists ORDER BY name");
  getByIdStmt = SqliteDatabase_default.prepare("SELECT * FROM lists WHERE id = ?");
  getByNameStmt = SqliteDatabase_default.prepare("SELECT * FROM lists WHERE lower(name) = lower(?)");
  updateStmt = SqliteDatabase_default.prepare("UPDATE lists SET name = ? WHERE id = ?");
  deleteStmt = SqliteDatabase_default.prepare("DELETE FROM lists WHERE id = ?");
  create(name) {
    const result = this.createStmt.run(name);
    return { id: result.lastInsertRowid, name };
  }
  update(id, name) {
    this.updateStmt.run(name, id);
    return { id, name };
  }
  getAll() {
    return this.getAllStmt.all();
  }
  getById(id) {
    return this.getByIdStmt.get(id);
  }
  getByName(name) {
    return this.getByNameStmt.get(name);
  }
  delete(id) {
    this.deleteStmt.run(id);
  }
};
var SqliteListRepository_default = new SqliteListRepository();

// src/infrastructure/persistence/SqliteGroupRepository.ts
var SqliteGroupRepository = class {
  addStmt = SqliteDatabase_default.prepare("INSERT INTO groups (list_id, wpp_group_id, name) VALUES (?, ?, ?)");
  forListStmt = SqliteDatabase_default.prepare("SELECT * FROM groups WHERE list_id = ? ORDER BY name");
  getByWppStmt = SqliteDatabase_default.prepare("SELECT * FROM groups WHERE wpp_group_id = ?");
  removeStmt = SqliteDatabase_default.prepare("DELETE FROM groups WHERE id = ?");
  add(listId, wppGroupId, name = "") {
    const result = this.addStmt.run(listId, wppGroupId, name);
    return { id: result.lastInsertRowid, listId, wppGroupId, name };
  }
  forList(listId) {
    return this.forListStmt.all(listId);
  }
  getByWpp(wppGroupId) {
    return this.getByWppStmt.get(wppGroupId);
  }
  remove(id) {
    this.removeStmt.run(id);
  }
};
var SqliteGroupRepository_default = new SqliteGroupRepository();

// src/infrastructure/persistence/SqliteMessageRepository.ts
var SqliteMessageRepository = class {
  logStmt = SqliteDatabase_default.prepare(`
        INSERT INTO messages (list_id, list_name, content, sent_by, total_groups, success)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
  historyStmt = SqliteDatabase_default.prepare("SELECT * FROM messages ORDER BY sent_at DESC LIMIT 5");
  log(listId, listName, content, sentBy, totalGroups, success) {
    const result = this.logStmt.run(listId, listName, content, sentBy, totalGroups, success);
    return { id: result.lastInsertRowid };
  }
  getHistory() {
    return this.historyStmt.all();
  }
};
var SqliteMessageRepository_default = new SqliteMessageRepository();

// src/application/use-cases/ManageLists.ts
var ManageLists = class {
  repositories;
  constructor(repo) {
    this.repositories = { lists: repo };
  }
  create(name) {
    const existing = this.repositories.lists.getByName(name);
    if (existing) throw new Error(`Lista "${name}" j\xE1 existe.`);
    return this.repositories.lists.create(name);
  }
  getAll() {
    return this.repositories.lists.getAll();
  }
  getById(id) {
    return this.repositories.lists.getById(id);
  }
  rename(id, newName) {
    const existing = this.repositories.lists.getById(id);
    if (!existing) throw new Error(`Lista ID ${id} n\xE3o encontrada para edi\xE7\xE3o.`);
    const existingName = this.repositories.lists.getByName(newName);
    if (existingName && existingName.id !== id) throw new Error(`J\xE1 existe outra lista chamada "${newName}".`);
    return this.repositories.lists.update(id, newName);
  }
  remove(id) {
    const existing = this.repositories.lists.getById(id);
    if (!existing) throw new Error(`Lista ID ${id} n\xE3o encontrada para exclus\xE3o.`);
    return this.repositories.lists.delete(id);
  }
};
var ManageLists_default = ManageLists;

// src/application/use-cases/ManageGroups.ts
var ManageGroups = class {
  groupRepo;
  listRepo;
  constructor(gRepo, lRepo) {
    this.groupRepo = gRepo;
    this.listRepo = lRepo;
  }
  add(listId, wppGroupId, name = "") {
    const list = this.listRepo.getById(listId);
    if (!list) throw new Error(`Lista ID ${listId} n\xE3o encontrada.`);
    return this.groupRepo.add(listId, wppGroupId, name);
  }
  forList(listId) {
    return this.groupRepo.forList(listId);
  }
  remove(id) {
    return this.groupRepo.remove(id);
  }
};
var ManageGroups_default = ManageGroups;

// src/application/use-cases/BroadcastMessage.ts
var BroadcastMessage = class {
  messaging;
  listRepo;
  groupRepo;
  messageRepo;
  constructor(messagingGateway2, lRepo, gRepo, mRepo) {
    this.messaging = messagingGateway2;
    this.listRepo = lRepo;
    this.groupRepo = gRepo;
    this.messageRepo = mRepo;
  }
  async execute({ listId, content, sentBy }) {
    const list = this.listRepo.getById(listId);
    if (!list) throw new Error("Lista n\xE3o encontrada.");
    const groups = this.groupRepo.forList(listId);
    if (groups.length === 0) throw new Error("Esta lista n\xE3o tem grupos cadastrados.");
    let successCount = 0;
    const total = groups.length;
    for (const group of groups) {
      try {
        await this.messaging.sendText(group.wpp_group_id, content);
        successCount++;
      } catch (err) {
        console.error(`[Broadcast] Failed to send to group ${group.wpp_group_id}:`, err.message);
      }
    }
    this.messageRepo.log(list.id, list.name, content, sentBy, total, successCount);
    return { total, success: successCount };
  }
};
var BroadcastMessage_default = BroadcastMessage;

// src/infrastructure/web/routes/api.ts
var import_express = require("express");
function createApiRouter(getConnectionStatus, messagingGateway2, listUC2, groupUC2, broadcastUC2, messageRepo) {
  const router = (0, import_express.Router)();
  router.get("/whatsapp-groups", async (req, res) => {
    if (!getConnectionStatus()) {
      res.status(400).json({ error: "Client not connected" });
      return;
    }
    try {
      const groups = await messagingGateway2.fetchGroups();
      res.json(groups);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get("/lists", (req, res) => {
    res.json(listUC2.getAll());
  });
  router.post("/lists", (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: "Name is required" });
        return;
      }
      res.json(listUC2.create(name));
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  router.put("/lists/:id", (req, res) => {
    try {
      const { name } = req.body;
      res.json(listUC2.rename(req.params.id, name));
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  router.delete("/lists/:id", (req, res) => {
    try {
      listUC2.remove(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  router.get("/lists/:id/groups", (req, res) => {
    try {
      res.json(groupUC2.forList(req.params.id));
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  router.post("/lists/:id/groups", (req, res) => {
    try {
      const { wppId, name } = req.body;
      groupUC2.add(req.params.id, wppId, name || "");
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  router.delete("/groups/:id", (req, res) => {
    try {
      groupUC2.remove(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  router.post("/broadcast", async (req, res) => {
    if (!getConnectionStatus()) {
      res.status(400).json({ error: "Client not connected" });
      return;
    }
    try {
      const { listId, message } = req.body;
      const result = await broadcastUC2.execute({ listId, content: message, sentBy: "Web UI" });
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  router.get("/history", (req, res) => {
    res.json(messageRepo.getHistory());
  });
  return router;
}

// src/index.ts
import_dotenv.default.config();
var listUC = new ManageLists_default(SqliteListRepository_default);
var groupUC = new ManageGroups_default(SqliteGroupRepository_default, SqliteListRepository_default);
var app = (0, import_express2.default)();
app.use(import_express2.default.json());
app.use((0, import_cors.default)());
var latestQR = null;
var isConnected = false;
var isAuthenticating = false;
var port = process.env.PORT || 8080;
app.get("/", (req, res) => {
  res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>WPP Recovery Dashboard</title></head>
        <body style="font-family: sans-serif; padding: 20px; text-align: center;">
            <h1>WPP Group Manager API</h1>
            <div style="background: #f0f0f0; padding: 15px; border-radius: 10px; display: inline-block; text-align: left;">
                <p><strong>Status:</strong> Running</p>
                <p><strong>WhatsApp:</strong> ${isConnected ? "\u2705 Connected" : "\u274C Disconnected"}</p>
                <p><strong>Auth State:</strong> ${isAuthenticating ? "\u23F3 Authenticating..." : "Idle"}</p>
                <p><strong>QR available:</strong> ${latestQR ? "\u2705 Yes" : "\u274C No"}</p>
            </div>
            <hr style="margin: 20px 0;">
            <form action="/api/reset-session" method="POST" onsubmit="return confirm('ATEN\xC7\xC3O: Isso vai apagar todo o login do WhatsApp. Tem certeza?')">
                <button type="submit" style="background:red; color:white; padding:15px; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">
                    DANGER: Reset WhatsApp Session & Data
                </button>
            </form>
            <p style="color: gray; font-size: 0.8em; margin-top: 20px;">Use este bot\xE3o se o QR Code travar ou se o WhatsApp deslogar sozinho.</p>
        </body>
        </html>
    `);
});
app.post("/api/reset-session", (req, res) => {
  console.log("[danger] Manual Session Reset Triggered");
  try {
    const authPath = import_path2.default.join(process.cwd(), "data", "auth");
    if (import_fs2.default.existsSync(authPath)) {
      import_fs2.default.rmSync(authPath, { recursive: true, force: true });
      console.log("[danger] Session folder deleted.");
    }
    res.send("Session deleted. The app will restart now.");
    setTimeout(() => process.exit(1), 1e3);
  } catch (err) {
    res.status(500).send("Error resetting session: " + err.message);
  }
});
app.get("/api/status", (req, res) => {
  res.json({
    connected: isConnected,
    authenticating: isAuthenticating,
    qr: latestQR
  });
});
app.listen(port, () => {
  console.log(`\u{1F680} Backend API running on port ${port}`);
});
process.on("unhandledRejection", (reason, p) => {
  console.error("[process] Unhandled Rejection at:", p, "reason:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[process] Uncaught Exception:", err);
});
var puppeteerOptions = {
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-accelerated-2d-canvas",
    "--no-first-run",
    "--disable-gpu",
    "--disable-extensions",
    "--no-default-browser-check",
    "--ignore-certificate-errors",
    "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  ]
};
if (process.env.PUPPETEER_EXECUTABLE_PATH) {
  puppeteerOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
}
var client = new import_whatsapp_web.Client({
  authStrategy: new import_whatsapp_web.LocalAuth({
    dataPath: import_path2.default.join(process.cwd(), "data", "auth")
  }),
  authTimeoutMs: 18e4,
  // Increase to 3 minutes
  webVersion: "2.3000.1015901307",
  webVersionCache: {
    type: "remote",
    remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1015901307-alt.html"
  },
  puppeteer: puppeteerOptions
});
var messagingGateway = new WhatsAppWebJsGateway_default(client);
var broadcastUC = new BroadcastMessage_default(messagingGateway, SqliteListRepository_default, SqliteGroupRepository_default, SqliteMessageRepository_default);
client.on("qr", (qr) => {
  const sanitizedQR = qr.startsWith("undefined,") ? qr.substring(10) : qr;
  console.log("[whatsapp-web] QR Code received! Ready to scan.");
  latestQR = sanitizedQR;
  isConnected = false;
  isAuthenticating = false;
});
client.on("loading_screen", (percent, message) => {
  console.log(`[whatsapp-web] Loading Screen: ${percent}% - ${message}`);
});
client.on("authenticated", () => {
  console.log(`\u2705 WhatsApp Authenticated! Handshake complete. Syncing data...`);
  latestQR = null;
  isAuthenticating = true;
  isConnected = false;
});
client.on("auth_failure", (msg) => {
  console.error(`\u274C Authentication Failure:`, msg);
  latestQR = null;
  isAuthenticating = false;
  isConnected = false;
});
client.on("ready", () => {
  console.log(`\u2705 WhatsApp Web Client Ready and Session Active!`);
  latestQR = null;
  isConnected = true;
  isAuthenticating = false;
});
client.on("disconnected", (reason) => {
  console.log(`\u274C WhatsApp Web Client Disconnected: ${reason}`);
  isConnected = false;
  isAuthenticating = false;
});
function cleanupLocks() {
  try {
    const lockPath = import_path2.default.join(process.cwd(), "data", "auth", "Default", "SingletonLock");
    if (import_fs2.default.existsSync(lockPath)) {
      console.log("[cleanup] Removing stale SingletonLock...");
      import_fs2.default.unlinkSync(lockPath);
    }
  } catch (err) {
  }
}
console.log("[whatsapp-web] Initializing...");
cleanupLocks();
client.initialize().catch((err) => console.error("[whatsapp-web] Fatal init error:", err));
var apiRoutes = createApiRouter(
  () => isConnected,
  // Expose connection checker callback
  messagingGateway,
  listUC,
  groupUC,
  broadcastUC,
  SqliteMessageRepository_default
);
app.use("/api", apiRoutes);
