'use strict';

const db = require('./SqliteDatabase');

class SqliteGroupRepository {
    constructor() {
        this.addStmt = db.prepare('INSERT INTO groups (list_id, wpp_group_id, name) VALUES (?, ?, ?)');
        this.forListStmt = db.prepare('SELECT * FROM groups WHERE list_id = ? ORDER BY name');
        this.getByWppStmt = db.prepare('SELECT * FROM groups WHERE wpp_group_id = ?');
        this.removeStmt = db.prepare('DELETE FROM groups WHERE id = ?');
    }

    add(listId, wppGroupId, name = '') {
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
        return this.removeStmt.run(id);
    }
}

module.exports = new SqliteGroupRepository();
