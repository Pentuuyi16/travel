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
      ${isGuide
        ? `<a href="${ROOT}guide-bookings.html">Заказы клиентов</a>`
        : `<a href="${ROOT}orders.html">Мои заказы</a>`}
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
    // баннеры показываем только для важных разовых событий
    const bannerTypes = ['guide_accepted', 'guide_rejected'];
    const forBanner = notifications.filter(n => bannerTypes.includes(n.type));
    let i = 0;
    const next = () => { if (i < forBanner.length) showBanner(forBanner[i++], next); };
    next();
    // роль могла поменяться (приняли в гиды)
    const { user } = await api('/api/me');
    updateHeader(user);
    // строим колокольчик со всеми уведомлениями
    buildBell();
  } catch {}
}


// ── КОЛОКОЛЬЧИК УВЕДОМЛЕНИЙ ──
const bellCSS = `
.dg-bell{position:relative;background:#e6effe;border:none;cursor:pointer;
  width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  margin-right:10px;padding:0;transition:background .2s}
.dg-bell:hover{background:#d4e3f7}
.dg-bell svg{width:19px;height:19px;display:block}
.dg-bell-badge{position:absolute;top:-2px;right:-2px;background:#e53935;color:#fff;font-size:10px;
  font-weight:700;min-width:18px;height:18px;border-radius:10px;display:flex;align-items:center;
  justify-content:center;padding:0 4px;font-family:'Montserrat',sans-serif;
  border:2px solid #fff;box-sizing:border-box}
.dg-bell-menu{position:absolute;top:calc(100% + 12px);right:0;width:340px;max-width:90vw;
  background:#fff;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.18);overflow:hidden;
  opacity:0;pointer-events:none;transform:translateY(-8px);transition:opacity .2s,transform .2s;
  z-index:300}
.dg-bell-menu.active{opacity:1;pointer-events:all;transform:translateY(0)}
.dg-bell-head{padding:14px 18px;font-size:14px;font-weight:700;color:#1a1a1a;
  border-bottom:1px solid rgba(0,0,0,.07);font-family:'Montserrat',sans-serif}
.dg-bell-list{max-height:380px;overflow-y:auto}
.dg-bell-item{display:block;padding:14px 18px;border-bottom:1px solid rgba(0,0,0,.05);
  text-decoration:none;color:inherit;transition:background .15s;cursor:pointer}
.dg-bell-item:hover{background:#f5f5f2}
.dg-bell-item:last-child{border-bottom:none}
.dg-bell-item-title{font-size:13.5px;font-weight:700;color:#1a1a1a;margin-bottom:3px;
  font-family:'Montserrat',sans-serif}
.dg-bell-item-msg{font-size:12.5px;color:#727056;line-height:1.5;font-family:'Montserrat',sans-serif}
.dg-bell-empty{padding:40px 18px;text-align:center;color:#aaa;font-size:13px;
  font-family:'Montserrat',sans-serif}
`;
(function injectBellCSS(){
  const s=document.createElement('style');
  s.textContent=bellCSS;
  document.head.appendChild(s);
})();

async function buildBell(){
  const loginBtn=document.getElementById('authOpenBtn');
  if(!loginBtn||!window.dagtourUser) return;

  // не дублируем
  document.getElementById('dgBell')?.remove();

  let notifs=[];
  try{
    const r=await api('/api/notifications');
    notifs=r.notifications||[];
  }catch{ return; }

  const bell=document.createElement('button');
  bell.id='dgBell';
  bell.className='dg-bell';
  bell.innerHTML=`
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.5a6 6 0 0 0-6 6c0 3.5-1 5-1.8 5.8-.5.5-.2 1.4.5 1.4h14.6c.7 0 1-.9.5-1.4C19 13.5 18 12 18 8.5a6 6 0 0 0-6-6Z"
        stroke="#4e75a6" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" stroke="#4e75a6" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
    ${notifs.length?`<span class="dg-bell-badge">${notifs.length}</span>`:''}`;;

  const menu=document.createElement('div');
  menu.className='dg-bell-menu';
  menu.innerHTML=`
    <div class="dg-bell-head">Уведомления</div>
    <div class="dg-bell-list">
      ${notifs.length
        ? notifs.map(n=>`
          <a class="dg-bell-item" ${n.link?`href="${ROOT}${n.link}"`:''}>
            <div class="dg-bell-item-title">${(n.title||'').replace(/</g,'&lt;')}</div>
            <div class="dg-bell-item-msg">${(n.message||'').replace(/</g,'&lt;')}</div>
          </a>`).join('')
        : `<div class="dg-bell-empty">Новых уведомлений нет</div>`}
    </div>`;

  // вставляем колокольчик ПЕРЕД кнопкой имени
  loginBtn.parentElement.style.position='relative';
  loginBtn.parentElement.insertBefore(bell, loginBtn);
  bell.parentElement.appendChild(menu);

  bell.addEventListener('click', async (e)=>{
    e.preventDefault();
    e.stopPropagation();
    const opening=!menu.classList.contains('active');
    menu.classList.toggle('active');
    if(opening && notifs.length){
      // пометить всё прочитанным, убрать бейдж
      try{ await api('/api/notifications/read-all',{method:'POST'}); }catch{}
      bell.querySelector('.dg-bell-badge')?.remove();
    }
  });

  document.addEventListener('click',(e)=>{
    if(!bell.contains(e.target)&&!menu.contains(e.target)) menu.classList.remove('active');
  });
}
window.buildBell=buildBell;

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
