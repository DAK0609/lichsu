const DATA_URL = 'data.json';
const STORAGE_KEY = 'lich-su-on-thi-v1';
const state = { lessons: [], lessonId: 1, mode: 'mc', index: { mc: 0, tf: 0 }, answers: {}, view: 'home' };

const $ = (id) => document.getElementById(id);
const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const cleanTitle = (value = '') => String(value).replace(/^BÀI\s*\d+\s*[:.\-]?\s*/i, '').replace(/\s+/g, ' ');
const lesson = () => state.lessons.find((item) => item.id === state.lessonId);
const questions = () => lesson()?.[state.mode] || [];
const currentQuestion = () => questions()[state.index[state.mode]];
const keyFor = (question, sub = '') => `${state.lessonId}:${state.mode}:${question.id}${sub ? `:${sub}` : ''}`;
const saved = (key) => state.answers[key];

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.answers)); } catch { /* Progress remains usable for this session. */ }
}

function answeredCount(mode, selectedLesson = lesson()) {
  if (!selectedLesson) return 0;
  return selectedLesson[mode].filter((question) => mode === 'mc'
    ? saved(`${selectedLesson.id}:mc:${question.id}`) !== undefined
    : question.statements.every((statement) => saved(`${selectedLesson.id}:tf:${question.id}:${statement.letter}`) !== undefined)).length;
}

function score(mode, selectedLesson = lesson()) {
  if (!selectedLesson) return 0;
  return selectedLesson[mode].reduce((total, question) => {
    if (mode === 'mc') return total + (saved(`${selectedLesson.id}:mc:${question.id}`) === question.answer ? 1 : 0);
    return total + question.statements.filter((statement) => saved(`${selectedLesson.id}:tf:${question.id}:${statement.letter}`) === statement.answer).length;
  }, 0);
}

function renderHome() {
  $('home-view').hidden = false;
  $('practice-view').hidden = true;
  const total = state.lessons.reduce((sum, item) => sum + item.mc.length + item.tf.length, 0);
  $('total-pill').textContent = `${state.lessons.length} bài · ${total} câu`;
  $('lesson-grid').innerHTML = state.lessons.map((item) => {
    const done = answeredCount('mc', item) + answeredCount('tf', item);
    const count = item.mc.length + item.tf.length;
    return `<button class="lesson-card" data-lesson="${item.id}">
      <span class="lesson-index"><span>BÀI HỌC</span><b>${item.id}</b></span>
      <span class="lesson-name">${escapeHTML(cleanTitle(item.title))}</span>
      <span class="lesson-count">${item.mc.length} chọn đáp án · ${item.tf.length} Đúng–Sai</span>
      <span class="lesson-progress"><span style="width:${count ? Math.round(done / count * 100) : 0}%"></span></span>
    </button>`;
  }).join('');
  $('lesson-grid').querySelectorAll('[data-lesson]').forEach((button) => button.addEventListener('click', () => openLesson(Number(button.dataset.lesson))));
}

function openLesson(id) {
  state.lessonId = id;
  state.mode = 'mc';
  state.index = { mc: 0, tf: 0 };
  state.view = 'practice';
  renderPractice();
}

function setMode(mode) {
  state.mode = mode;
  $('mc-mode').classList.toggle('is-active', mode === 'mc');
  $('tf-mode').classList.toggle('is-active', mode === 'tf');
  $('mc-mode').setAttribute('aria-selected', String(mode === 'mc'));
  $('tf-mode').setAttribute('aria-selected', String(mode === 'tf'));
  $('jump-menu').open = false;
  renderPractice();
}

