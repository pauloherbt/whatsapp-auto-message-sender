'use strict';

const db = require('./SqliteDatabase');

class SqliteListRepository {
    constructor() {
        this.createStmt = db.prepare('INSERT INTO lists (name) VALUES (?)');
        this.getAllStmt = db.prepare('SELECT * FROM lists ORDER BY name');
        this.getByIdStmt = db.prepare('SELECT * FROM lists WHERE id = ?');
        this.getByNameStmt = db.prepare('SELECT * FROM lists WHERE lower(name) = lower(?)');
        this.updateStmt = db.prepare('UPDATE lists SET name = ? WHERE id = ?');
        this.deleteStmt = db.prepare('DELETE FROM lists WHERE id = ?');
    }

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
        return this.deleteStmt.run(id);
    }
}

module.exports = new SqliteListRepository();
