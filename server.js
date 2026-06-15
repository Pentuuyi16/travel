// ── ДагТур: бэкенд (Express + node:sqlite) ──
// Запуск: node server.js  →  http://localhost:3000

const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
// В реальном проекте вынеси секрет в переменную окружения!
const JWT_SECRET = process.env.JWT_SECRET || 'dagtur-secret-change-me';
const COOKIE_NAME = 'dagtur_token';

app.use(express.json());
app.use(cookieParser());

// ── Загрузка аватарок ──
const avatarsDir = path.join(__dirname, 'uploads', 'avatars');
fs.mkdirSync(avatarsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, avatarsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `user-${req.user.id}-${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 МБ
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Только jpg, png или webp'), ok);
  }
});

// ── Вспомогательное ──
function publicUser(u) {
  if (!u) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role, avatar: u.avatar };
}

function setAuthCookie(res, user) {
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

// Подтягивает req.user, если есть валидная кука (не требует входа)
function attachUser(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (token) {
    try {
      const { id } = jwt.verify(token, JWT_SECRET);
      req.user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
    } catch { req.user = null; }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Требуется вход в аккаунт' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ только для администратора' });
  }
  next();
}

app.use(attachUser);

// ════════════════════ АВТОРИЗАЦИЯ ════════════════════

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'Заполните имя, email и пароль' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть не короче 6 символов' });
  }
  const exists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email.trim());
  if (exists) return res.status(409).json({ error: 'Пользователь с таким email уже существует' });

  const info = db.prepare(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
  ).run(name.trim(), email.trim(), bcrypt.hashSync(password, 10));

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  setAuthCookie(res, user);
  res.json({ user: publicUser(user) });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get((email || '').trim());
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  setAuthCookie(res, user);
  res.json({ user: publicUser(user) });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// ════════════════════ ПРОФИЛЬ ════════════════════

app.put('/api/profile', requireAuth, (req, res) => {
  const { name, email } = req.body || {};
  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Имя и email не могут быть пустыми' });
  }
  const taken = db.prepare('SELECT 1 FROM users WHERE email = ? AND id != ?')
    .get(email.trim(), req.user.id);
  if (taken) return res.status(409).json({ error: 'Этот email уже занят' });

  db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?')
    .run(name.trim(), email.trim(), req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
});

app.put('/api/profile/password', requireAuth, (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!bcrypt.compareSync(oldPassword || '', req.user.password_hash)) {
    return res.status(400).json({ error: 'Текущий пароль указан неверно' });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Новый пароль должен быть не короче 6 символов' });
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ ok: true });
});

app.post('/api/profile/avatar', requireAuth, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не получен' });

  // удалить старую аватарку с диска
  if (req.user.avatar) {
    const old = path.join(__dirname, req.user.avatar.replace(/^\//, ''));
    fs.unlink(old, () => {});
  }
  const url = '/uploads/avatars/' + req.file.filename;
  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(url, req.user.id);
  res.json({ avatar: url });
});

// ════════════════════ АНКЕТА ГИДА ════════════════════

app.post('/api/guide/apply', requireAuth, (req, res) => {
  const b = req.body || {};
  if (!b.name?.trim() || !b.phone?.trim() || !b.email?.trim()) {
    return res.status(400).json({ error: 'Укажите имя, телефон и email' });
  }
  if (req.user.role === 'guide') {
    return res.status(409).json({ error: 'Вы уже гид ДагТур' });
  }
  const pending = db.prepare(
    `SELECT 1 FROM guide_applications WHERE user_id = ? AND status = 'pending'`
  ).get(req.user.id);
  if (pending) {
    return res.status(409).json({ error: 'Ваша анкета уже на рассмотрении' });
  }

  db.prepare(`
    INSERT INTO guide_applications
      (user_id, guide_type, name, about, specializations, routes,
       experience, transport, certificates, phone, email, messengers, link)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id,
    b.guideType || null,
    b.name.trim(),
    b.about || null,
    b.specializations || null,
    b.routes || null,
    b.experience || null,
    b.transport || null,
    b.certificates || null,
    b.phone.trim(),
    b.email.trim(),
    b.messengers || null,
    b.link || null
  );
  res.json({ ok: true });
});

