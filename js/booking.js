// Тестовые занятые даты (формат: "YYYY-MM-DD")
const busyDates = [
  "2026-06-07",
  "2026-06-08",
  "2026-06-14",
  "2026-06-21",
  "2026-06-22",
  "2026-07-05",
  "2026-07-12"
];

const PRICE = "2990 р";
const WEEKDAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

let selectedDate = null;

function isToday(y, m, d) {
  const t = new Date();
  return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d;
}

function isPast(y, m, d) {
  const today = new Date(); today.setHours(0,0,0,0);
  return new Date(y, m, d) < today;
}

function isBusy(y, m, d) {
  const str = `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  return busyDates.includes(str);
}

function renderMonth(year, month) {
  const monthNames = ["Январь","Февраль","Март","Апрель","Май","Июнь",
                      "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay === 0) ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = `<div class="cal-month">`;
  html += `<div class="cal-month-title">${monthNames[month]} ${year}</div>`;
  html += `<div class="cal-grid">`;

  WEEKDAYS.forEach(d => {
    html += `<div class="cal-weekday">${d}</div>`;
  });

  for (let i = 0; i < offset; i++) {
    html += `<div class="cal-day cal-day--empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    let cls = "cal-day";
    let extra = "";

    if (isPast(year, month, d)) {
      cls += " cal-day--past";
    } else if (isBusy(year, month, d)) {
      cls += " cal-day--busy";
    } else {
      cls += " cal-day--free";
      if (selectedDate === dateStr) cls += " selected";
      extra = `<span class="cal-day-price">${PRICE}</span>`;
    }

    html += `<div class="${cls}" data-date="${dateStr}">
      <span class="cal-day-num">${d}</span>${extra}
    </div>`;
  }

  html += `</div></div>`;
  return html;
}

function renderCalendar() {
  const cal = document.getElementById("bookingCalendar");
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  cal.innerHTML = renderMonth(y, m) + renderMonth(y, m + 1 > 11 ? 0 : m + 1);

  cal.querySelectorAll(".cal-day--free").forEach(el => {
    el.addEventListener("click", () => {
      selectedDate = el.dataset.date;
      renderCalendar();
    });
  });
}

// Открытие/закрытие
const overlay = document.getElementById("bookingOverlay");
const closeBtn = document.getElementById("bookingClose");

document.querySelector(".tp-btn-primary").addEventListener("click", () => {
  overlay.classList.add("active");
  renderCalendar();
});

closeBtn.addEventListener("click", () => {
  overlay.classList.remove("active");
});

overlay.addEventListener("click", (e) => {
  if (e.target === overlay) overlay.classList.remove("active");
});

const questionOverlay = document.getElementById('questionOverlay');
const questionClose = document.getElementById('questionClose');

document.querySelectorAll('.tp-btn-outline').forEach(btn => {
  btn.addEventListener('click', () => {
    questionOverlay.classList.add('active');
  });
});

questionClose.addEventListener('click', () => {
  questionOverlay.classList.remove('active');
});

questionOverlay.addEventListener('click', (e) => {
  if (e.target === questionOverlay) questionOverlay.classList.remove('active');
});

// ── ВАЛИДАЦИЯ И БРОНИРОВАНИЕ ──
function showBookingError(message) {
  // Убрать старое предупреждение если есть
  const old = document.getElementById('bookingError');
  if (old) old.remove();

  const el = document.createElement('div');
  el.id = 'bookingError';
  el.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #ffffff;
    border-radius: 20px;
    padding: 32px 36px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    z-index: 3000;
    max-width: 380px;
    width: 90%;
    text-align: center;
    font-family: 'Montserrat', sans-serif;
  `;

  el.innerHTML = `
    <div style="font-size:40px;margin-bottom:16px;">⚠️</div>
    <p style="font-size:17px;font-weight:700;color:#1a1a1a;margin-bottom:10px;">Заполните форму</p>
    <p style="font-size:14px;color:#727056;line-height:1.6;margin-bottom:24px;">${message}</p>
    <button onclick="document.getElementById('bookingError').remove()" style="
      background:#1a1a1a;
      color:#fff;
      border:none;
      padding:12px 32px;
      border-radius:100px;
      font-size:14px;
      font-weight:600;
      font-family:'Montserrat',sans-serif;
      cursor:pointer;
    ">Понятно</button>
  `;

  // Затемнение
  const backdrop = document.createElement('div');
  backdrop.id = 'bookingErrorBackdrop';
  backdrop.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 2999;
  `;
  backdrop.addEventListener('click', () => {
    el.remove();
    backdrop.remove();
  });

  document.body.appendChild(backdrop);
  document.body.appendChild(el);
}

function highlightField(input) {
  input.style.borderColor = '#e53935';
  input.addEventListener('input', () => {
    input.style.borderColor = '';
  }, { once: true });
}

document.querySelector('.booking-submit').addEventListener('click', () => {
  const name = document.querySelector('.booking-form input[type="text"]');
  const phone = document.querySelector('.booking-form input[type="tel"]');
  const email = document.querySelector('.booking-form input[type="email"]');
  const count = document.querySelector('.booking-form input[type="number"]');

  const errors = [];

  if (!selectedDate) {
    errors.push('выберите дату тура в календаре');
  }

  if (!name.value.trim()) {
    errors.push('укажите ваше имя');
    highlightField(name);
  }

  if (!phone.value.trim()) {
    errors.push('укажите номер телефона');
    highlightField(phone);
  }

  if (!email.value.trim()) {
    errors.push('укажите электронную почту');
    highlightField(email);
  }

  if (!count.value || +count.value < 1) {
    errors.push('укажите количество участников');
    highlightField(count);
  }

  if (errors.length > 0) {
    const list = errors.map(e => `• ${e}`).join('<br>');
    showBookingError(`Пожалуйста, исправьте следующее:<br><br>${list}`);
    return;
  }

  // Сохраняем данные в sessionStorage и редиректим
  sessionStorage.setItem('booking_date', selectedDate);
  sessionStorage.setItem('booking_name', name.value.trim());
  sessionStorage.setItem('booking_phone', phone.value.trim());
  sessionStorage.setItem('booking_email', email.value.trim());
  sessionStorage.setItem('booking_count', count.value);

  const path = window.location.pathname.includes('/tours/')
    ? '../booking-confirm.html'
    : 'booking-confirm.html';

  window.location.href = path;
});