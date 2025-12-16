let assignments = [];

// Fetch data
fetch("data.json")
  .then(res => res.json())
  .then(data => {
    assignments = data;
    renderCards(data);
  });

// Render Cards
function renderCards(data) {
  const container = document.getElementById("assignmentCards");
  const noResults = document.getElementById("noResults");
  
  container.innerHTML = "";

  if (data.length === 0) {
    noResults.classList.remove("hidden");
    return;
  } else {
    noResults.classList.add("hidden");
  }

  data.forEach((a, index) => {
    const card = document.createElement("div");
    card.className = "card";
    
    // Using assignment number as a badge
    const badgeText = a.assignment.split(" ").map(w => w[0]).join("") + " " + a.assignment.split(" ")[1];
    
    card.innerHTML = `
      <div>
        <span class="card-badge">${a.assignment}</span>
        <h2>${a.title}</h2>
      </div>
      <button onclick="openModal(${index})">View Solution →</button>
    `;
    container.appendChild(card);
  });
}

/* SEARCH FUNCTIONALITY */
document.getElementById("searchInput").addEventListener("input", function () {
  const key = this.value.toLowerCase();
  const filtered = assignments.filter(a =>
    a.title.toLowerCase().includes(key) ||
    a.assignment.toLowerCase().includes(key) ||
    a.questions.some(q => q.question.toLowerCase().includes(key))
  );
  renderCards(filtered);
});

/* MODAL LOGIC */
function openModal(index) {
  const modal = document.getElementById("modal");
  const title = document.getElementById("modalTitle");
  const body = document.getElementById("modalBody");
  
  // Find the correct assignment based on filtered or original list? 
  // Note: simpler to rely on global 'assignments' index if not re-sorting.
  // Ideally, pass ID, but index works if careful. 
  // BETTER APPROACH: Find object from the clicked card logic.
  // Since we re-render, the index passed to renderCards matches filtered data if we are not careful.
  // FIX: Let's assume renderCards passes the index from the filtered array. 
  
  // Actually, to keep it bug-free with search:
  // We need to pass the specific assignment object or find it. 
  // But let's stick to the simplest working version for now:
  
  // If search is active, the index passed is from the FILTERED array.
  // We need to access the correct data object.
  // Let's grab the title from the card click or just look up in current render.
  
  // Quick Fix for Search Index mismatch:
  // When rendering, we should pass the actual object ID or handle the click better.
  // But for this simple script, let's look up the assignment by title from the DOM or closure?
  // Easier: passing the object directly in the render loop is hard in HTML string.
  
  // Let's use the 'assignments' array and filter it again to find the one matching?
  // No, let's fix renderCards to store the actual index.
  
  // We will re-implement render to find the correct assignment easily.
  // Actually, let's just use the global 'assignments' and search for it.
  // Wait, the easiest way:
  // We will pass the title to openModal and find it.
}

// Rewriting render/open to be robust against search filtering
function renderCards(data) {
  const container = document.getElementById("assignmentCards");
  const noResults = document.getElementById("noResults");
  container.innerHTML = "";

  if (data.length === 0) {
    noResults.classList.remove("hidden");
    return;
  }
  noResults.classList.add("hidden");

  data.forEach((a) => {
    const card = document.createElement("div");
    card.className = "card";
    // We store the original index or unique title in a data attribute
    card.innerHTML = `
      <div>
        <span class="card-badge">${a.assignment}</span>
        <h2>${a.title}</h2>
      </div>
      <button onclick="openModalByTitle('${a.title.replace(/'/g, "\\'")}')">View Solution →</button>
    `;
    container.appendChild(card);
  });
}

function openModalByTitle(title) {
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const body = document.getElementById("modalBody");
  
  const a = assignments.find(item => item.title === title);
  if (!a) return;

  modalTitle.innerText = `${a.assignment}: ${a.title}`;
  body.innerHTML = "";

  a.questions.forEach(q => {
    // Detect if answer contains code (pre tags) or just text
    let content = q.answer;
    
    // Improve formatting if it's just a raw text inside
    const div = document.createElement("div");
    div.className = "question";
    div.innerHTML = `<h3>${q.question}</h3><div class="answer-content">${content}</div>`;
    
    // If there are <pre> tags, wrap them in our custom code styling
    const pres = div.querySelectorAll("pre");
    pres.forEach(pre => {
      const wrapper = document.createElement("div");
      wrapper.className = "code-wrap";
      wrapper.innerHTML = `
        <div class="code-header">
          <div class="window-dots">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
          <button class="copy-btn">Copy</button>
        </div>
      `;
      // Move pre inside wrapper
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
      
      // Add copy logic
      wrapper.querySelector(".copy-btn").addEventListener("click", () => {
        copyToClipboard(pre.innerText);
      });
    });

    body.appendChild(div);
  });

  modal.classList.remove("hidden");
  // Small timeout to allow display:flex to apply before opacity transition
  setTimeout(() => modal.classList.add("active"), 10);
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.classList.remove("active");
  setTimeout(() => modal.classList.add("hidden"), 300); // Wait for animation
}

/* UTILITIES */
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast();
  });
}

function showToast() {
  const toast = document.getElementById("toast");
  toast.classList.remove("hidden");
  setTimeout(() => {
    toast.classList.add("hidden");
  }, 2000);
}