app.get('/api/guide/my-application', requireAuth, (req, res) => {
  const a = db.prepare(
    'SELECT * FROM guide_applications WHERE user_id = ? ORDER BY id DESC LIMIT 1'
  ).get(req.user.id);
  res.json({ application: a || null });
});

// ════════════════════ УВЕДОМЛЕНИЯ ════════════════════

app.get('/api/notifications', requireAuth, (req, res) => {
  const list = db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? AND seen = 0 ORDER BY id'
  ).all(req.user.id);
  res.json({ notifications: list });
});

// Отметить все уведомления прочитанными
app.post('/api/notifications/read-all', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET seen = 1 WHERE user_id = ? AND seen = 0')
    .run(req.user.id);
  res.json({ ok: true });
});

app.post('/api/notifications/:id/seen', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET seen = 1 WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), req.user.id);
  res.json({ ok: true });
});

// ════════════════════ АДМИН ════════════════════

app.get('/api/admin/applications', requireAdmin, (req, res) => {
  const status = req.query.status || 'pending';
  const list = db.prepare(`
    SELECT a.*, u.email AS user_email, u.name AS user_name, u.avatar AS user_avatar
    FROM guide_applications a
    JOIN users u ON u.id = a.user_id
    WHERE a.status = ?
    ORDER BY a.id DESC
  `).all(status);
  res.json({ applications: list });
});

// Список всех зарегистрированных пользователей (для наблюдения)
app.get('/api/admin/users', requireAdmin, (req, res) => {
  const role = req.query.role;             // user | guide | admin | undefined(=все)
  const q = (req.query.q || '').trim();    // поиск по имени/email

  let sql = `
    SELECT u.id, u.name, u.email, u.role, u.avatar, u.created_at,
           (SELECT COUNT(*) FROM guide_applications a WHERE a.user_id = u.id) AS applications_count
    FROM users u
    WHERE 1 = 1
  `;
  const params = [];
  if (role) { sql += ' AND u.role = ?'; params.push(role); }
  if (q) {
    sql += ' AND (u.name LIKE ? OR u.email LIKE ?)';
    params.push('%' + q + '%', '%' + q + '%');
  }
  sql += ' ORDER BY u.id DESC';
  const users = db.prepare(sql).all(...params);

  // счётчики по ролям (всегда полные, не зависят от фильтра)
  const counts = { all: 0, user: 0, guide: 0, admin: 0 };
  for (const row of db.prepare('SELECT role, COUNT(*) AS c FROM users GROUP BY role').all()) {
    counts[row.role] = row.c;
    counts.all += row.c;
  }
  res.json({ users, counts });
});

const ACCEPT_TITLE = 'Поздравляем — вы теперь гид ДагТур! 🎉';
const ACCEPT_MSG =
  'Ваша анкета одобрена, добро пожаловать в команду проводников Дагестана! ' +
  'Совсем скоро вам начнут приходить первые заказы. А пока загляните в профиль гида — ' +
  'добавьте фото, чтобы путешественники узнавали вас в лицо. Гор вам высоких и дорог лёгких!';

const REJECT_TITLE = 'По вашей анкете пока отказ';
const REJECT_MSG =
  'Спасибо за интерес к ДагТур! К сожалению, сейчас мы не можем принять вас в команду гидов. ' +
  'Но это не навсегда: наберитесь опыта, дополните анкету и попробуйте снова — ' +
  'мы будем рады увидеть вас среди наших проводников.';

function decideApplication(req, res, decision) {
  const id = Number(req.params.id);
  const a = db.prepare('SELECT * FROM guide_applications WHERE id = ?').get(id);
  if (!a) return res.status(404).json({ error: 'Заявка не найдена' });
  if (a.status !== 'pending') return res.status(409).json({ error: 'Заявка уже рассмотрена' });

  db.prepare(
    `UPDATE guide_applications SET status = ?, decided_at = datetime('now') WHERE id = ?`
  ).run(decision, id);

  if (decision === 'accepted') {
    db.prepare(`UPDATE users SET role = 'guide' WHERE id = ?`).run(a.user_id);
    db.prepare(
      `INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'guide_accepted', ?, ?)`
    ).run(a.user_id, ACCEPT_TITLE, ACCEPT_MSG);
  } else {
    db.prepare(
      `INSERT INTO notifications (user_id, type, title, message) VALUES (?, 'guide_rejected', ?, ?)`
    ).run(a.user_id, REJECT_TITLE, REJECT_MSG);
  }
  res.json({ ok: true });
}

