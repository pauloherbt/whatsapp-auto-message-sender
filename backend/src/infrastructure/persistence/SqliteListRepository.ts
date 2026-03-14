import db from './SqliteDatabase';

export interface SqliteListRecord {
    id: number;
    user_id: number;
    name: string;
}

class SqliteListRepository {
    create(userId: number, name: string): { id: number | bigint; name: string } {
        const result = db.prepare('INSERT INTO lists (user_id, name) VALUES (?, ?)').run(userId, name);
        return { id: result.lastInsertRowid, name };
    }

    update(id: number | string, name: string): { id: number | string; name: string } {
        db.prepare('UPDATE lists SET name = ? WHERE id = ?').run(name, id);
        return { id, name };
    }

    getAll(userId: number): SqliteListRecord[] {
        return db.prepare('SELECT * FROM lists WHERE user_id = ? ORDER BY name').all(userId) as SqliteListRecord[];
    }

    getById(id: number | string): SqliteListRecord | undefined {
        return db.prepare('SELECT * FROM lists WHERE id = ?').get(id) as SqliteListRecord | undefined;
    }

    delete(id: number | string): void {
        db.prepare('DELETE FROM lists WHERE id = ?').run(id);
    }
}

export default new SqliteListRepository();
