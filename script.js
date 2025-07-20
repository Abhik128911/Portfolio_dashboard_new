document.addEventListener('DOMContentLoaded', () => {

    // Helper function to select elements
    const select = (selector) => document.querySelector(selector);
    const selectAll = (selector) => document.querySelectorAll(selector);

    // ===== Theme Switcher Logic =====
    const themeToggle = select('.theme-toggle');
    const themePalette = select('.theme-palette');
    const colorOptions = selectAll('.color-option');
    const root = document.documentElement;

    // Function to apply a theme
    const applyTheme = (color) => {
        root.style.setProperty('--accent-color', color);
        localStorage.setItem('portfolio-theme', color);
    };

    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('portfolio-theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    }

    // Toggle palette visibility
    themeToggle.addEventListener('click', () => {
        themePalette.classList.toggle('active');
    });

    // Change theme on color selection
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            const color = option.getAttribute('data-color');
            applyTheme(color);
            themePalette.classList.remove('active');
        });
    });

    // ===== Project Modal Handling =====
    const projectCards = selectAll('.project-card');
    const modal = select('#project-modal');
    const closeModalBtn = select('.close-btn');

    const modalImg = select('#modal-img');
    const modalTitle = select('#modal-title');
    const modalDescription = select('#modal-description');
    const modalLink = select('#modal-link');

    projectCards.forEach(card => {
        const viewBtn = card.querySelector('.view-project-btn');
        viewBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            
            const title = card.dataset.title;
            const image = card.dataset.image;
            const description = card.dataset.description;
            const link = card.dataset.link;

            modalTitle.textContent = title;
            modalImg.src = image;
            modalImg.alt = title;
            modalDescription.textContent = description;
            modalLink.href = link;

            modal.style.display = 'block';
        });
    });

    const closeModal = () => {
        modal.style.display = 'none';
    };

    closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Close modal with Escape key for accessibility
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.style.display === 'block') {
            closeModal();
        }
    });

    // ===== Collapsible Tool Categories =====
    const categoryHeaders = selectAll('.category-header');

    categoryHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            header.classList.toggle('collapsed');
            content.classList.toggle('collapsed');
        });
    });

    // ===== Time Widget =====
    const timeElement = select('#current-time');
    const dateElement = select('#current-date');

    function updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateString = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        timeElement.textContent = timeString;
        dateElement.textContent = dateString;
    }

    updateTime();
    setInterval(updateTime, 1000);

   
});

    // ===== Responsive Navigation Menu =====
    const navToggle = select('.nav-toggle');
   const navMenu = select('.nav-menu');

   navToggle.addEventListener('click', () => {
       navMenu.classList.toggle('active');
   });
