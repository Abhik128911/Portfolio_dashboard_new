// ==================== GLOBAL STATE ====================
let subjectsData = {};
let currentSubject = "";
let currentQuestions = [];
let currentIndex = 0;
let questionStates = []; // Track state of each question
let bookmarkedQuestions = new Set();
let timerInterval = null;
let startTime = null;
let reviewMode = false;

// Stats
let stats = {
    attempted: 0,
    correct: 0,
    incorrect: 0
};

// ==================== LOAD MCQ DATA ====================
fetch('mcq.json')
    .then(res => res.json())
    .then(data => {
        subjectsData = data;
        loadSubjects();
        loadProgress(); // Load saved progress from localStorage
    })
    .catch(err => {
        console.error('Error loading MCQ data:', err);
        alert('Failed to load quiz data. Please refresh the page.');
    });

// ==================== DISPLAY SUBJECT CARDS ====================
function loadSubjects() {
    const container = document.getElementById("subjects-container");
    container.innerHTML = "";
    
    const subjects = [
        { name: "Computer Networks", icon: "🌐", color: "#4A90E2" },
        { name: "Data Structures", icon: "📊", color: "#7B68EE" },
        { name: "Algorithms", icon: "🧮", color: "#FF6B6B" },
        { name: "Operating Systems", icon: "💻", color: "#4ECDC4" },
        { name: "Database Management", icon: "🗄️", color: "#F39C12" }
    ];

    Object.keys(subjectsData).forEach(subject => {
        const subjectInfo = subjects.find(s => s.name === subject) || 
            { name: subject, icon: "📚", color: "#95A5A6" };
        
        const card = document.createElement("div");
        card.className = "subject-card";
        card.style.borderLeft = `5px solid ${subjectInfo.color}`;
        card.innerHTML = `
            <div class="subject-icon">${subjectInfo.icon}</div>
            <div class="subject-name">${subject}</div>
            <div class="subject-count">${subjectsData[subject].length} Questions</div>
        `;
        card.onclick = () => startQuiz(subject);
        container.appendChild(card);
    });
}

// ==================== START QUIZ ====================
function startQuiz(subject) {
    currentSubject = subject;
    currentQuestions = subjectsData[subject];
    currentIndex = 0;
    reviewMode = false;
    
    // Initialize question states
    questionStates = currentQuestions.map(() => ({
        answered: false,
        selectedOption: null,
        isCorrect: null
    }));
    
    bookmarkedQuestions.clear();
    stats = { attempted: 0, correct: 0, incorrect: 0 };
    
    // UI Transitions
    document.getElementById("subject-section").style.display = "none";
    document.getElementById("quiz-section").style.display = "block";
    document.getElementById("subject-title").innerText = subject;
    
    generateQuestionList();
    loadQuestion();
    startTimer();
    updateStats();
    saveProgress();
}

// ==================== TIMER ====================
function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById("timer").textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
}

function getElapsedTime() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ==================== GENERATE QUESTION LIST (MODAL) ====================
function generateQuestionList() {
    const listBox = document.getElementById("question-list");
    listBox.innerHTML = "";
    
    currentQuestions.forEach((q, i) => {
        const btn = document.createElement("div");
        btn.className = "q-num";
        btn.innerText = i + 1;
        btn.onclick = () => {
            currentIndex = i;
            loadQuestion();
            closeModal();
        };
        listBox.appendChild(btn);
    });
    
    updateQuestionStates();
}

// ==================== UPDATE QUESTION STATE INDICATORS ====================
function updateQuestionStates() {
    const nums = document.querySelectorAll(".q-num");
    nums.forEach((n, idx) => {
        n.classList.remove("q-active", "q-answered", "q-bookmarked", "q-correct", "q-incorrect");
        
        if (idx === currentIndex) {
            n.classList.add("q-active");
        }
        if (questionStates[idx].answered) {
            n.classList.add("q-answered");
            if (reviewMode && questionStates[idx].isCorrect !== null) {
                n.classList.add(questionStates[idx].isCorrect ? "q-correct" : "q-incorrect");
            }
        }
        if (bookmarkedQuestions.has(idx)) {
            n.classList.add("q-bookmarked");
        }
    });
}

