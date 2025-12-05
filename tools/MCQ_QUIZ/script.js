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

// ===================== INITIAL LOAD =====================

fetch("mcq.json")
  .then((res) => res.json())
  .then((data) => {
    subjectsData = data;
    renderSubjects();
  })
  .catch((err) => console.error("Error loading mcq.json", err));

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
      subtitle.textContent = `${subjectName} MCQ Questions`;

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
  const buttons = optionsEl.querySelectorAll(".option-item");
  buttons.forEach((b) => {
    const text = b.textContent.trim();
    if (text === q.answer) b.classList.add("correct");
  });
});

// ===================== NAVIGATION BUTTONS =====================

prevBtn.addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion();
    updateNavButtons();
  }
});

nextBtn.addEventListener("click", () => {
  if (currentIndex < currentQuestions.length - 1) {
    currentIndex++;
    renderQuestion();
    updateNavButtons();
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
  renderSubjects(subjectSearchInput.value);
});

function goBackHome() {
  stopTimer();
  quizSection.style.display = "none";
  homeSection.style.display = "block";
  currentSubject = null;
  currentQuestions = [];
  currentIndex = 0;
  closeNavModal();
}

backBtn.addEventListener("click", goBackHome);
backHomeBtn.addEventListener("click", goBackHome);
