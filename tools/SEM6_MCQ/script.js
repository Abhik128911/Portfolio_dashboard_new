// ===================== GLOBAL STATE =====================
let subjectsData = {};
let currentSubject = null;
let currentQuestions = [];
let currentIndex = 0;

// Per-session answers
let answers = {};

// Persisted progress + bookmarks
let progressData = JSON.parse(localStorage.getItem("mcq_progress_v1") || "{}");

// Timer state
let timerInterval = null;
let elapsedSeconds = 0;

// Question filter state
let questionFilter = "all";

// ===================== DOM ELEMENTS =====================

const homeSection = document.getElementById("home-section");
const quizSection = document.getElementById("quiz-section");
const subjectsContainer = document.getElementById("subjects-container");
const subjectSearchInput = document.getElementById("subject-search");

// Quiz topbar/meta
const backBtn = document.getElementById("back-btn");
const subjectShortTitle = document.getElementById("subject-short-title");
const questionIndexLabel = document.getElementById("question-index-label");
const quizTimerEl = document.getElementById("quiz-timer");
const quizAccuracyEl = document.getElementById("quiz-accuracy");

// Sidebar stats
const sidebarSubjectCode = document.getElementById("sidebar-subject-code");
const statAttempted = document.getElementById("stat-attempted");
const statCorrect = document.getElementById("stat-correct");
const statIncorrect = document.getElementById("stat-incorrect");
const resetProgressBtn = document.getElementById("reset-progress-btn");
const backHomeBtn = document.getElementById("back-home-btn");

// Question & options
const questionChip = document.getElementById("question-chip");
const questionTextEl = document.getElementById("question-text");
const optionsEl = document.getElementById("options");
const showAnswerBtn = document.getElementById("show-answer-btn");
const bookmarkBtn = document.getElementById("bookmark-btn");

// Bottom nav
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

// Nav modal
const navModal = document.getElementById("nav-modal");
const navModalOverlay = document.getElementById("nav-modal-overlay");
const openNavModalBtn = document.getElementById("open-nav-modal-btn");
const closeNavModalBtn = document.getElementById("close-nav-modal-btn");
const navModalList = document.getElementById("nav-modal-list");
const modalStatAttempted = document.getElementById("modal-stat-attempted");
const modalStatBookmarked = document.getElementById("modal-stat-bookmarked");

// Analytics Modal
const analyticsModal = document.getElementById("analytics-modal");
const analyticsContent = document.getElementById("analytics-content");

// ===================== INITIAL LOAD =====================
// You can change 'mcq.json' to 'sem6-mcq.json' if you didn't rename your file.
fetch("sem6-mcq.json") 
  .then((res) => {
    if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
    return res.json();
  })
  .then((data) => {
    if (!data || typeof data !== 'object') {
      throw new Error("Invalid JSON format");
    }
    subjectsData = data;
    renderSubjects();
  })
  .catch((err) => {
    console.error("Error loading JSON", err);
    subjectsContainer.innerHTML = '<p style="color: #c00; padding: 20px; text-align: center;">Error loading questions. Please ensure your JSON file is named correctly and accessible.</p>';
  });

// ===================== SUBJECTS =====================

