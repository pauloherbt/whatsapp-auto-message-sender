'use strict';

const db = require('./SqliteDatabase');

class SqliteMessageRepository {
    constructor() {
        this.logStmt = db.prepare(`
          INSERT INTO messages (list_id, list_name, content, sent_by, total_groups, success)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        this.historyStmt = db.prepare('SELECT * FROM messages ORDER BY sent_at DESC LIMIT 5');
    }

    log(listId, listName, content, sentBy, totalGroups, success) {
        const result = this.logStmt.run(listId, listName, content, sentBy, totalGroups, success);
        return { id: result.lastInsertRowid };
    }

    getHistory() {
        return this.historyStmt.all();
    }
}

module.exports = new SqliteMessageRepository();
