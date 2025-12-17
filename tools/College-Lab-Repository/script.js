let allSubjects = [];
let currentAssignments = [];
let currentSubjectInfo = null;
let currentView = 'subjects'; // 'subjects' or 'assignments'

// DOM Elements
const subjectContainer = document.getElementById("subjectContainer");
const assignmentContainer = document.getElementById("assignmentContainer");
const searchInput = document.getElementById("searchInput");
const backBtn = document.getElementById("backBtn");
const pageTitle = document.getElementById("pageTitle");
const pageDesc = document.getElementById("pageDesc");
const noResults = document.getElementById("noResults");

// --- INITIAL LOAD ---
// Fetch the "Menu" (subjects.json)
fetch("subjects.json")
  .then(res => res.json())
  .then(data => {
    allSubjects = data;
    renderSubjects(data);
  })
  .catch(err => console.error("Error loading subjects:", err));


// --- RENDER FUNCTIONS ---

// 1. Render Subject Cards (Home Screen)
function renderSubjects(data) {
  currentView = 'subjects';
  
  // Update UI for Home
  subjectContainer.classList.remove("hidden");
  assignmentContainer.classList.add("hidden");
  backBtn.classList.add("hidden");
  
  pageTitle.innerText = "🎓 College Lab Repository";
  pageDesc.innerText = "Select a subject to view assignments";
  searchInput.placeholder = "Search subjects...";
  searchInput.value = ""; 

  subjectContainer.innerHTML = "";

  if (data.length === 0) {
    noResults.classList.remove("hidden");
    return;
  }
  noResults.classList.add("hidden");

  data.forEach(subject => {
    const card = document.createElement("div");
    card.className = "card subject-card";
    // We pass the ID to the openSubject function
    card.innerHTML = `
      <div class="subject-icon">${subject.icon}</div>
      <h2>${subject.subjectName}</h2>
      <p class="subject-desc">${subject.description}</p>
      <button onclick="openSubject('${subject.id}')">View Assignments →</button>
    `;
    subjectContainer.appendChild(card);
  });
}

// 2. Open Subject & Fetch Specific Data
function openSubject(id) {
  const subject = allSubjects.find(s => s.id === id);
  if (!subject) return;

  currentSubjectInfo = subject;
  
  // Show loading state (optional but good practice)
  assignmentContainer.innerHTML = "<p style='text-align:center; margin-top:2rem;'>Loading assignments...</p>";
  
  // Update UI Header immediately
  pageTitle.innerText = `${subject.icon} ${subject.subjectName}`;
  pageDesc.innerText = "Browse assignments and solutions below";
  searchInput.placeholder = "Search assignments...";
  searchInput.value = "";
  
  subjectContainer.classList.add("hidden");
  assignmentContainer.classList.remove("hidden");
  backBtn.classList.remove("hidden");
  currentView = 'assignments';

  // FETCH THE SPECIFIC FILE FOR THIS SUBJECT
  fetch(subject.file)
    .then(res => res.json())
    .then(data => {
      currentAssignments = data;
      renderAssignments(currentAssignments);
    })
    .catch(err => {
      console.error("Error loading assignments:", err);
      assignmentContainer.innerHTML = "<p class='error'>Failed to load assignments.</p>";
    });
}

// 3. Render Assignment Cards
function renderAssignments(assignments) {
  assignmentContainer.innerHTML = "";

  if (assignments.length === 0) {
    noResults.classList.remove("hidden");
    return;
  }
  noResults.classList.add("hidden");

  assignments.forEach((a) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div>
        <span class="card-badge">${a.assignment}</span>
        <h2>${a.title}</h2>
      </div>
      <button onclick="openModalByTitle('${a.title.replace(/'/g, "\\'")}')">View Solution →</button>
    `;
    assignmentContainer.appendChild(card);
  });
}

// 4. Go Back
function goBack() {
  currentSubjectInfo = null;
  currentAssignments = [];
  renderSubjects(allSubjects);
}

// --- SEARCH FUNCTIONALITY ---

searchInput.addEventListener("input", function () {
  const key = this.value.toLowerCase();

  if (currentView === 'subjects') {
    // Search in Subjects List
    const filteredSubjects = allSubjects.filter(s => 
      s.subjectName.toLowerCase().includes(key) || 
      s.description.toLowerCase().includes(key)
    );
    // Re-render subjects manually to avoid full reset
    subjectContainer.innerHTML = "";
    if (filteredSubjects.length === 0) {
      noResults.classList.remove("hidden");
    } else {
      noResults.classList.add("hidden");
      filteredSubjects.forEach(subject => {
        const card = document.createElement("div");
        card.className = "card subject-card";
        card.innerHTML = `
          <div class="subject-icon">${subject.icon}</div>
          <h2>${subject.subjectName}</h2>
          <p class="subject-desc">${subject.description}</p>
          <button onclick="openSubject('${subject.id}')">View Assignments →</button>
        `;
        subjectContainer.appendChild(card);
      });
    }

  } else {
    // Search in Current Assignments List
    const filteredAssignments = currentAssignments.filter(a =>
      a.title.toLowerCase().includes(key) ||
      a.assignment.toLowerCase().includes(key) ||
      a.questions.some(q => q.question.toLowerCase().includes(key))
    );
    renderAssignments(filteredAssignments);
  }
});

// --- MODAL & UTILITIES (No changes here, kept for completeness) ---

function openModalByTitle(title) {
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const body = document.getElementById("modalBody");
  
  // Look in the currently loaded assignments
  const a = currentAssignments.find(item => item.title === title);
  if (!a) return;

  modalTitle.innerText = `${a.assignment}: ${a.title}`;
  body.innerHTML = "";

  a.questions.forEach(q => {
    let content = q.answer;
    const div = document.createElement("div");
    div.className = "question";
    div.innerHTML = `<h3>${q.question}</h3><div class="answer-content">${content}</div>`;
    
    const pres = div.querySelectorAll("pre");
    pres.forEach(pre => {
      const wrapper = document.createElement("div");
      wrapper.className = "code-wrap";
      wrapper.innerHTML = `
        <div class="code-header">
          <div class="window-dots">
            <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
          </div>
          <button class="copy-btn">Copy</button>
        </div>
      `;
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
      
      wrapper.querySelector(".copy-btn").addEventListener("click", () => {
        copyToClipboard(pre.innerText);
      });
    });
    body.appendChild(div);
  });

  modal.classList.remove("hidden");
  setTimeout(() => modal.classList.add("active"), 10);
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.classList.remove("active");
  setTimeout(() => modal.classList.add("hidden"), 300);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    const toast = document.getElementById("toast");
    toast.classList.remove("hidden");
    setTimeout(() => { toast.classList.add("hidden"); }, 2000);
  });
}