function renderSubjects(filterText = "") {
  const keys = Object.keys(subjectsData);
  const filter = filterText.trim().toLowerCase();
  subjectsContainer.innerHTML = "";

  keys
    .filter((name) => name.toLowerCase().includes(filter))
    .forEach((subjectName) => {
      const questions = subjectsData[subjectName] || [];
      const p = progressData[subjectName];

      const card = document.createElement("div");
      card.className = "subject-card";
      card.onclick = () => startQuiz(subjectName);

      const body = document.createElement("div");
      body.className = "subject-card-body";

      const title = document.createElement("h3");
      title.className = "subject-title";
      title.textContent = subjectName;

      const subtitle = document.createElement("p");
      subtitle.className = "subject-subtitle";
      subtitle.textContent = `${questions.length} MCQ Questions`;

      body.appendChild(title);
      body.appendChild(subtitle);

      const footer = document.createElement("div");
      footer.className = "subject-footer";

      const completionSpan = document.createElement("span");
      const accuracySpan = document.createElement("span");

      const total = questions.length;
      if (p) {
        const attempted = p.attempted || 0;
        const correct = p.correct || 0;
        const completion = total ? Math.round((attempted / total) * 100) : 0;
        const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;
        completionSpan.textContent = `${completion}% Complete`;
        accuracySpan.textContent = `${accuracy}% Accuracy`;
      } else {
        completionSpan.textContent = "0% Complete";
        accuracySpan.textContent = "0% Accuracy";
      }

      footer.appendChild(completionSpan);
      footer.appendChild(accuracySpan);

      card.appendChild(body);
      card.appendChild(footer);
      subjectsContainer.appendChild(card);
    });

  if (!subjectsContainer.children.length) {
    const p = document.createElement("p");
    p.className = "no-subjects";
    p.textContent = "No subjects match your search.";
    subjectsContainer.appendChild(p);
  }
}

subjectSearchInput.addEventListener("input", (e) =>
  renderSubjects(e.target.value)
);

// ===================== START QUIZ =====================

function startQuiz(subjectName) {
  const questions = subjectsData[subjectName];
  if (!questions || !questions.length) return;

  currentSubject = subjectName;
  currentQuestions = questions;
  currentIndex = 0;
  answers = {};

  // Layout
  homeSection.style.display = "none";
  quizSection.style.display = "block";

  const short = subjectName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
  subjectShortTitle.textContent = short;
  sidebarSubjectCode.textContent = short;

  // Timer reset/start
  stopTimer();
  elapsedSeconds = 0;
  updateTimerLabel();
  startTimer();

  ensureSubjectProgress();
  renderStats();
  renderQuestion();
  renderNavGrid();
  updateNavButtons();
}

// ===================== RENDER QUESTION =====================

function renderQuestion() {
  const q = currentQuestions[currentIndex];
  if (!q) return;

  const total = currentQuestions.length;
  const displayIndex = currentIndex + 1;

  questionChip.textContent = `Question ${displayIndex}`;
  questionIndexLabel.textContent = `${displayIndex} / ${total}`;
  questionTextEl.textContent = q.question;

  // Reset show answer button
  showAnswerBtn.disabled = false;
  showAnswerBtn.textContent = "👁 Show Answer";

  // Options
  optionsEl.innerHTML = "";
  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "option-item";
    btn.textContent = opt;
    btn.onclick = () => handleAnswer(btn, opt, q.answer);
    optionsEl.appendChild(btn);
  });

  // Past answer (for this session)
  const state = answers[currentIndex];
  if (state) {
    const buttons = optionsEl.querySelectorAll(".option-item");
    buttons.forEach((b) => (b.disabled = true));

    buttons.forEach((b) => {
      const text = b.textContent.trim();
      if (text === q.answer) {
        b.classList.add("correct");
      }
      if (!state.correct && text === state.selected) {
        b.classList.add("incorrect");
      }
    });
    
    // Disable show answer if already answered
    showAnswerBtn.disabled = true;
    showAnswerBtn.textContent = "✓ Answer Shown";
  }

  updateBookmarkUI();
  updateNavGridStates();
}

// ===================== HANDLE ANSWER =====================

function handleAnswer(btn, selectedText, correctAnswer) {
  const buttons = optionsEl.querySelectorAll(".option-item");
  buttons.forEach((b) => (b.disabled = true));

  const isCorrect = selectedText === correctAnswer;

  buttons.forEach((b) => {
    const text = b.textContent.trim();
    if (text === correctAnswer) b.classList.add("correct");
  });

  if (!isCorrect) btn.classList.add("incorrect");

  if (!answers[currentIndex]) {
    answers[currentIndex] = {
      correct: isCorrect,
      selected: selectedText,
    };
    saveProgress(isCorrect);
  }

  showAnswerBtn.disabled = true;
  showAnswerBtn.textContent = "✓ Answered";

  renderStats();
  updateAccuracyLabel();
  updateNavGridStates();
}

