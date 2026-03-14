import db from './SqliteDatabase';

export interface SqliteUserRecord {
    id: number;
    email: string;
    password_hash: string;
    created_at: string;
}

class SqliteUserRepository {
    private createStmt = db.prepare(
        'INSERT INTO users (email, password_hash) VALUES (?, ?)'
    );
    private findByEmailStmt = db.prepare(
        'SELECT * FROM users WHERE lower(email) = lower(?)'
    );
    private findByIdStmt = db.prepare(
        'SELECT * FROM users WHERE id = ?'
    );

    create(email: string, passwordHash: string): { id: number | bigint; email: string } {
        const result = this.createStmt.run(email, passwordHash);
        return { id: result.lastInsertRowid, email };
    }

    findByEmail(email: string): SqliteUserRecord | undefined {
        return this.findByEmailStmt.get(email) as SqliteUserRecord | undefined;
    }

    findById(id: number | string): SqliteUserRecord | undefined {
        return this.findByIdStmt.get(id) as SqliteUserRecord | undefined;
    }
}

export default new SqliteUserRepository();
