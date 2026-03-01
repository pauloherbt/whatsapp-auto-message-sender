import db from './SqliteDatabase';

export interface SqliteListRecord {
    id: number;
    name: string;
    created_at: string;
}

class SqliteListRepository {
    private createStmt = db.prepare('INSERT INTO lists (name) VALUES (?)');
    private getAllStmt = db.prepare('SELECT * FROM lists ORDER BY name');
    private getByIdStmt = db.prepare('SELECT * FROM lists WHERE id = ?');
    private getByNameStmt = db.prepare('SELECT * FROM lists WHERE lower(name) = lower(?)');
    private updateStmt = db.prepare('UPDATE lists SET name = ? WHERE id = ?');
    private deleteStmt = db.prepare('DELETE FROM lists WHERE id = ?');

    create(name: string): { id: number | bigint; name: string } {
        const result = this.createStmt.run(name);
        return { id: result.lastInsertRowid, name };
    }

    update(id: number | string, name: string): { id: number | string; name: string } {
        this.updateStmt.run(name, id);
        return { id, name };
    }

    getAll(): SqliteListRecord[] {
        return this.getAllStmt.all() as SqliteListRecord[];
    }

    getById(id: number | string): SqliteListRecord | undefined {
        return this.getByIdStmt.get(id) as SqliteListRecord | undefined;
    }

    getByName(name: string): SqliteListRecord | undefined {
        return this.getByNameStmt.get(name) as SqliteListRecord | undefined;
    }

    delete(id: number | string): void {
        this.deleteStmt.run(id);
    }
}

export default new SqliteListRepository();