// ===================== TIMER =====================

function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    elapsedSeconds++;
    updateTimerLabel();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerLabel() {
  const m = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
  const s = String(elapsedSeconds % 60).padStart(2, "0");
  if (quizTimerEl) quizTimerEl.textContent = `${m}:${s}`;
}

// ===================== PROGRESS & STATS =====================

function ensureSubjectProgress() {
  if (!currentSubject) return;
  if (!progressData[currentSubject]) {
    progressData[currentSubject] = {
      attempted: 0,
      correct: 0,
      incorrect: 0,
      perQuestion: {},
      bookmarks: {},
    };
  } else if (!progressData[currentSubject].bookmarks) {
    progressData[currentSubject].bookmarks = {};
  }
}

function saveProgress(isCorrect) {
  if (!currentSubject) return;
  ensureSubjectProgress();

  const p = progressData[currentSubject];
  const idx = currentIndex;
  const prev = p.perQuestion[idx];

  if (prev === "correct") p.correct--;
  if (prev === "incorrect") p.incorrect--;

  const status = isCorrect ? "correct" : "incorrect";
  p.perQuestion[idx] = status;

  let attempted = 0;
  let correct = 0;
  let incorrect = 0;
  Object.values(p.perQuestion).forEach((st) => {
    attempted++;
    if (st === "correct") correct++;
    if (st === "incorrect") incorrect++;
  });

  p.attempted = attempted;
  p.correct = correct;
  p.incorrect = incorrect;

  localStorage.setItem("mcq_progress_v1", JSON.stringify(progressData));
}

function renderStats() {
  const p = progressData[currentSubject];
  if (!currentSubject || !p) {
    statAttempted.textContent = "0";
    statCorrect.textContent = "0";
    statIncorrect.textContent = "0";
    updateAccuracyLabel(0);
    updateModalStats();
    return;
  }

  statAttempted.textContent = p.attempted || 0;
  statCorrect.textContent = p.correct || 0;
  statIncorrect.textContent = p.incorrect || 0;
  updateAccuracyLabel();
  updateModalStats();
}

function updateAccuracyLabel(forceValue) {
  let accuracy = 0;
  const p = progressData[currentSubject];

  if (typeof forceValue === "number") {
    accuracy = forceValue;
  } else if (p && p.attempted) {
    accuracy = Math.round((p.correct / p.attempted) * 100);
  }

  if (quizAccuracyEl) quizAccuracyEl.textContent = `${accuracy}%`;
}

// ===================== BOOKMARKS =====================

bookmarkBtn.addEventListener("click", () => {
  if (!currentSubject) return;
  ensureSubjectProgress();
  const p = progressData[currentSubject];
  const idx = currentIndex;

  if (p.bookmarks[idx]) {
    delete p.bookmarks[idx];
  } else {
    p.bookmarks[idx] = true;
  }

  localStorage.setItem("mcq_progress_v1", JSON.stringify(progressData));
  updateBookmarkUI();
  updateModalStats();
  updateNavGridStates();
});

function updateBookmarkUI() {
  ensureSubjectProgress();
  const p = progressData[currentSubject];
  const idx = currentIndex;
  const isBookmarked = p.bookmarks && p.bookmarks[idx];

  bookmarkBtn.classList.toggle("active", !!isBookmarked);
  bookmarkBtn.textContent = isBookmarked ? "★" : "☆";
}

// ===================== NAV MODAL =====================

function openNavModal() {
  if (!navModal) return;
  navModal.classList.add("open");
  navModal.setAttribute("aria-hidden", "false");
}

function closeNavModal() {
  if (!navModal) return;
  navModal.classList.remove("open");
  navModal.setAttribute("aria-hidden", "true");
}