function renderPractice() {
  const selectedLesson = lesson();
  const list = questions();
  if (!selectedLesson || !list.length) return;
  state.index[state.mode] = Math.min(Math.max(state.index[state.mode], 0), list.length - 1);
  $('home-view').hidden = true;
  $('practice-view').hidden = false;
  $('total-pill').textContent = `${selectedLesson.mc.length + selectedLesson.tf.length} câu trong bài`;
  $('lesson-tag').textContent = `Bài ${selectedLesson.id} / 5`;
  $('practice-title').textContent = cleanTitle(selectedLesson.title);
  $('mc-mode').classList.toggle('is-active', state.mode === 'mc');
  $('tf-mode').classList.toggle('is-active', state.mode === 'tf');
  $('mc-mode').setAttribute('aria-selected', String(state.mode === 'mc'));
  $('tf-mode').setAttribute('aria-selected', String(state.mode === 'tf'));
  renderProgress();
  renderJumpMenu();
  renderQuestion();
  $('previous-button').disabled = state.index[state.mode] === 0;
  $('next-button').disabled = state.index[state.mode] === list.length - 1;
  $('nav-position').textContent = `${state.index[state.mode] + 1} / ${list.length}`;
}

function renderProgress() {
  const total = questions().length;
  const done = answeredCount(state.mode);
  const points = state.mode === 'mc' ? score('mc') : score('tf');
  const maxPoints = state.mode === 'mc' ? total : questions().reduce((sum, question) => sum + question.statements.length, 0);
  $('progress-copy').textContent = `${done} / ${total} câu đã trả lời`;
  $('score-copy').textContent = `${points} / ${maxPoints} đúng`;
  $('progress-fill').style.width = `${total ? done / total * 100 : 0}%`;
}

function renderJumpMenu() {
  const list = questions();
  const active = currentQuestion();
  $('jump-current').textContent = active ? `Câu ${active.id}` : '';
  $('question-grid').innerHTML = list.map((question, index) => {
    const answer = state.mode === 'mc' ? saved(keyFor(question)) : question.statements.every((statement) => saved(keyFor(question, statement.letter)) !== undefined);
    return `<button class="question-chip${answer ? ' is-answered' : ''}${index === state.index[state.mode] ? ' is-current' : ''}" data-index="${index}" aria-label="Câu ${escapeHTML(question.id)}${answer ? ', đã trả lời' : ''}">${escapeHTML(question.id)}</button>`;
  }).join('');
  $('question-grid').querySelectorAll('[data-index]').forEach((button) => button.addEventListener('click', () => {
    state.index[state.mode] = Number(button.dataset.index);
    $('jump-menu').open = false;
    renderPractice();
  }));
}

function renderContext(question) {
  const context = (question.context || []).filter(Boolean).map((line) => `<p>${escapeHTML(line)}</p>`).join('');
  const images = (question.images || []).map((src) => `<img class="question-image" src="${escapeHTML(src)}" alt="Hình minh họa trong tài liệu ôn tập" loading="lazy">`).join('');
  return `${context ? `<div class="question-context">${context}</div>` : ''}${images}`;
}

