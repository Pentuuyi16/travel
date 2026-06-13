// ── ДагТур: авторизация через свой бэкенд + баннеры-уведомления ──
// Подключается на всех страницах. Firebase больше не используется.

const API = '';                       // тот же домен, что и сайт
const inTours = location.pathname.includes('/tours/');
const ROOT = inTours ? '../' : '';    // префикс ссылок со страниц в /tours/

async function api(url, options = {}) {
  const res = await fetch(API + url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
  return data;
}

// ════════ Модалка входа/регистрации (разметка уже есть на страницах) ════════

const authOverlay = document.getElementById('authOverlay');
const authClose = document.getElementById('authClose');
const authTabs = document.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Google-вход отключён (раньше работал через Firebase)
document.querySelectorAll('.auth-google').forEach(b => b.style.display = 'none');

function openAuth(tab = 'login') {
  if (!authOverlay) return;
  authOverlay.classList.add('active');
  switchTab(tab);
}
window.openAuth = openAuth; // нужно gidy.html

function switchTab(name) {
  authTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  if (loginForm) loginForm.style.display = name === 'login' ? 'block' : 'none';
  if (registerForm) registerForm.style.display = name === 'register' ? 'block' : 'none';
}

document.getElementById('authOpenBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (!document.getElementById('userDropdown')) openAuth('login');
});

document.getElementById('regOpenBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  openAuth('register');
});

authClose?.addEventListener('click', () => authOverlay.classList.remove('active'));
authOverlay?.addEventListener('click', (e) => {
  if (e.target === authOverlay) authOverlay.classList.remove('active');
});

authTabs.forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

document.getElementById('loginBtn')?.addEventListener('click', async () => {
  try {
    const { user } = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
      })
    });
    authOverlay.classList.remove('active');
    updateHeader(user);
    checkNotifications();
  } catch (err) { alert(err.message); }
});

document.getElementById('registerBtn')?.addEventListener('click', async () => {
  try {
    const { user } = await api('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        name: document.getElementById('registerName').value,
        email: document.getElementById('registerEmail').value,
        password: document.getElementById('registerPassword').value
      })
    });
    authOverlay.classList.remove('active');
    updateHeader(user);
  } catch (err) { alert(err.message); }
});

// ════════ Шапка: имя пользователя + дропдаун ════════