app.post('/api/admin/applications/:id/accept', requireAdmin, (req, res) =>
  decideApplication(req, res, 'accepted'));
app.post('/api/admin/applications/:id/reject', requireAdmin, (req, res) =>
  decideApplication(req, res, 'rejected'));

// ════════════════════ БРОНИРОВАНИЕ ════════════════════

const TOUR_TITLES = {
  sulak: 'Сулакский каньон', derbent: 'Дербент', hunzah: 'Хунзах',
  gamsutl: 'Гамсутль', gunib: 'Гуниб', kahib: 'Кахиб-Гоор'
};

function totalGuides() {
  return db.prepare(`SELECT COUNT(*) AS c FROM users WHERE role = 'guide'`).get().c;
}

// Календарь: даты, где заняты ВСЕ гиды (красные для клиента)
app.get('/api/booking/busy', (req, res) => {
  const total = totalGuides();
  if (total === 0) return res.json({ guides: 0, busyDates: [] });
  const rows = db.prepare(`
    SELECT date, COUNT(DISTINCT guide_id) AS busy
    FROM bookings WHERE status != 'cancelled'
    GROUP BY date HAVING busy >= ?
  `).all(total);
  res.json({ guides: total, busyDates: rows.map(r => r.date) });
});

// Создать бронь: случайный свободный гид + занять дату
app.post('/api/booking/create', requireAuth, (req, res) => {
  const b = req.body || {};
  const date = (b.date || '').trim();
  const tourSlug = (b.tourSlug || 'tour').trim();
  const people = Math.max(1, parseInt(b.people) || 1);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return res.status(400).json({ error: 'Некорректная дата' });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (new Date(date + 'T00:00:00') < today)
    return res.status(400).json({ error: 'Эта дата уже прошла' });

  const total = totalGuides();
  if (total === 0)
    return res.status(409).json({ error: 'Пока нет доступных гидов. Попробуйте позже.' });

  const freeGuides = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar FROM users u
    WHERE u.role = 'guide'
      AND u.id NOT IN (SELECT guide_id FROM bookings WHERE date = ? AND status != 'cancelled')
  `).all(date);

  if (freeGuides.length === 0)
    return res.status(409).json({ error: 'На эту дату все гиды заняты. Выберите другой день.' });

  const guide = freeGuides[Math.floor(Math.random() * freeGuides.length)];

  let info;
  try {
    info = db.prepare(`
      INSERT INTO bookings
      (user_id, guide_id, tour_slug, tour_title, date, people,
       customer_name, customer_phone, customer_email, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      req.user.id, guide.id, tourSlug, TOUR_TITLES[tourSlug] || b.tourTitle || 'Тур',
      date, people,
      (b.name || req.user.name || '').trim(),
      (b.phone || '').trim(),
      (b.email || req.user.email || '').trim()
    );
  } catch (e) {
    return res.status(409).json({ error: 'Гид только что был занят. Повторите бронирование.' });
  }

  // Оповещаем выбранного гида о новом заказе
  const tourName = TOUR_TITLES[tourSlug] || 'тур';
  const niceDate = new Date(date + 'T00:00:00').toLocaleDateString('ru', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  db.prepare(`
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (?, 'new_booking', ?, ?)
  `).run(
    guide.id,
    'Новый заказ! 🎒',
    `Вас выбрали гидом на «${tourName}» — ${niceDate}, ${people} чел. ` +
    `Загляните в раздел «Заказы клиентов», чтобы связаться с путешественником.`
  );

  res.json({
    bookingId: info.lastInsertRowid,
    date,
    guide: { id: guide.id, name: guide.name, avatar: guide.avatar }
  });
});

