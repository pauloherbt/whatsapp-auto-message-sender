import db from './SqliteDatabase';

export interface SqliteMessageRecord {
    id: number;
    list_id: number | null;
    list_name: string;
    content: string;
    sent_at: string;
    sent_by: string;
    total_groups: number;
    success: number;
}

class SqliteMessageRepository {
    private logStmt = db.prepare(`
        INSERT INTO messages (list_id, list_name, content, sent_by, total_groups, success)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    private historyStmt = db.prepare('SELECT * FROM messages ORDER BY sent_at DESC LIMIT 5');

    log(listId: number | string | null, listName: string, content: string, sentBy: string, totalGroups: number, success: number) {
        const result = this.logStmt.run(listId, listName, content, sentBy, totalGroups, success);
        return { id: result.lastInsertRowid };
    }

    getHistory(): SqliteMessageRecord[] {
        return this.historyStmt.all() as SqliteMessageRecord[];
    }
}

export default new SqliteMessageRepository();
