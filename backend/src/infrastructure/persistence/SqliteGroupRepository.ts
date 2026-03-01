import db from './SqliteDatabase';

export interface SqliteGroupRecord {
    id: number;
    list_id: number;
    wpp_group_id: string;
    name: string;
    added_at: string;
}

class SqliteGroupRepository {
    private addStmt = db.prepare('INSERT INTO groups (list_id, wpp_group_id, name) VALUES (?, ?, ?)');
    private forListStmt = db.prepare('SELECT * FROM groups WHERE list_id = ? ORDER BY name');
    private getByWppStmt = db.prepare('SELECT * FROM groups WHERE wpp_group_id = ?');
    private removeStmt = db.prepare('DELETE FROM groups WHERE id = ?');

    add(listId: number | string, wppGroupId: string, name: string = '') {
        const result = this.addStmt.run(listId, wppGroupId, name);
        return { id: result.lastInsertRowid, listId, wppGroupId, name };
    }

    forList(listId: number | string): SqliteGroupRecord[] {
        return this.forListStmt.all(listId) as SqliteGroupRecord[];
    }

    getByWpp(wppGroupId: string): SqliteGroupRecord | undefined {
        return this.getByWppStmt.get(wppGroupId) as SqliteGroupRecord | undefined;
    }

    remove(id: number | string): void {
        this.removeStmt.run(id);
    }
}

export default new SqliteGroupRepository();
