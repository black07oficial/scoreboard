/**
 * db-helper.js - Wrapper de compatibilidade sqlite3 -> sql.js
 * 
 * Este módulo emula a API do sqlite3 usando sql.js (WebAssembly)
 * para permitir builds cross-platform sem módulos nativos.
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let SQL = null;

// Inicializar sql.js (precisa ser feito uma vez)
async function initSQL() {
    if (!SQL) {
        SQL = await initSqlJs();
    }
    return SQL;
}

/**
 * Classe Database - Emula sqlite3.Database
 */
class Database {
    constructor(dbPath) {
        // Resolver caminho do banco de dados
        // Se for caminho relativo (./scoreboard.sqlite), resolver a partir do diretório do app
        if (dbPath.startsWith('./') || !path.isAbsolute(dbPath)) {
            // Usar process.cwd() para obter o diretório raiz do app
            const appRoot = process.cwd();
            this.dbPath = path.join(appRoot, dbPath.replace(/^\.\//, ''));
        } else {
            this.dbPath = dbPath;
        }

        console.log('[db-helper] Abrindo banco:', this.dbPath);

        this.db = null;
        this._initPromise = this._init();
    }

    async _init() {
        const SQL = await initSQL();

        // Verificar se o arquivo existe
        if (fs.existsSync(this.dbPath)) {
            const buffer = fs.readFileSync(this.dbPath);
            this.db = new SQL.Database(buffer);
        } else {
            console.error('[db-helper] Banco não encontrado:', this.dbPath);
            // Criar novo banco
            this.db = new SQL.Database();
        }
    }

    async _ensureReady() {
        await this._initPromise;
    }

    /**
     * Executa SELECT e retorna todas as linhas via callback
     * Compatível com: db.all(sql, callback) ou db.all(sql, params, callback)
     */
    all(sql, paramsOrCallback, callbackOrUndefined) {
        let params = [];
        let callback;

        if (typeof paramsOrCallback === 'function') {
            callback = paramsOrCallback;
        } else {
            params = paramsOrCallback || [];
            callback = callbackOrUndefined;
        }

        this._ensureReady().then(() => {
            try {
                const result = this.db.exec(sql, params);
                if (result.length === 0) {
                    callback(null, []);
                    return;
                }

                // Converter resultado para formato sqlite3 (array de objetos)
                const columns = result[0].columns;
                const values = result[0].values;
                const rows = values.map(row => {
                    const obj = {};
                    columns.forEach((col, i) => {
                        obj[col] = row[i];
                    });
                    return obj;
                });

                callback(null, rows);
            } catch (err) {
                callback(err, null);
            }
        }).catch(err => callback(err, null));
    }

    /**
     * Executa SELECT e retorna primeira linha via callback
     * Compatível com: db.get(sql, callback) ou db.get(sql, params, callback)
     */
    get(sql, paramsOrCallback, callbackOrUndefined) {
        let params = [];
        let callback;

        if (typeof paramsOrCallback === 'function') {
            callback = paramsOrCallback;
        } else {
            params = paramsOrCallback || [];
            callback = callbackOrUndefined;
        }

        this._ensureReady().then(() => {
            try {
                const result = this.db.exec(sql, params);
                if (result.length === 0 || result[0].values.length === 0) {
                    callback(null, undefined);
                    return;
                }

                // Converter primeira linha para objeto
                const columns = result[0].columns;
                const values = result[0].values[0];
                const row = {};
                columns.forEach((col, i) => {
                    row[col] = values[i];
                });

                callback(null, row);
            } catch (err) {
                callback(err, null);
            }
        }).catch(err => callback(err, null));
    }

    /**
     * Executa INSERT/UPDATE/DELETE
     * Compatível com: db.run(sql, callback) ou db.run(sql, params, callback)
     */
    run(sql, paramsOrCallback, callbackOrUndefined) {
        let params = [];
        let callback;

        if (typeof paramsOrCallback === 'function') {
            callback = paramsOrCallback;
        } else if (Array.isArray(paramsOrCallback)) {
            params = paramsOrCallback;
            callback = callbackOrUndefined;
        } else {
            callback = callbackOrUndefined;
        }

        this._ensureReady().then(() => {
            try {
                this.db.run(sql, params);
                // Auto-save após cada modificação
                this._save();
                if (callback) callback(null);
            } catch (err) {
                if (callback) callback(err);
            }
        }).catch(err => {
            if (callback) callback(err);
        });
    }

    /**
     * Salva o banco de dados no arquivo
     */
    _save() {
        try {
            const data = this.db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(this.dbPath, buffer);
        } catch (err) {
            console.error('Erro ao salvar banco de dados:', err);
        }
    }

    /**
     * Fecha o banco de dados
     */
    close(callback) {
        this._ensureReady().then(() => {
            try {
                this._save();
                this.db.close();
                if (callback) callback(null);
            } catch (err) {
                if (callback) callback(err);
            }
        }).catch(err => {
            if (callback) callback(err);
        });
    }
}

/**
 * Função verbose() para compatibilidade
 */
function verbose() {
    return {
        Database: Database
    };
}

module.exports = {
    Database: Database,
    verbose: verbose
};