// ==================== LOAD QUESTION ====================
function loadQuestion() {
    const q = currentQuestions[currentIndex];
    const questionState = questionStates[currentIndex];
    
    // Update question number
    document.getElementById("current-question-number").textContent = 
        `Question ${currentIndex + 1}/${currentQuestions.length}`;
    document.getElementById("question-text").innerText = q.question;
    
    // Update progress bar
    const progress = ((currentIndex + 1) / currentQuestions.length) * 100;
    document.getElementById("progress-bar").style.width = `${progress}%`;
    document.getElementById("progress-text").textContent = `${Math.round(progress)}%`; 
    
    
    // Update bookmark button
    const bookmarkBtn = document.getElementById("bookmark-btn");
    if (bookmarkedQuestions.has(currentIndex)) {
        bookmarkBtn.classList.add("bookmarked");
    } else {
        bookmarkBtn.classList.remove("bookmarked");
    }
    
    // Render options
    const optionsBox = document.getElementById("options");
    optionsBox.innerHTML = "";
    
    q.options.forEach((option, idx) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.innerHTML = `
            <span class="option-letter">${String.fromCharCode(65 + idx)}</span>
            <span class="option-text">${option}</span>
        `;
        
        // Restore previous answer if in review mode
        if (reviewMode && questionState.answered) {
            btn.disabled = true;
            if (option === questionState.selectedOption) {
                btn.classList.add(questionState.isCorrect ? "correct" : "wrong");
                btn.innerHTML += questionState.isCorrect ? " ✓" : " ✗";
            }
            if (option === q.answer && !questionState.isCorrect) {
                btn.classList.add("correct");
                btn.innerHTML += " ✓";
            }
        } else {
            // Restore selected answer if exists
            if (questionState.selectedOption === option) {
                if (questionState.isCorrect !== null) {
                    btn.classList.add(questionState.isCorrect ? "correct" : "wrong");
                    btn.innerHTML += questionState.isCorrect ? " ✓" : " ✗";
                    btn.disabled = true;
                } else {
                    btn.classList.add("selected");
                }
            }
            
            btn.onclick = () => checkAnswer(btn, option, q.answer);
        }
        
        optionsBox.appendChild(btn);
    });
    
    updateNavigationButtons();
    updateQuestionStates();
}

// ==================== CHECK ANSWER ====================
function checkAnswer(selectedBtn, selectedOption, correctAnswer) {
    const questionState = questionStates[currentIndex];
    
    // Prevent re-answering
    if (questionState.answered) return;
    
    const buttons = document.querySelectorAll(".option-btn");
    buttons.forEach(b => b.disabled = true);
    
    const isCorrect = selectedOption === correctAnswer;
    questionState.answered = true;
    questionState.selectedOption = selectedOption;
    questionState.isCorrect = isCorrect;
    
    // Update stats
    stats.attempted++;
    if (isCorrect) {
        stats.correct++;
        selectedBtn.classList.add("correct");
        selectedBtn.innerHTML += " ✓";
    } else {
        stats.incorrect++;
        selectedBtn.classList.add("wrong");
        selectedBtn.innerHTML += " ✗";
        
        // Show correct answer
        buttons.forEach(btn => {
            if (btn.querySelector('.option-text').textContent === correctAnswer) {
                btn.classList.add("correct");
                btn.innerHTML += " ✓";
            }
        });
    }
    
    updateStats();
    updateQuestionStates();
    saveProgress();
}

// ==================== UPDATE STATS ====================
function updateStats() {
    document.getElementById("attempted-count").textContent = stats.attempted;
    document.getElementById("correct-count").textContent = stats.correct;
    document.getElementById("incorrect-count").textContent = stats.incorrect;
}

// ==================== NAVIGATION BUTTONS ====================
function updateNavigationButtons() {
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const finishBtn = document.getElementById("finish-btn");
    
    prevBtn.style.display = currentIndex === 0 ? "none" : "inline-block";
    
    if (currentIndex === currentQuestions.length - 1) {
        nextBtn.style.display = "none";
        finishBtn.style.display = "inline-block";
    } else {
        nextBtn.style.display = "inline-block";
        finishBtn.style.display = "none";
    }
}

document.getElementById("next-btn").onclick = () => {
    if (currentIndex < currentQuestions.length - 1) {
        currentIndex++;
        loadQuestion();
    }
};

document.getElementById("prev-btn").onclick = () => {
    if (currentIndex > 0) {
        currentIndex--;
        loadQuestion();
    }
};

document.getElementById("finish-btn").onclick = () => {
    showResults();
};

// ==================== BOOKMARK ====================
document.getElementById("bookmark-btn").onclick = () => {
    if (bookmarkedQuestions.has(currentIndex)) {
        bookmarkedQuestions.delete(currentIndex);
    } else {
        bookmarkedQuestions.add(currentIndex);
    }
    loadQuestion();
    saveProgress();
};

// ==================== MODAL CONTROLS ====================
document.getElementById("toggle-modal-btn").onclick = () => {
    document.getElementById("question-modal").classList.add("show");
};

document.getElementById("close-modal").onclick = closeModal;

function closeModal() {
    document.getElementById("question-modal").classList.remove("show");
}