// Мои бронирования
// Заказы, где текущий пользователь назначен гидом (кабинет гида)
app.get('/api/guide/bookings', requireAuth, (req, res) => {
  if (req.user.role !== 'guide') {
    return res.status(403).json({ error: 'Доступно только гидам' });
  }
  const list = db.prepare(`
    SELECT b.id, b.tour_slug, b.tour_title, b.date, b.people, b.status, b.created_at,
           b.customer_name, b.customer_phone, b.customer_email,
           u.name AS client_name, u.email AS client_email
    FROM bookings b
    JOIN users u ON u.id = b.user_id
    WHERE b.guide_id = ? AND b.guide_hidden = 0
    ORDER BY b.date DESC, b.id DESC
  `).all(req.user.id);
  res.json({ bookings: list });
});

// Гид скрывает все свои отменённые заказы из списка
app.post('/api/guide/bookings/clear-cancelled', requireAuth, (req, res) => {
  if (req.user.role !== 'guide') {
    return res.status(403).json({ error: 'Доступно только гидам' });
  }
  const info = db.prepare(`
    UPDATE bookings SET guide_hidden = 1
    WHERE guide_id = ? AND status = 'cancelled' AND guide_hidden = 0
  `).run(req.user.id);
  res.json({ cleared: info.changes });
});

// ════════════════════ ЧАТ ПО ЗАКАЗУ ════════════════════

function canAccessBookingChat(booking, user) {
  if (!booking) return false;
  if (user.role === 'admin') return true;
  if (booking.user_id === user.id) return true;
  if (booking.guide_id === user.id) return true;
  return false;
}

app.get('/api/booking/:id/messages', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  if (!canAccessBookingChat(booking, req.user)) {
    return res.status(403).json({ error: 'Нет доступа к этому чату' });
  }
  const messages = db.prepare(`
    SELECT m.id, m.sender_id, m.sender_role, m.text, m.created_at,
           u.name AS sender_name
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.booking_id = ?
    ORDER BY m.id ASC
  `).all(id);
  let myRole = 'client';
  if (req.user.id === booking.guide_id) myRole = 'guide';
  res.json({ messages, myRole });
});

app.post('/api/booking/:id/messages', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Пустое сообщение' });
  if (text.length > 2000) return res.status(400).json({ error: 'Сообщение слишком длинное' });

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  if (!canAccessBookingChat(booking, req.user)) {
    return res.status(403).json({ error: 'Нет доступа к этому чату' });
  }

  const senderRole = (req.user.id === booking.guide_id) ? 'guide' : 'client';
  const info = db.prepare(`
    INSERT INTO messages (booking_id, sender_id, sender_role, text)
    VALUES (?, ?, ?, ?)
  `).run(id, req.user.id, senderRole, text);
  const recipientId = (senderRole === 'guide') ? booking.user_id : booking.guide_id;
  const recipientRole = (senderRole === 'guide') ? 'client' : 'guide';
  const fromName = req.user.name || (senderRole === 'guide' ? 'Гид' : 'Клиент');
  const link = recipientRole === 'guide'
    ? `guide-order.html?id=${id}`
    : `booking-confirm.html?id=${id}`;
  db.prepare(`
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (?, 'new_message', ?, ?, ?)
  `).run(
    recipientId,
    'Новое сообщение 💬',
    `${fromName} написал(а) вам по заказу «${booking.tour_title || 'тур'}».`,
    link
  );

  res.json({
    message: {
      id: info.lastInsertRowid,
      sender_id: req.user.id,
      sender_role: senderRole,
      sender_name: req.user.name,
      text,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    }
  });
});
app.get('/api/booking/my', requireAuth, (req, res) => {
  const list = db.prepare(`
    SELECT b.id, b.tour_slug, b.tour_title, b.date, b.people, b.status, b.created_at,
           g.name AS guide_name, g.avatar AS guide_avatar
    FROM bookings b JOIN users g ON g.id = b.guide_id
    WHERE b.user_id = ? AND b.user_hidden = 0
    ORDER BY b.date DESC, b.id DESC
  `).all(req.user.id);
  res.json({ bookings: list });
});

// Клиент скрывает свои отменённые заказы из списка
app.post('/api/booking/clear-cancelled', requireAuth, (req, res) => {
  const info = db.prepare(`
    UPDATE bookings SET user_hidden = 1
    WHERE user_id = ? AND status = 'cancelled' AND user_hidden = 0
  `).run(req.user.id);
  res.json({ cleared: info.changes });
});