function updateHeader(user) {
  window.dagtourUser = user || null;
  const loginBtn = document.getElementById('authOpenBtn');
  const regBtn = document.getElementById('regOpenBtn');
  if (!loginBtn) return;

  const oldMenu = document.getElementById('userDropdown');
  if (oldMenu) oldMenu.remove();

  if (user) {
    if (regBtn) regBtn.style.display = 'none';
    loginBtn.textContent = user.name || user.email;
    loginBtn.classList.add('user-menu-btn');

    const isGuide = user.role === 'guide';
    const isAdmin = user.role === 'admin';

    const dropdown = document.createElement('div');
    dropdown.id = 'userDropdown';
    dropdown.className = 'user-dropdown';
    dropdown.innerHTML = `
      <a href="${ROOT}orders.html">Мои заказы</a>
      <a href="#">Промокоды</a>
      <a href="${ROOT}profile.html">${isGuide ? 'Профиль гида' : 'Профиль'}</a>
      ${isAdmin ? `<a href="${ROOT}admin.html">Админ-панель</a>` : ''}
      <a href="#" id="logoutBtn">Выход</a>
    `;

    loginBtn.parentElement.style.position = 'relative';
    loginBtn.parentElement.appendChild(dropdown);

    dropdown.querySelector('#logoutBtn').addEventListener('click', async (e) => {
      e.preventDefault();
      await api('/api/logout', { method: 'POST' });
      updateHeader(null);
    });

    loginBtn.onclick = (e) => {
      e.preventDefault();
      dropdown.classList.toggle('active');
    };

    document.addEventListener('click', (e) => {
      if (!loginBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });
  } else {
    loginBtn.textContent = 'вход';
    loginBtn.classList.remove('user-menu-btn');
    if (regBtn) regBtn.style.display = '';
    loginBtn.onclick = (e) => { e.preventDefault(); openAuth('login'); };
  }
}

// ════════ Баннер-уведомление (решение по анкете гида и т.п.) ════════

const bannerCSS = `
.dg-banner-wrap{position:fixed;top:96px;left:50%;transform:translateX(-50%);
  z-index:5000;width:min(560px,calc(100vw - 32px));}
.dg-banner{border-radius:24px;padding:26px 30px;color:#fff;
  font-family:'Montserrat',sans-serif;box-shadow:0 24px 70px rgba(0,0,0,.35);
  display:flex;gap:18px;align-items:flex-start;position:relative;overflow:hidden;
  animation:dgBannerIn .6s cubic-bezier(.25,0,.25,1);}
.dg-banner--accepted{background:linear-gradient(135deg,#4e75a6 0%,#3a5d8a 55%,#2c4a72 100%);}
.dg-banner--rejected{background:linear-gradient(135deg,#5a5a52 0%,#3d3d36 100%);}
.dg-banner::after{content:"";position:absolute;top:-60px;right:-60px;width:200px;height:200px;
  border-radius:50%;background:rgba(255,255,255,.08);}
.dg-banner-ico{font-size:34px;line-height:1;flex-shrink:0;margin-top:2px;}
.dg-banner-title{font-size:17px;font-weight:700;margin-bottom:8px;letter-spacing:-.2px;}
.dg-banner-text{font-size:13.5px;line-height:1.65;color:rgba(255,255,255,.88);margin-bottom:16px;}
.dg-banner-btn{background:#fff;color:#1a1a1a;border:none;padding:10px 26px;border-radius:100px;
  font-size:13px;font-weight:600;font-family:'Montserrat',sans-serif;cursor:pointer;
  transition:transform .15s;}
.dg-banner-btn:hover{transform:scale(1.04);}
.dg-banner-close{position:absolute;top:12px;right:16px;background:none;border:none;
  color:rgba(255,255,255,.7);font-size:18px;cursor:pointer;line-height:1;z-index:2;}
.dg-banner-close:hover{color:#fff;}
@keyframes dgBannerIn{from{opacity:0;transform:translateY(-30px)}to{opacity:1;transform:translateY(0)}}
.dg-banner--out{transition:opacity .35s,transform .35s;opacity:0;transform:translateY(-20px);}
`;

(function injectBannerCSS() {
  const s = document.createElement('style');
  s.textContent = bannerCSS;
  document.head.appendChild(s);
})();

window.showInfoBanner = function (title, text, opts = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'dg-banner-wrap';
  const kind = opts.kind === 'accepted' ? 'accepted' : 'rejected';
  const ico = opts.ico || 'ℹ️';
  const btnText = opts.btnText || 'Понятно';
  wrap.innerHTML = `
    <div class="dg-banner dg-banner--${kind}">
      <button class="dg-banner-close">✕</button>
      <div class="dg-banner-ico">${ico}</div>
      <div>
        <div class="dg-banner-title"></div>
        <div class="dg-banner-text"></div>
        <button class="dg-banner-btn">${btnText}</button>
      </div>
    </div>`;
  wrap.querySelector('.dg-banner-title').textContent = title;
  wrap.querySelector('.dg-banner-text').textContent = text;
  document.body.appendChild(wrap);
  function close() {
    wrap.firstElementChild.classList.add('dg-banner--out');
    setTimeout(() => { wrap.remove(); if (opts.onClose) opts.onClose(); }, 350);
  }
  wrap.querySelector('.dg-banner-close').addEventListener('click', close);
  wrap.querySelector('.dg-banner-btn').addEventListener('click', () => {
    close(); if (opts.onButton) opts.onButton();
  });
};


function showBanner(n, onClose) {
  const wrap = document.createElement('div');
  wrap.className = 'dg-banner-wrap';
  let kind, ico, btnText;
    if (n.type === 'guide_accepted') {
      kind = 'accepted'; ico = '🏔️'; btnText = 'Перейти в профиль гида';
    } else if (n.type === 'new_booking') {
      kind = 'accepted'; ico = '🎒'; btnText = 'Смотреть заказы';
    } else {
      kind = 'rejected'; ico = '🤝'; btnText = 'Понятно';
    }

  wrap.innerHTML = `
    <div class="dg-banner dg-banner--${kind}">
      <button class="dg-banner-close">✕</button>
      <div class="dg-banner-ico">${ico}</div>
      <div>
        <div class="dg-banner-title"></div>
        <div class="dg-banner-text"></div>
        <button class="dg-banner-btn">${btnText}</button>
      </div>
    </div>`;
  wrap.querySelector('.dg-banner-title').textContent = n.title;
  wrap.querySelector('.dg-banner-text').textContent = n.message;
  document.body.appendChild(wrap);

  async function close(goProfile) {
    try { await api(`/api/notifications/${n.id}/seen`, { method: 'POST' }); } catch {}
    wrap.firstElementChild.classList.add('dg-banner--out');
    setTimeout(() => {
      wrap.remove();
      if (goProfile && n.type === 'guide_accepted') location.href = ROOT + 'profile.html';
      else if (goProfile && n.type === 'new_booking') location.href = ROOT + 'orders.html';
      else if (onClose) onClose();
    }, 350);
  }
  wrap.querySelector('.dg-banner-close').addEventListener('click', () => close(false));
  wrap.querySelector('.dg-banner-btn').addEventListener('click', () => close(true));
}

async function checkNotifications() {
  try {
    const { notifications } = await api('/api/notifications');
    if (!notifications.length) return;
    // показываем по одному: закрыл первый — появился следующий
    let i = 0;
    const next = () => { if (i < notifications.length) showBanner(notifications[i++], next); };
    next();
    // роль могла поменяться (приняли в гиды) — обновим шапку
    const { user } = await api('/api/me');
    updateHeader(user);
  } catch {}
}

// ════════ Старт ════════

(async function init() {
  try {
    const { user } = await api('/api/me');
    updateHeader(user);
    if (user) checkNotifications();
  } catch {
    updateHeader(null);
  }
})();
