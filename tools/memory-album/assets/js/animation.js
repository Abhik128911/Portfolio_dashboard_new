// Enhanced Cherry Blossom Petal Animation

const PETAL_SVGS = [
  `<svg width="32" height="32" viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="10" ry="16" fill="#ffe6f5"/><ellipse cx="16" cy="15" rx="9" ry="13" fill="#ffeeff"/><ellipse cx="16" cy="23" rx="4.5" ry="4.5" fill="#f6b1d8" opacity="0.33"/></svg>`,
  `<svg width="28" height="28" viewBox="0 0 32 32"><path d="M16 29Q13 25 8.5 19.5T7 9.5Q7.5 7 10 7q2.5 0 6 7.5T22 9.5Q22.5 7 25 9.5Q27.5 12 20 26t-4 3z" fill="#ffbde8" opacity="0.93"/></svg>`,
  `<svg width="28" height="28" viewBox="0 0 32 32"><ellipse cx="16" cy="16" rx="12" ry="5" fill="#efa3dc" opacity="0.36"/></svg>`
];

let petalContainer = document.getElementById('petal-container');
let PETAL_COUNT = window.innerWidth < 600 ? 10 : window.innerWidth < 900 ? 16 : 28;

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function createPetal() {
  const svg = PETAL_SVGS[Math.floor(Math.random() * PETAL_SVGS.length)];
  const petal = document.createElement('div');
  petal.className = 'falling-petal';
  petal.innerHTML = svg;

  // New: randomize size, blur, z-index for depth
  const size = random(18, 36);
  petal.style.width = `${size}px`;
  petal.style.height = `${size}px`;
  petal.style.left = `${random(-8, 99)}vw`;
  petal.style.top = `${random(-18, -3)}vh`;
  petal.style.opacity = random(0.62, 0.99);
  petal.style.filter = `blur(${random(0, 1.2)}px) drop-shadow(0 2px 5px #eccbe5cc)`;
  petal.style.zIndex = `${Math.floor(random(1, 3))}`;

  // Slight random rotation at start
  petal.style.transform = `rotate(${random(-20, 20)}deg)`;

  petalContainer.appendChild(petal);

  animatePetal(petal, size);
}

function animatePetal(petal, size) {
  const drift = random(-28, 28);
  const swing = random(-14, 14);
  const duration = random(7, 17);
  const fallDistance = window.innerHeight + 120 + size;

  // CSS keyframes style (for more realistic drift and sway)
  const keyframes = [
    { transform: `translateX(0px) rotate(${swing}deg)`, opacity: 1 },
    { transform: `translateX(${drift * 0.7}px) rotate(${swing * 2}deg)`, opacity: 0.97 },
    { transform: `translateY(${fallDistance}px) translateX(${drift * 2}px) rotate(${random(-80, 80)}deg)`, opacity: 0.45 }
  ];

  petal.animate(keyframes, {
    duration: duration * 1000,
    easing: 'cubic-bezier(.51,.04,.36,1)',
    fill: 'forwards'
  });

  setTimeout(() => {
    try { petal.remove(); } catch (e) {}
    createPetal();
  }, duration * 1000 - 700);
}

// Debounced responsive count on resize
let resizeTimeout = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    PETAL_COUNT = window.innerWidth < 600 ? 10 : window.innerWidth < 900 ? 16 : 28;
    resetPetals();
  }, 400);
});

function resetPetals() {
  petalContainer.innerHTML = '';
  for (let i = 0; i < PETAL_COUNT; i++) {
    setTimeout(createPetal, i * 420 + Math.random() * 400);
  }
}

// Initial load
resetPetals();