if (openNavModalBtn) openNavModalBtn.addEventListener("click", openNavModal);
if (closeNavModalBtn) closeNavModalBtn.addEventListener("click", closeNavModal);
if (navModalOverlay) navModalOverlay.addEventListener("click", closeNavModal);

// Build navigation grid inside modal
function renderNavGrid() {
  if (!navModalList) return;
  navModalList.innerHTML = "";

  for (let i = 0; i < currentQuestions.length; i++) {
    const btn = document.createElement("button");
    btn.className = "q-num-btn";
    btn.textContent = i + 1;
    btn.onclick = () => {
      currentIndex = i;
      renderQuestion();
      updateNavButtons();
      closeNavModal();
    };
    navModalList.appendChild(btn);
  }

  updateNavGridStates();
  updateModalStats();
}

function updateNavGridStates() {
  if (!navModalList || !currentSubject) return;

  const p = progressData[currentSubject] || {};
  const perQ = p.perQuestion || {};
  const bookmarks = p.bookmarks || {};

  const buttons = Array.from(navModalList.children);
  buttons.forEach((btn, idx) => {
    btn.classList.remove("q-current", "q-correct", "q-incorrect", "q-bookmarked");

    const status = perQ[idx];
    if (status === "correct") btn.classList.add("q-correct");
    if (status === "incorrect") btn.classList.add("q-incorrect");
    if (bookmarks[idx]) btn.classList.add("q-bookmarked");
    if (idx === currentIndex) btn.classList.add("q-current");
  });
}

function updateModalStats() {
  const p = progressData[currentSubject];
  if (!currentSubject || !p) {
    modalStatAttempted.textContent = "0";
    modalStatBookmarked.textContent = "0";
    return;
  }

  modalStatAttempted.textContent = p.attempted || 0;
  const bmCount = p.bookmarks ? Object.keys(p.bookmarks).length : 0;
  modalStatBookmarked.textContent = bmCount;
}

// ===================== SHOW ANSWER =====================

showAnswerBtn.addEventListener("click", () => {
  const q = currentQuestions[currentIndex];
  if (!q) return;
  
  showAnswerBtn.disabled = true;
  showAnswerBtn.textContent = "✓ Answer Shown";
  
  const buttons = optionsEl.querySelectorAll(".option-item");
  buttons.forEach((b) => {
    const text = b.textContent.trim();
    if (text === q.answer) {
      b.classList.add("correct");
      b.focus();
    }
  });
});

// ===================== NAVIGATION =====================

function goPrev() {
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion();
    updateNavButtons();
  }
}

function goNext() {
  if (currentIndex < currentQuestions.length - 1) {
    currentIndex++;
    renderQuestion();
    updateNavButtons();
  }
}

prevBtn.addEventListener("click", goPrev);
nextBtn.addEventListener("click", goNext);

// Keyboard Navigation
document.addEventListener("keydown", (e) => {
  if (quizSection.style.display !== "none") {
    if (e.key === "ArrowRight") goNext();
    if (e.key === "ArrowLeft") goPrev();
  }
});

function updateNavButtons() {
  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === currentQuestions.length - 1;
  updateNavGridStates();
}

// ===================== RESET & BACK =====================

resetProgressBtn.addEventListener("click", () => {
  if (!currentSubject) return;
  if (!confirm("Reset all progress for this subject?")) return;

  delete progressData[currentSubject];
  localStorage.setItem("mcq_progress_v1", JSON.stringify(progressData));

  answers = {};
  ensureSubjectProgress();
  renderStats();
  renderQuestion();
  renderNavGrid();
  
  questionFilter = "all";
  currentQuestions = subjectsData[currentSubject] || [];
  renderNavGrid();
});

function goBackHome() {
  stopTimer();
  quizSection.style.display = "none";
  homeSection.style.display = "block";
  currentSubject = null;
  currentQuestions = [];
  currentIndex = 0;
  questionFilter = "all";
  closeNavModal();
  renderSubjects(subjectSearchInput.value);
}

