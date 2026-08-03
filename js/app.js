(() => {
  "use strict";

  const app = document.querySelector("#app");
  const exams = window.DEBRIEF50_EXAMS || {};
  let state = { exam: null, index: 0, answers: {} };

  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[char]);

  function shuffleQuestions(questions) {
    const shuffled = questions.map((question) => question);
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  function shell(content) {
    app.innerHTML = `<div class="shell"><header class="topbar"><div class="brand">Debrief<span>50</span></div></header>${content}</div>`;
  }

  function home() {
    state = { exam: null, index: 0, answers: {} };
    shell(`
      <section class="hero"><h1>Choose your exam.</h1></section>
      <section class="subject-grid">
        ${Object.values(exams).map((exam) => `
          <button class="subject-card" data-start="${esc(exam.id)}">
            <div class="subject-icon">${esc(exam.icon || "✈️")}</div>
            <h2>${esc(exam.title)}</h2>
            <p>${exam.questions.length} questions · Pass mark ${exam.passMark}%</p>
          </button>
        `).join("")}
      </section>
    `);
  }

  function start(id) {
    const sourceExam = exams[id];
    if (!sourceExam) return;

    state = {
      exam: {
        ...sourceExam,
        questions: shuffleQuestions(sourceExam.questions)
      },
      index: 0,
      answers: {}
    };

    renderQuestion();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function renderQuestion() {
    const exam = state.exam;
    const question = exam.questions[state.index];
    const selected = state.answers[question.id];

    shell(`
      <section class="panel">
        <div class="exam-head">
          <div class="progress">Question ${state.index + 1} of ${exam.questions.length}</div>
          <div class="subject-pill">${esc(exam.title)}</div>
        </div>
        <h1 class="question">${esc(question.question)}</h1>
        <div class="options">
          ${Object.entries(question.options).map(([letter, text]) => `
            <button class="option ${selected === letter ? "selected" : ""}" data-answer="${letter}">
              <span class="letter">${letter}</span><span>${esc(text)}</span>
            </button>
          `).join("")}
        </div>
        <div class="nav">
          <button class="btn btn-secondary" data-prev ${state.index === 0 ? "disabled" : ""}>Previous</button>
          <button class="btn btn-primary" data-next>${state.index === exam.questions.length - 1 ? "Review & Submit" : "Next"}</button>
        </div>
        <div class="exam-footer">
          <span>${Object.keys(state.answers).length} of ${exam.questions.length} answered</span>
          <button class="btn btn-return" data-quit>Return to Subjects</button>
        </div>
      </section>
    `);
  }

  function dialog(title, body, confirmText, onConfirm) {
    const wrap = document.createElement("div");
    wrap.className = "dialog-backdrop";
    wrap.innerHTML = `
      <div class="dialog" role="dialog" aria-modal="true">
        <h2>${esc(title)}</h2>
        <p>${esc(body)}</p>
        <div class="dialog-actions">
          <button class="btn btn-secondary" data-cancel>Cancel</button>
          <button class="btn btn-danger" data-confirm>${esc(confirmText)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
    wrap.querySelector("[data-cancel]").onclick = () => wrap.remove();
    wrap.querySelector("[data-confirm]").onclick = () => {
      wrap.remove();
      onConfirm();
    };
  }

  function requestSubmit() {
    const total = state.exam.questions.length;
    const answered = Object.keys(state.answers).length;
    const missing = total - answered;
    const body = missing
      ? `${missing} question${missing === 1 ? " is" : "s are"} unanswered. You can still submit, but unanswered questions will be marked incorrect.`
      : `All ${total} questions are answered. Your result will be final for this attempt.`;
    dialog("Submit exam?", body, "Submit exam", showResults);
  }

  function showResults() {
    const exam = state.exam;
    let correct = 0;
    const wrong = [];

    exam.questions.forEach((question, index) => {
      const chosen = state.answers[question.id] || null;
      if (chosen === question.correct) correct += 1;
      else wrong.push({ question, index, chosen });
    });

    const total = exam.questions.length;
    const percentage = Math.round((correct / total) * 1000) / 10;
    const passed = percentage >= exam.passMark;

    shell(`
      <section class="panel">
        <div class="result-hero">
          <div class="subject-pill" style="display:inline-block">${esc(exam.title)}</div>
          <h1 class="score ${passed ? "pass" : "fail"}">${correct}/${total}</h1>
          <h2 class="${passed ? "pass" : "fail"}">${passed ? "Pass" : "Fail"} · ${percentage}%</h2>
        </div>
        <div class="stats">
          <div class="stat"><strong>${correct}</strong>Correct</div>
          <div class="stat"><strong>${total - correct}</strong>Incorrect</div>
          <div class="stat"><strong>${exam.passMark}%</strong>Pass mark</div>
        </div>
        <h2>${wrong.length ? "Questions to review" : "Perfect score"}</h2>
        <div class="review-list">
          ${wrong.map(({ question, index, chosen }) => `
            <article class="review">
              <h3>Question ${index + 1}: ${esc(question.question)}</h3>
              <div class="answer-line wrong-answer"><strong>Your answer:</strong> ${chosen ? `${chosen}. ${esc(question.options[chosen])}` : "Unanswered"}</div>
              <div class="answer-line right-answer"><strong>Correct answer:</strong> ${question.correct}. ${esc(question.options[question.correct])}</div>
              <div class="explanation"><strong>Explanation:</strong> ${esc(question.explanation || "No explanation was supplied in the uploaded document.")}</div>
              ${question.examTrap ? `<div class="trap"><strong>Exam Trap:</strong> ${esc(question.examTrap)}</div>` : ""}
            </article>
          `).join("")}
        </div>
        <div class="actions">
          <button class="btn btn-primary" data-restart>Restart ${esc(exam.title)}</button>
          <button class="btn btn-secondary" data-home>Return to subjects</button>
        </div>
      </section>
    `);
  }

  app.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.dataset.start) start(button.dataset.start);
    else if (button.dataset.answer) {
      const question = state.exam.questions[state.index];
      state.answers[question.id] = button.dataset.answer;
      renderQuestion();
    } else if (button.hasAttribute("data-prev")) {
      state.index = Math.max(0, state.index - 1);
      renderQuestion();
    } else if (button.hasAttribute("data-next")) {
      if (state.index === state.exam.questions.length - 1) requestSubmit();
      else {
        state.index += 1;
        renderQuestion();
      }
    } else if (button.hasAttribute("data-quit")) {
      dialog("Leave this exam?", "Your answers for this attempt will be cleared.", "Leave exam", home);
    } else if (button.hasAttribute("data-restart")) start(state.exam.id);
    else if (button.hasAttribute("data-home")) home();
  });

  home();
})();
