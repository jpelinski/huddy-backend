import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(__dirname, '../huddy.db'))

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_id TEXT UNIQUE NOT NULL,
        token TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);
export const createUser = (discordId: string, token: string, username: string) => {
    return db.prepare(`
        INSERT OR REPLACE INTO users (discord_id, token, username)
        VALUES (?, ?, ?)
        `).run(discordId, token, username)
}

export const getUserByToken = (token: string) => {
    return db.prepare(`
        SELECT * FROM users WHERE token = ?
    `).get(token) as { id: number, discord_id: string, token: string, username: string } | undefined
}
