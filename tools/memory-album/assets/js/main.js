// Book Album: Dynamic Responsive Memory Loader & Page Animation
const bookContainer = document.getElementById('album-book-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

let memories = [];
let currentPair = 0;
let isMobile = window.innerWidth < 700;

// Listen for resize to switch between spread/single mode
window.addEventListener('resize', () => {
  const newMobile = window.innerWidth < 700;
  if (newMobile !== isMobile) {
    isMobile = newMobile;
    renderSpread(currentPair, true);
  }
});

// Fetch memories and render
fetch('data/memories.json')
  .then(r => r.json())
  .then(data => {
    memories = data;
    renderSpread(0);
  });

// Render one (mobile) or two (desktop) album pages
function renderSpread(pairIdx, preserveEnd = false) {
  bookContainer.innerHTML = '';
  let leftIdx, rightIdx;

  if (isMobile) {
    // For mobile, show one page at a time; treat all as a "spread" list.
    leftIdx = pairIdx;
    rightIdx = null;
    if (preserveEnd && pairIdx > memories.length - 1) leftIdx = memories.length - 1;
  } else {
    // For desktop, show a spread (left and right)
    leftIdx = pairIdx * 2;
    rightIdx = leftIdx + 1;
    if (preserveEnd && leftIdx > memories.length - 2) leftIdx = Math.max(0, memories.length - 2), rightIdx = memories.length - 1;
  }

  // Left page (or mobile single page)
  if (leftIdx < memories.length) {
    const pageL = createPage(memories[leftIdx], isMobile ? 'single' : 'left');
    bookContainer.appendChild(pageL);
  }
  // Right page (desktop only)
  if (!isMobile && rightIdx !== null && rightIdx < memories.length) {
    const pageR = createPage(memories[rightIdx], 'right');
    bookContainer.appendChild(pageR);
  }
  currentPair = pairIdx;
  updateNav();
}

// Create a page (photo/message)
function createPage(memory, side) {
  const pageDiv = document.createElement('div');
  pageDiv.className = `page ${side} frame-${memory.frame || ''} ${memory.type === 'message' ? 'message' : ''}`;
  if (memory.type === 'photo') {
    const img = document.createElement('img');
    img.className = 'photo';
    img.src = memory.img;
    img.alt = memory.caption || 'Memory photo';
    pageDiv.appendChild(img);
    if (memory.caption) {
      const caption = document.createElement('div');
      caption.className = 'caption';
      caption.textContent = memory.caption;
      pageDiv.appendChild(caption);
    }
  } else if (memory.type === 'message') {
    const msg = document.createElement('div');
    msg.className = 'message-text';
    msg.textContent = memory.text;
    pageDiv.appendChild(msg);
  }
  return pageDiv;
}

// Navigation controls
prevBtn.addEventListener('click', () => {
  if (currentPair > 0) animateSpread('left', () => renderSpread(currentPair - 1));
});
nextBtn.addEventListener('click', () => {
  if (isMobile) {
    if (currentPair < memories.length - 1) animateSpread('right', () => renderSpread(currentPair + 1));
  } else {
    if ((currentPair + 1) * 2 < memories.length) animateSpread('right', () => renderSpread(currentPair + 1));
  }
});

// Book-like page slide/flip
function animateSpread(direction, onComplete) {
  const pages = bookContainer.querySelectorAll('.page');
  pages.forEach(p => {
    p.style.transition = 'transform 0.55s cubic-bezier(.77,-0.02,.44,1.01), opacity 0.49s';
    if (direction === 'right') {
      p.style.transform = isMobile
        ? 'rotateY(-55deg) scale(0.92) translateX(-25vw) skewY(-7deg)'
        : 'rotateY(-70deg) scale(0.9) translateX(-30vw) skewY(-7deg)';
    } else {
      p.style.transform = isMobile
        ? 'rotateY(55deg) scale(0.92) translateX(25vw) skewY(7deg)'
        : 'rotateY(70deg) scale(0.9) translateX(30vw) skewY(7deg)';
    }
    p.style.opacity = '0.18';
  });
  setTimeout(() => {
    onComplete();
    pages.forEach(p => {
      p.style.transition = '';
      p.style.transform = '';
      p.style.opacity = '';
    });
  }, 410);
}

// Update navigation button states
function updateNav() {
  prevBtn.disabled = currentPair === 0;
  if (isMobile) {
    nextBtn.disabled = currentPair === memories.length - 1;
  } else {
    nextBtn.disabled = (currentPair + 1) * 2 >= memories.length;
  }
}

// Keyboard navigation
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') prevBtn.click();
  if (e.key === 'ArrowRight') nextBtn.click();
});

// Touch swipe navigation for mobile
let touchStartX = null, touchStartY = null;
bookContainer.addEventListener('touchstart', e => {
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
});
bookContainer.addEventListener('touchend', e => {
  if (touchStartX === null || touchStartY === null) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
    if (dx < 0 && !nextBtn.disabled) nextBtn.click();
    else if (dx > 0 && !prevBtn.disabled) prevBtn.click();
  }
  touchStartX = touchStartY = null;
});
