// ── База данных (встроенный node:sqlite, Node.js 22+) ──
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new DatabaseSync(path.join(__dirname, 'dagtur.db'));

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user',   -- user | guide | admin
    avatar        TEXT,                           -- /uploads/avatars/...
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS guide_applications (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL REFERENCES users(id),
    guide_type     TEXT,        -- Гид | Команда гидов | Агентство
    name           TEXT NOT NULL,
    about          TEXT,
    specializations TEXT,       -- через запятую
    routes         TEXT,
    experience     TEXT,
    transport      TEXT,
    certificates   TEXT,
    phone          TEXT NOT NULL,
    email          TEXT NOT NULL,
    messengers     TEXT,
    link           TEXT,
    status         TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | rejected
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    decided_at     TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    type       TEXT NOT NULL,          -- guide_accepted | guide_rejected | info
    title      TEXT NOT NULL,
    message    TEXT NOT NULL,
    seen       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id),
    guide_id     INTEGER NOT NULL REFERENCES users(id),
    tour_slug    TEXT NOT NULL,
    tour_title   TEXT,
    date         TEXT NOT NULL,
    people       INTEGER NOT NULL DEFAULT 1,
    customer_name  TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    status       TEXT NOT NULL DEFAULT 'paid',
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_guide_date
    ON bookings(guide_id, date) WHERE status = 'paid';
`);

// ── Сид: админ по умолчанию (поменяй пароль после первого входа!) ──
const ADMIN_EMAIL = 'admin@dagtur.ru';
const ADMIN_PASSWORD = 'admin123';

const adminExists = db.prepare(`SELECT 1 FROM users WHERE role = 'admin' LIMIT 1`).get();
if (!adminExists) {
  db.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')`)
    .run('Администратор', ADMIN_EMAIL, bcrypt.hashSync(ADMIN_PASSWORD, 10));
  console.log(`[db] Создан администратор: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} — смените пароль!`);
}

module.exports = db;
