import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCvUydzR0I4F5EqX5YoKUvjBUi3hI8kxcA",
  authDomain: "alvtur-9bf14.firebaseapp.com",
  projectId: "alvtur-9bf14",
  storageBucket: "alvtur-9bf14.firebasestorage.app",
  messagingSenderId: "416602996944",
  appId: "1:416602996944:web:7348c8d3839affe574ded5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const authOverlay = document.getElementById('authOverlay');
const authClose = document.getElementById('authClose');
const authTabs = document.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

document.getElementById('authOpenBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (!document.getElementById('userDropdown')) {
    authOverlay.classList.add('active');
  }
});

document.getElementById('regOpenBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  authOverlay.classList.add('active');
  authTabs.forEach(t => t.classList.remove('active'));
  document.querySelector('[data-tab="register"]').classList.add('active');
  loginForm.style.display = 'none';
  registerForm.style.display = 'block';
});

authClose?.addEventListener('click', () => authOverlay.classList.remove('active'));
authOverlay?.addEventListener('click', (e) => {
  if (e.target === authOverlay) authOverlay.classList.remove('active');
});

authTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    authTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    if (tab.dataset.tab === 'login') {
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
    } else {
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
    }
  });
});

document.getElementById('googleBtn')?.addEventListener('click', () => {
  signInWithPopup(auth, provider)
    .then((result) => {
      authOverlay.classList.remove('active');
      updateHeader(result.user);
    })
    .catch((error) => console.error(error));
});

document.getElementById('googleBtn2')?.addEventListener('click', () => {
  signInWithPopup(auth, provider)
    .then((result) => {
      authOverlay.classList.remove('active');
      updateHeader(result.user);
    })
    .catch((error) => console.error(error));
});

document.getElementById('loginBtn')?.addEventListener('click', () => {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  signInWithEmailAndPassword(auth, email, password)
    .then((result) => {
      authOverlay.classList.remove('active');
      updateHeader(result.user);
    })
    .catch((error) => alert('Ошибка: ' + error.message));
});

document.getElementById('registerBtn')?.addEventListener('click', () => {
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  createUserWithEmailAndPassword(auth, email, password)
    .then((result) => {
      authOverlay.classList.remove('active');
      updateHeader(result.user);
    })
    .catch((error) => alert('Ошибка: ' + error.message));
});

function updateHeader(user) {
  const loginBtn = document.getElementById('authOpenBtn');
  const regBtn = document.getElementById('regOpenBtn');

  if (user) {
    if (regBtn) regBtn.style.display = 'none';

    loginBtn.textContent = user.displayName || user.email;
    loginBtn.classList.add('user-menu-btn');

    const oldMenu = document.getElementById('userDropdown');
    if (oldMenu) oldMenu.remove();

    const dropdown = document.createElement('div');
    dropdown.id = 'userDropdown';
    dropdown.className = 'user-dropdown';
    dropdown.innerHTML = `
      <a href="#">Мои заказы</a>
      <a href="#">Промокоды</a>
      <a href="#">Профиль</a>
      <a href="#" id="logoutBtn">Выход</a>
    `;

    loginBtn.parentElement.style.position = 'relative';
    loginBtn.parentElement.appendChild(dropdown);

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
      e.preventDefault();
      signOut(auth);
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
    loginBtn.onclick = (e) => {
      e.preventDefault();
      authOverlay.classList.add('active');
    };
    const oldMenu = document.getElementById('userDropdown');
    if (oldMenu) oldMenu.remove();
  }
}

onAuthStateChanged(auth, updateHeader);