// Один заказ по id (для страницы оплаты по ссылке ?id=)
app.get('/api/booking/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const b = db.prepare(`
    SELECT b.id, b.tour_slug, b.tour_title, b.date, b.people, b.status,
           b.customer_name, b.customer_phone, b.customer_email, b.created_at,
           g.name AS guide_name, g.avatar AS guide_avatar
    FROM bookings b JOIN users g ON g.id = b.guide_id
    WHERE b.id = ?
  `).get(id);
  if (!b) return res.status(404).json({ error: 'Заказ не найден' });
  // смотреть может владелец или админ
  const owner = db.prepare('SELECT user_id, guide_id FROM bookings WHERE id = ?').get(id);
  if (owner.user_id !== req.user.id
      && owner.guide_id !== req.user.id
      && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Это не ваш заказ' });
  }
  res.json({ booking: b });
});

// Отмена брони (мягкая) — дата освобождается
app.post('/api/booking/:id/cancel', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  if (!booking) return res.status(404).json({ error: 'Бронь не найдена' });
  if (booking.user_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Нельзя отменить чужую бронь' });
  if (booking.status !== 'paid')
    return res.status(409).json({ error: 'Бронь уже отменена' });
  db.prepare(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`).run(id);
  res.json({ ok: true });
});

// ════════════════════ ОТЗЫВЫ ════════════════════

// Оставить отзыв (только залогиненный) — уходит на модерацию
app.post('/api/reviews', requireAuth, (req, res) => {
  const text = (req.body.text || '').trim();
  let rating = parseInt(req.body.rating) || 5;
  rating = Math.max(1, Math.min(5, rating));
  if (text.length < 10) {
    return res.status(400).json({ error: 'Отзыв слишком короткий (минимум 10 символов)' });
  }
  if (text.length > 2000) {
    return res.status(400).json({ error: 'Отзыв слишком длинный (максимум 2000 символов)' });
  }
  db.prepare(`
    INSERT INTO reviews (user_id, author, rating, text)
    VALUES (?, ?, ?, ?)
  `).run(req.user.id, req.user.name || 'Гость', rating, text);
  res.json({ ok: true });
});

// Одобренные отзывы для главной (публично)
app.get('/api/reviews', (req, res) => {
  const perPage = 9;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const offset = (page - 1) * perPage;

  const total = db.prepare(`SELECT COUNT(*) AS c FROM reviews WHERE status = 'approved'`).get().c;
  const list = db.prepare(`
    SELECT id, author, rating, text, created_at
    FROM reviews WHERE status = 'approved'
    ORDER BY id DESC LIMIT ? OFFSET ?
  `).all(perPage, offset);

  res.json({
    reviews: list,
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage))
  });
});

// Админ: список отзывов по статусу
app.get('/api/admin/reviews', requireAdmin, (req, res) => {
  const status = req.query.status || 'pending';
  const list = db.prepare(`
    SELECT r.*, u.email AS user_email
    FROM reviews r JOIN users u ON u.id = r.user_id
    WHERE r.status = ? ORDER BY r.id DESC
  `).all(status);
  res.json({ reviews: list });
});

// Админ: одобрить / отклонить отзыв
app.post('/api/admin/reviews/:id/:action', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const action = req.params.action; // approve | reject
  const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : null;
  if (!status) return res.status(400).json({ error: 'Неизвестное действие' });
  const r = db.prepare('SELECT status FROM reviews WHERE id = ?').get(id);
  if (!r) return res.status(404).json({ error: 'Отзыв не найден' });
  db.prepare(`UPDATE reviews SET status = ?, decided_at = datetime('now') WHERE id = ?`)
    .run(status, id);
  res.json({ ok: true });
});


// ════════════════════ СТАТИКА ════════════════════

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'main.html')));
app.use(express.static(__dirname, { extensions: ['html'] }));

// Обработчик ошибок (например, от multer)
app.use((err, req, res, next) => {
  res.status(400).json({ error: err.message || 'Ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`ДагТур запущен: http://localhost:${PORT}`);
  console.log(`Админ-панель:   http://localhost:${PORT}/admin.html`);
});