backBtn.addEventListener("click", goBackHome);
backHomeBtn.addEventListener("click", goBackHome);

// ===================== NEW FEATURES =====================

// Feature 1: Export Progress as JSON
function exportProgressJSON() {
  const data = {
    exportDate: new Date().toISOString(),
    progress: progressData,
    summary: generateSummary()
  };
  
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mcq-progress-${new Date().getTime()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Feature 2: Export Progress as CSV
function exportProgressCSV() {
  let csv = 'Subject,Total Questions,Attempted,Correct,Incorrect,Accuracy,Bookmarks\n';
  
  Object.keys(progressData).forEach(subject => {
    const p = progressData[subject];
    const questions = subjectsData[subject] || [];
    const accuracy = p.attempted ? Math.round((p.correct / p.attempted) * 100) : 0;
    const bookmarks = p.bookmarks ? Object.keys(p.bookmarks).length : 0;
    
    // Escape subject strings in case they have commas
    const safeSubject = `"${subject.replace(/"/g, '""')}"`;
    
    csv += `${safeSubject},${questions.length},${p.attempted || 0},${p.correct || 0},${p.incorrect || 0},${accuracy}%,${bookmarks}\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mcq-progress-${new Date().getTime()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Feature 3: Generate Summary Statistics
function generateSummary() {
  let totalQuestions = 0;
  let totalAttempted = 0;
  let totalCorrect = 0;
  let totalBookmarks = 0;
  
  // Count questions in all loaded subjects
  Object.keys(subjectsData).forEach(s => totalQuestions += subjectsData[s].length);

  Object.keys(progressData).forEach(subject => {
    const p = progressData[subject];
    totalAttempted += p.attempted || 0;
    totalCorrect += p.correct || 0;
    totalBookmarks += (p.bookmarks ? Object.keys(p.bookmarks).length : 0);
  });
  
  return {
    totalSubjects: Object.keys(subjectsData).length,
    totalQuestions,
    totalAttempted,
    totalCorrect,
    totalIncorrect: totalAttempted - totalCorrect,
    overallAccuracy: totalAttempted ? Math.round((totalCorrect / totalAttempted) * 100) : 0,
    totalBookmarks
  };
}

// Feature 4: Display Performance Analytics in Modal
function showAnalytics() {
  const summary = generateSummary();
  
  analyticsContent.innerHTML = `
    <div class="analytics-grid">
      <div class="analytics-stat-box">
        <strong>${summary.totalSubjects}</strong>
        <span>Subjects Available</span>
      </div>
      <div class="analytics-stat-box">
        <strong>${summary.totalQuestions}</strong>
        <span>Total Questions</span>
      </div>
      <div class="analytics-stat-box">
        <strong>${summary.totalAttempted}</strong>
        <span>Questions Attempted</span>
      </div>
      <div class="analytics-stat-box">
        <strong>${summary.totalBookmarks}</strong>
        <span>Bookmarked</span>
      </div>
      <div class="analytics-stat-box">
        <strong style="color: var(--success);">${summary.totalCorrect}</strong>
        <span>Correct Answers</span>
      </div>
      <div class="analytics-stat-box">
        <strong style="color: var(--primary);">${summary.overallAccuracy}%</strong>
        <span>Overall Accuracy</span>
      </div>
    </div>
  `;
  
  analyticsModal.classList.add('open');
  analyticsModal.setAttribute('aria-hidden', 'false');
}

function closeAnalytics() {
  analyticsModal.classList.remove('open');
  analyticsModal.setAttribute('aria-hidden', 'true');
}

// Feature 5: Clear All Data
function clearAllData() {
  if (!confirm("⚠️  This will delete ALL progress data across all subjects. Are you sure?")) return;
  if (!confirm("⚠️  LAST CHANCE: This cannot be undone!")) return;
  
  localStorage.removeItem("mcq_progress_v1");
  progressData = {};
  location.reload();
}

// Feature 6: Dark Mode Toggle
function toggleDarkMode() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }
}

// Load saved theme
window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
});