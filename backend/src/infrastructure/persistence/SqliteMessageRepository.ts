import db from './SqliteDatabase';

export interface SqliteMessageRecord {
    id: number;
    user_id: number | null;
    list_id: number | null;
    list_name: string;
    content: string;
    sent_at: string;
    sent_by: string;
    total_groups: number;
    success: number;
}

class SqliteMessageRepository {
    log(
        userId: number | null,
        listId: number | string | null,
        listName: string,
        content: string,
        sentBy: string,
        totalGroups: number,
        success: number
    ) {
        const result = db.prepare(
            `INSERT INTO messages (user_id, list_id, list_name, content, sent_by, total_groups, success)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(userId, listId, listName, content, sentBy, totalGroups, success);
        return { id: result.lastInsertRowid };
    }

    getHistory(userId: number): SqliteMessageRecord[] {
        return db.prepare(
            'SELECT * FROM messages WHERE user_id = ? ORDER BY sent_at DESC LIMIT 20'
        ).all(userId) as SqliteMessageRecord[];
    }
}

export default new SqliteMessageRepository();