function renderQuestion() {
  const q = currentQuestion();
  if (!q) return;
  const card = $('question-card');
  const context = renderContext(q);
  if (state.mode === 'mc') {
    const answer = saved(keyFor(q));
    const options = Object.entries(q.options).map(([letter, text]) => {
      const isCorrect = answer !== undefined && letter === q.answer;
      const isWrong = answer === letter && answer !== q.answer;
      return `<button class="option-button${isCorrect ? ' is-correct' : ''}${isWrong ? ' is-wrong' : ''}" data-answer="${letter}" ${answer !== undefined ? 'disabled' : ''} aria-pressed="${answer === letter}">
        <span class="option-letter">${letter}</span><span>${escapeHTML(text)}</span>
      </button>`;
    }).join('');
    let feedback = '';
    if (answer !== undefined) {
      const correctText = q.options[q.answer] || '';
      const isRight = answer === q.answer;
      feedback = `<div class="feedback ${isRight ? 'is-correct' : 'is-wrong'}"><strong>${isRight ? 'Chính xác!' : 'Chưa đúng.'}</strong> Đáp án đúng: ${q.answer}. ${escapeHTML(correctText)}</div>`;
    }
    card.innerHTML = `<div class="question-meta"><span class="meta-dot"></span><span>CÂU ${escapeHTML(q.id)}</span><span>·</span><span>CHỌN MỘT ĐÁP ÁN</span></div>
      <h2 class="question-stem">${escapeHTML(q.stem.replace(/^Câu\s*\d+(?:\.\d+)?\s*[.:]\s*/i, ''))}</h2>${context}
      ${q.note ? `<div class="teacher-note"><strong>Lưu ý trong tài liệu:</strong> ${escapeHTML(q.note)}</div>` : ''}
      <div class="option-list">${options}</div>${feedback}`;
    card.querySelectorAll('[data-answer]').forEach((button) => button.addEventListener('click', () => {
      state.answers[keyFor(q)] = button.dataset.answer;
      persist();
      renderPractice();
    }));
  } else {
    const statements = q.statements.map((statement) => {
      const key = keyFor(q, statement.letter);
      const chosen = saved(key);
      const settled = chosen !== undefined;
      const trueCorrect = settled && chosen === statement.answer;
      const falseCorrect = settled && chosen === false && statement.answer === false;
      const answerText = statement.answer ? 'Đúng' : 'Sai';
      const trueClass = settled && (statement.answer ? 'is-correct' : chosen === true ? 'is-wrong' : '');
      const falseClass = settled && (!statement.answer ? 'is-correct' : chosen === false ? 'is-wrong' : '');
      return `<div class="statement">
        <p class="statement-copy"><span class="statement-label">${escapeHTML(statement.letter)}</span>${escapeHTML(statement.text)}</p>
        <div class="tf-buttons">
          <button class="tf-button ${trueClass}" data-statement="${escapeHTML(statement.letter)}" data-value="true" ${settled ? 'disabled' : ''} aria-pressed="${chosen === true}">Đúng</button>
          <button class="tf-button ${falseClass}" data-statement="${escapeHTML(statement.letter)}" data-value="false" ${settled ? 'disabled' : ''} aria-pressed="${chosen === false}">Sai</button>
        </div>
        ${settled ? `<p class="statement-result">${trueCorrect || falseCorrect ? 'Chính xác.' : 'Chưa đúng.'} Đáp án: <strong>${answerText}</strong></p>` : ''}
      </div>`;
    }).join('');
    card.innerHTML = `<div class="question-meta"><span class="meta-dot"></span><span>CÂU ${escapeHTML(q.id)}</span><span>·</span><span>ĐÚNG – SAI</span></div>
      <p class="tf-instruction">Mỗi ý a, b, c, d: chọn <strong>Đúng</strong> nếu nhận định chính xác; chọn <strong>Sai</strong> nếu nhận định không chính xác.</p>
      ${context}<div class="statement-list">${statements}</div>`;
    card.querySelectorAll('[data-statement]').forEach((button) => button.addEventListener('click', () => {
      state.answers[keyFor(q, button.dataset.statement)] = button.dataset.value === 'true';
      persist();
      renderPractice();
    }));
  }
}

function moveQuestion(delta) {
  const list = questions();
  state.index[state.mode] = Math.min(Math.max(state.index[state.mode] + delta, 0), list.length - 1);
  $('jump-menu').open = false;
  renderPractice();
}

async function start() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error('Dữ liệu câu hỏi không tải được.');
    const data = await response.json();
    state.lessons = data.lessons;
    try { state.answers = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { state.answers = {}; }
    renderHome();
  } catch {
    document.querySelector('main').innerHTML = '<section class="load-error"><h1>Không mở được bộ câu hỏi</h1><p>Hãy chạy trang qua tệp <strong>start-site.ps1</strong> hoặc một máy chủ web cục bộ, rồi tải lại trang.</p></section>';
  }
}

$('home-button').addEventListener('click', renderHome);
$('back-button').addEventListener('click', renderHome);
$('mc-mode').addEventListener('click', () => setMode('mc'));
$('tf-mode').addEventListener('click', () => setMode('tf'));
$('previous-button').addEventListener('click', () => moveQuestion(-1));
$('next-button').addEventListener('click', () => moveQuestion(1));
start();
