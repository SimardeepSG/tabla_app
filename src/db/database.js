/**
 * Local SQLite storage (offline-first, nothing leaves the device):
 * custom taals, taal variations, and key/value user preferences,
 * plus a clearAllData() wipe used by the Delete My Data page.
 */
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'tabla_app.db';

let db = null;

/** Get or open the database */
export async function getDatabase() {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initSchema(db);
  }
  return db;
}

/** Create tables if they don't exist */
async function initSchema(database) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS custom_taals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      matras INTEGER NOT NULL,
      vibhag TEXT NOT NULL,
      khali_vibhag TEXT NOT NULL,
      theka TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS taal_variations (
      id TEXT PRIMARY KEY,
      taal_id TEXT NOT NULL,
      name TEXT NOT NULL,
      theka TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// ── Custom Taal CRUD ──────────────────────────────────────────

export async function saveCustomTaal(taal) {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO custom_taals (id, name, matras, vibhag, khali_vibhag, theka, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))`,
    taal.id,
    taal.name,
    taal.matras,
    JSON.stringify(taal.vibhag),
    JSON.stringify(taal.khaliVibhag),
    JSON.stringify(taal.theka),
  );
}

export async function getCustomTaals() {
  const database = await getDatabase();
  const rows = await database.getAllAsync('SELECT * FROM custom_taals ORDER BY name');

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    matras: row.matras,
    vibhag: JSON.parse(row.vibhag),
    khaliVibhag: JSON.parse(row.khali_vibhag),
    theka: JSON.parse(row.theka),
    isCustom: true,
  }));
}

export async function deleteCustomTaal(id) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM custom_taals WHERE id = ?', id);
  // Also delete its variations
  await database.runAsync('DELETE FROM taal_variations WHERE taal_id = ?', id);
}

// ── Taal Variations ──────────────────────────────────────────

export async function saveVariation(variation) {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO taal_variations (id, taal_id, name, theka, created_at)
     VALUES (?, ?, ?, ?, strftime('%s', 'now'))`,
    variation.id,
    variation.taalId,
    variation.name,
    JSON.stringify(variation.theka),
  );
}

export async function getVariationsForTaal(taalId) {
  const database = await getDatabase();
  const rows = await database.getAllAsync(
    'SELECT * FROM taal_variations WHERE taal_id = ? ORDER BY name',
    taalId,
  );
  return rows.map((row) => ({
    id: row.id,
    taalId: row.taal_id,
    name: row.name,
    theka: JSON.parse(row.theka),
  }));
}

export async function deleteVariation(id) {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM taal_variations WHERE id = ?', id);
}

// ── User Preferences ──────────────────────────────────────────

export async function setPreference(key, value) {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)',
    key,
    value,
  );
}

export async function getPreference(key) {
  const database = await getDatabase();
  const row = await database.getFirstAsync(
    'SELECT value FROM user_preferences WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

// ── Data deletion ─────────────────────────────────────────────

/**
 * Erase everything this app has stored on the device: custom taals,
 * taal variations, and saved preferences. Used by the Delete My Data
 * page. There is no server copy — once cleared, the data is gone.
 */
export async function clearAllData() {
  const database = await getDatabase();
  await database.execAsync(`
    DELETE FROM custom_taals;
    DELETE FROM taal_variations;
    DELETE FROM user_preferences;
  `);
}
