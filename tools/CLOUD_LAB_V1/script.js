let assignments = [];

fetch("data.json")
  .then(res => res.json())
  .then(data => {
    assignments = data;
    renderCards(data);
  });

function renderCards(data) {
  const container = document.getElementById("assignmentCards");
  container.innerHTML = "";

  data.forEach((a, index) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h2>${a.assignment}: ${a.title}</h2>
      <button onclick="openModal(${index})">View Assignment</button>
    `;
    container.appendChild(card);
  });
}

/* SEARCH */
document.getElementById("searchInput").addEventListener("input", function () {
  const key = this.value.toLowerCase();
  const filtered = assignments.filter(a =>
    a.title.toLowerCase().includes(key) ||
    a.questions.some(q => q.question.toLowerCase().includes(key))
  );
  renderCards(filtered);
});

/* MODAL */
function openModal(index) {
  const modal = document.getElementById("modal");
  const body = document.getElementById("modalBody");
  const a = assignments[index];

  body.innerHTML = `<h2>${a.assignment}: ${a.title}</h2>`;

  a.questions.forEach(q => {
    body.innerHTML += `
      <div class="question">
        <h3>${q.question}</h3>
        <div class="code-wrap">${q.answer}</div>
      </div>
    `;
  });

  addCopyButtons(body);
  modal.classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
}

/* COPY BUTTONS */
function addCopyButtons(parent) {
  parent.querySelectorAll("pre").forEach(pre => {
    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.innerText = "Copy";
    btn.onclick = () => {
      navigator.clipboard.writeText(pre.innerText);
      btn.innerText = "Copied";
      setTimeout(() => btn.innerText = "Copy", 1200);
    };
    pre.parentElement.appendChild(btn);
  });
}
