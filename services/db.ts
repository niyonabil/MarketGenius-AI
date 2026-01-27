import initSqlJs from 'sql.js';
import localforage from 'localforage';
import { SearchFilters, WinningProduct } from '../types';

const DB_NAME = 'marketgenius_db.sqlite';

class DatabaseService {
    private db: any = null;
    private initialized: boolean = false;

    async init() {
        if (this.initialized) return;

        try {
            // 1. Load SQL.js WebAssembly
            // Using version 1.8.0 to match the ESM loader in index.html and ensure stability
            const SQL = await initSqlJs({
                locateFile: () => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm`
            });

            // 2. Try to load existing DB from storage
            const savedData = await localforage.getItem<Uint8Array>(DB_NAME);

            if (savedData) {
                this.db = new SQL.Database(savedData);
                console.log("Database loaded from storage");
            } else {
                this.db = new SQL.Database();
                console.log("New database created");
                this.createTables();
            }

            this.initialized = true;
        } catch (error) {
            console.error("Failed to initialize SQLite:", error);
        }
    }

    private createTables() {
        if (!this.db) return;

        const createSearchHistory = `
            CREATE TABLE IF NOT EXISTS search_history (
                id TEXT PRIMARY KEY,
                query TEXT,
                filters TEXT,
                timestamp INTEGER
            );
        `;

        const createProducts = `
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                niche TEXT,
                viralityScore INTEGER,
                data TEXT,
                timestamp INTEGER
            );
        `;

        const createAppSettings = `
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        `;

        this.db.run(createSearchHistory);
        this.db.run(createProducts);
        this.db.run(createAppSettings);
        this.save();
    }

    // Persist DB to IndexedDB via localforage
    private async save() {
        if (!this.db) return;
        const data = this.db.export();
        await localforage.setItem(DB_NAME, data);
    }

    // --- Search History Methods ---

    addSearch(id: string, query: string, filters: SearchFilters) {
        if (!this.db) return;
        const stmt = this.db.prepare("INSERT OR REPLACE INTO search_history VALUES (?, ?, ?, ?)");
        stmt.run([id, query, JSON.stringify(filters), Date.now()]);
        stmt.free();
        this.save();
    }

    getHistory(): any[] {
        if (!this.db) return [];
        try {
            const result = this.db.exec("SELECT * FROM search_history ORDER BY timestamp DESC LIMIT 20");
            
            if (result.length > 0 && result[0].values) {
                return result[0].values.map((row: any) => ({
                    id: row[0],
                    query: row[1],
                    filters: JSON.parse(row[2]),
                    timestamp: row[3]
                }));
            }
        } catch (e) {
            console.warn("Could not fetch history, table might allow be missing temporarily");
        }
        return [];
    }

    deleteSearch(id: string) {
        if (!this.db) return;
        this.db.run("DELETE FROM search_history WHERE id = ?", [id]);
        this.save();
    }

    // --- Products Methods ---

    saveProduct(product: WinningProduct) {
        if (!this.db) return;
        const stmt = this.db.prepare("INSERT INTO products (name, niche, viralityScore, data, timestamp) VALUES (?, ?, ?, ?, ?)");
        stmt.run([product.name, product.niche, product.viralityScore, JSON.stringify(product), Date.now()]);
        stmt.free();
        this.save();
    }

    // --- Settings / API Key Methods ---

    setApiKey(key: string) {
        if (!this.db) return;
        const stmt = this.db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)");
        stmt.run(['GEMINI_API_KEY', key]);
        stmt.free();
        this.save();
    }

    getApiKey(): string | null {
        if (!this.db) return null;
        try {
            const result = this.db.exec("SELECT value FROM app_settings WHERE key = 'GEMINI_API_KEY'");
            if (result.length > 0 && result[0].values.length > 0) {
                return result[0].values[0][0] as string;
            }
        } catch (e) {
             // Table might not exist yet if updated from old version without migration
             this.createTables(); 
        }
        return null;
    }
}

export const dbService = new DatabaseService();