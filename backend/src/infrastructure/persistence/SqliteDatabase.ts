import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

class SqliteDatabase {
  public db: Database.Database;

  constructor() {
    const dbPath = path.join(process.cwd(), 'data', 'bot.db');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this._initSchema();
  }

  private _initSchema() {
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

  prepare(sql: string): Database.Statement {
    return this.db.prepare(sql);
  }

  exec(sql: string): Database.Database {
    return this.db.exec(sql);
  }
}

// Singleton for easy access
export default new SqliteDatabase();
