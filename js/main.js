const slides = document.querySelector(".slides");
const title = document.querySelector(".hero-title");
const left = document.querySelector(".click.left");
const right = document.querySelector(".click.right");
const header = document.querySelector(".header");
const girl = document.querySelector(".girl");
const heroText = document.querySelector(".hero-text");

// Анимация появления при загрузке
window.addEventListener("load", () => {
  setTimeout(() => {
    header.classList.add("visible");
  }, 100);

  setTimeout(() => {
    girl.classList.add("visible");
  }, 200);

  setTimeout(() => {
    heroText.classList.add("visible");
  }, 400);
});

const titles = [
  "image/sulak.png",
  "image/gunib.png",
  "image/derbent.png",
  "image/gamsutl.png",
  "image/hunzah.png"
];

const bgImages = [
  "image/gunib bg.png",
  "image/sulak bg.png",
  "image/derbent bg.png",
  "image/gamsutl bg.png",
  "image/hunzah bg.png"
];

[...titles, ...bgImages].forEach(src => {
  const img = new Image();
  img.src = src;
});

const firstClone = slides.children[0].cloneNode(true);
const lastClone = slides.children[slides.children.length - 1].cloneNode(true);

slides.appendChild(firstClone);
slides.insertBefore(lastClone, slides.children[0]);

const total = titles.length;
let index = 1;
let allow = true;

slides.style.transition = "none";
slides.style.transform = `translateX(-${index * 100}vw)`;
slides.style.width = `${(total + 2) * 100}vw`;

function goTo(i, animate = true) {
  if (animate) {
    slides.style.transition = "transform 2s cubic-bezier(.76,0,.24,1)";
  } else {
    slides.style.transition = "none";
  }
  slides.style.transform = `translateX(-${i * 100}vw)`;
}

function updateTitle(i) {
  let realIndex = i - 1;
  if (realIndex < 0) realIndex = total - 1;
  if (realIndex >= total) realIndex = 0;

  title.style.opacity = "0";
  setTimeout(() => {
    title.src = titles[realIndex];
    title.style.opacity = "1";
  }, 400);
}

right.addEventListener("click", () => {
  if (!allow) return;
  allow = false;

  index++;
  goTo(index);
  updateTitle(index);

  setTimeout(() => {
    if (index >= total + 1) {
      index = 1;
      goTo(index, false);
    }
    allow = true;
  }, 2000);
});

left.addEventListener("click", () => {
  if (!allow) return;
  allow = false;

  index--;
  goTo(index);
  updateTitle(index);

  setTimeout(() => {
    if (index <= 0) {
      index = total;
      goTo(index, false);
    }
    allow = true;
  }, 2000);
});

// Анимация цифр
const statNums = document.querySelectorAll(".stat-num");

function animateCount(el) {
  const target = parseInt(el.dataset.target);
  const duration = 2000;
  const step = 16;
  const increment = target / (duration / step);
  let current = 0;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = Math.floor(current).toLocaleString("ru") + "+";
  }, step);
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCount(entry.target);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

statNums.forEach(num => observer.observe(num));
// Карусель отзывов — центрированная
const reviewCards = document.querySelectorAll(".review-card");
const arrowLeft  = document.querySelector(".reviews-arrow--left");
const arrowRight = document.querySelector(".reviews-arrow--right");
const totalReviews = reviewCards.length;
let activeIndex = 2; // начинаем с Алены (индекс 2)

function updateCarousel() {
  reviewCards.forEach((card, i) => {
    card.classList.remove("rc-active", "rc-prev", "rc-next", "rc-hidden");

    const prev = (activeIndex - 1 + totalReviews) % totalReviews;
    const next = (activeIndex + 1) % totalReviews;

    if (i === activeIndex) {
      card.classList.add("rc-active");
    } else if (i === prev) {
      card.classList.add("rc-prev");
    } else if (i === next) {
      card.classList.add("rc-next");
    } else {
      card.classList.add("rc-hidden");
    }
  });
}

arrowRight.addEventListener("click", () => {
  activeIndex = (activeIndex + 1) % totalReviews;
  updateCarousel();
});

arrowLeft.addEventListener("click", () => {
  activeIndex = (activeIndex - 1 + totalReviews) % totalReviews;
  updateCarousel();
});

updateCarousel();