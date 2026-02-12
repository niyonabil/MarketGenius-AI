import initSqlJs from 'sql.js';
import localforage from 'localforage';
import { AIProvider, SearchFilters, WinningProduct } from '../types';

const DB_NAME = 'marketgenius_db.sqlite';
const DEFAULT_PROVIDER: AIProvider = 'gemini';

class DatabaseService {
    private db: any = null;
    private initialized: boolean = false;

    async init() {
        if (this.initialized) return;

        try {
            const SQL = await initSqlJs({
                locateFile: () => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm`
            });

            const savedData = await localforage.getItem<Uint8Array>(DB_NAME);

            if (savedData) {
                this.db = new SQL.Database(savedData);
                console.log('Database loaded from storage');
            } else {
                this.db = new SQL.Database();
                console.log('New database created');
            }

            this.createTables();
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize SQLite:', error);
        }
    }

    private createTables() {
        if (!this.db) return;

        this.db.run(`
            CREATE TABLE IF NOT EXISTS search_history (
                id TEXT PRIMARY KEY,
                query TEXT,
                filters TEXT,
                timestamp INTEGER
            );
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                niche TEXT,
                viralityScore INTEGER,
                data TEXT,
                timestamp INTEGER
            );
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        `);

        this.save();
    }

    private async save() {
        if (!this.db) return;
        const data = this.db.export();
        await localforage.setItem(DB_NAME, data);
    }

    private setSetting(key: string, value: string) {
        if (!this.db) return;
        const stmt = this.db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)');
        stmt.run([key, value]);
        stmt.free();
        this.save();
    }

    private getSetting(key: string): string | null {
        if (!this.db) return null;
        try {
            const stmt = this.db.prepare('SELECT value FROM app_settings WHERE key = ?');
            stmt.bind([key]);
            if (stmt.step()) {
                const row = stmt.getAsObject();
                stmt.free();
                return row.value as string;
            }
            stmt.free();
        } catch {
            this.createTables();
        }
        return null;
    }

    addSearch(id: string, query: string, filters: SearchFilters) {
        if (!this.db) return;
        const stmt = this.db.prepare('INSERT OR REPLACE INTO search_history VALUES (?, ?, ?, ?)');
        stmt.run([id, query, JSON.stringify(filters), Date.now()]);
        stmt.free();
        this.save();
    }

    getHistory(): any[] {
        if (!this.db) return [];
        try {
            const result = this.db.exec('SELECT * FROM search_history ORDER BY timestamp DESC LIMIT 20');

            if (result.length > 0 && result[0].values) {
                return result[0].values.map((row: any) => ({
                    id: row[0],
                    query: row[1],
                    filters: JSON.parse(row[2]),
                    timestamp: row[3]
                }));
            }
        } catch {
            console.warn('Could not fetch history, table might be missing temporarily');
        }
        return [];
    }

    deleteSearch(id: string) {
        if (!this.db) return;
        this.db.run('DELETE FROM search_history WHERE id = ?', [id]);
        this.save();
    }

    saveProduct(product: WinningProduct) {
        if (!this.db) return;
        const stmt = this.db.prepare('INSERT INTO products (name, niche, viralityScore, data, timestamp) VALUES (?, ?, ?, ?, ?)');
        stmt.run([product.name, product.niche, product.viralityScore, JSON.stringify(product), Date.now()]);
        stmt.free();
        this.save();
    }

    setApiKey(provider: AIProvider, key: string) {
        this.setSetting(`${provider.toUpperCase()}_API_KEY`, key);
    }

    getApiKey(provider: AIProvider): string | null {
        return this.getSetting(`${provider.toUpperCase()}_API_KEY`);
    }

    setProvider(provider: AIProvider) {
        this.setSetting('AI_PROVIDER', provider);
    }

    getProvider(): AIProvider {
        const provider = this.getSetting('AI_PROVIDER') as AIProvider | null;
        return provider || DEFAULT_PROVIDER;
    }

    setOllamaBaseUrl(baseUrl: string) {
        this.setSetting('OLLAMA_BASE_URL', baseUrl);
    }

    getOllamaBaseUrl(): string {
        return this.getSetting('OLLAMA_BASE_URL') || 'https://ollama.com';
    }

    setOllamaModel(model: string) {
        this.setSetting('OLLAMA_MODEL', model);
    }

    getOllamaModel(): string {
        return this.getSetting('OLLAMA_MODEL') || 'gpt-oss:120b';
    }
}

export const dbService = new DatabaseService();
