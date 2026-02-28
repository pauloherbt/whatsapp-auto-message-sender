'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class SqliteDatabase {
    constructor() {
        const dbPath = path.join(process.cwd(), 'data', 'bot.db');
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });

        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');

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
}

// Singleton for easy access if needed, but better injected in DDD.
module.exports = new SqliteDatabase();