// Close modal when clicking outside
document.getElementById("question-modal").onclick = (e) => {
    if (e.target.id === "question-modal") {
        closeModal();
    }
};

// ==================== RESULTS ====================
function showResults() {
    stopTimer();
    const modal = document.getElementById("results-modal");
    const percentage = Math.round((stats.correct / currentQuestions.length) * 100);
    
    // Animate score circle
    const circumference = 2 * Math.PI * 90;
    const offset = circumference - (percentage / 100) * circumference;
    const circle = document.getElementById("score-circle");
    
    setTimeout(() => {
        circle.style.strokeDashoffset = offset;
    }, 100);
    
    // Update results
    document.getElementById("score-percentage").textContent = `${percentage}%`;
    document.getElementById("total-questions").textContent = currentQuestions.length;
    document.getElementById("result-attempted").textContent = stats.attempted;
    document.getElementById("result-correct").textContent = stats.correct;
    document.getElementById("result-incorrect").textContent = stats.incorrect;
    document.getElementById("result-time").textContent = getElapsedTime();
    
    modal.classList.add("show");
}

document.getElementById("close-results").onclick = () => {
    document.getElementById("results-modal").classList.remove("show");
};

document.getElementById("review-answers").onclick = () => {
    reviewMode = true;
    currentIndex = 0;
    document.getElementById("results-modal").classList.remove("show");
    loadQuestion();
};

document.getElementById("restart-quiz").onclick = () => {
    document.getElementById("results-modal").classList.remove("show");
    resetQuiz();
};

document.getElementById("back-to-subjects").onclick = () => {
    document.getElementById("results-modal").classList.remove("show");
    backToSubjects();
};

// ==================== RESET QUIZ ====================
document.getElementById("reset-btn").onclick = () => {
    if (confirm("Are you sure you want to reset this quiz? All progress will be lost.")) {
        resetQuiz();
    }
};

function resetQuiz() {
    currentIndex = 0;
    questionStates = currentQuestions.map(() => ({
        answered: false,
        selectedOption: null,
        isCorrect: null
    }));
    bookmarkedQuestions.clear();
    stats = { attempted: 0, correct: 0, incorrect: 0 };
    reviewMode = false;
    
    stopTimer();
    startTimer();
    generateQuestionList();
    loadQuestion();
    updateStats();
    saveProgress();
}

// ==================== BACK TO SUBJECTS ====================
document.getElementById("back-btn").onclick = backToSubjects;

function backToSubjects() {
    stopTimer();
    document.getElementById("quiz-section").style.display = "none";
    document.getElementById("subject-section").style.display = "block";
    clearProgress();
}

// ==================== KEYBOARD NAVIGATION ====================
document.addEventListener('keydown', (e) => {
    if (document.getElementById("quiz-section").style.display === "none") return;
    
    if (e.key === "ArrowRight" && currentIndex < currentQuestions.length - 1) {
        currentIndex++;
        loadQuestion();
    } else if (e.key === "ArrowLeft" && currentIndex > 0) {
        currentIndex--;
        loadQuestion();
    } else if (e.key >= "1" && e.key <= "4") {
        const optionBtns = document.querySelectorAll(".option-btn");
        const index = parseInt(e.key) - 1;
        if (optionBtns[index] && !optionBtns[index].disabled) {
            optionBtns[index].click();
        }
    }
});

// ==================== LOCAL STORAGE ====================
function saveProgress() {
    if (!currentSubject) return;
    
    const progress = {
        subject: currentSubject,
        currentIndex,
        questionStates,
        bookmarkedQuestions: Array.from(bookmarkedQuestions),
        stats,
        startTime
    };
    
    localStorage.setItem('quizProgress', JSON.stringify(progress));
}

function loadProgress() {
    const saved = localStorage.getItem('quizProgress');
    if (!saved) return;
    
    try {
        const progress = JSON.parse(saved);
        // You can add logic here to restore a quiz in progress
    } catch (e) {
        console.error('Failed to load progress:', e);
    }
}

function clearProgress() {
    localStorage.removeItem('quizProgress');
}


// // Add this inside the loadQuestion() function, after updating progress bar:
// function loadQuestion() {
//     const q = currentQuestions[currentIndex];
//     const questionState = questionStates[currentIndex];
    
//     // Update question number
//     document.getElementById("current-question-number").textContent = 
//         `Question ${currentIndex + 1}/${currentQuestions.length}`;
//     document.getElementById("question-text").innerText = q.question;
    
//     // Update progress bar
//     const progress = ((currentIndex + 1) / currentQuestions.length) * 100;
//     document.getElementById("progress-bar").style.width = `${progress}%`;
//     document.getElementById("progress-text").textContent = `${Math.round(progress)}%`; // ADD THIS LINE
    
//     // ... rest of the function stays the same
// }
