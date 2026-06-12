// Карусель hero-фото при наведении на блок tp-hero

const heroImages = [
  "../image/sulak to.jpg",
  "../image/photo2.png",
  "../image/photo3.png",
  "../image/photo4.png",
  "../image/photo5.png"
];

const hero = document.querySelector(".tp-hero");
if (hero) {
  const img = hero.querySelector("img");

  // Предзагрузка всех фото
  heroImages.forEach(src => {
    const preload = new Image();
    preload.src = src;
  });

  let currentIndex = 0;
  let interval = null;
  let isTransitioning = false;

  function showNext() {
    if (isTransitioning) return;
    isTransitioning = true;

    // Плавно скрываем
    img.style.opacity = "0";

    setTimeout(() => {
      currentIndex = (currentIndex + 1) % heroImages.length;
      img.src = heroImages[currentIndex];

      // Плавно показываем
      img.style.opacity = "1";
      isTransitioning = false;
    }, 400);
  }

  hero.addEventListener("mouseenter", () => {
    if (interval) return;
    interval = setInterval(showNext, 1800);
  });

  hero.addEventListener("mouseleave", () => {
    clearInterval(interval);
    interval = null;

    // Возвращаем первое фото
    isTransitioning = true;
    img.style.opacity = "0";
    setTimeout(() => {
      currentIndex = 0;
      img.src = heroImages[0];
      img.style.opacity = "1";
      isTransitioning = false;
    }, 400);
  });
}