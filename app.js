// ── state ──
let currentView = 'dashboard';
let currentEditId = null;
let monthlyGoal = parseInt(localStorage.getItem('reading_room_goal') || '4', 10);

// ── init ──
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initLamp();
  initGoalControls();
  initAddButtons();
  renderAll();
});

// ── navigation ──
function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
}

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.view === view)
  );
  document.querySelectorAll('.view').forEach(v =>
    v.classList.toggle('active', v.id === 'view-' + view)
  );
  renderAll();
}

// ── lamp widget ──
function initLamp() {
  document.getElementById('widget-lamp').addEventListener('click', function () {
    this.classList.toggle('on');
  });
}


// ── monthly goal ──
function initGoalControls() {
  // controls are rendered dynamically, handled via event delegation
  document.getElementById('goal-widget').addEventListener('click', (e) => {
    if (e.target.id === 'goal-minus') {
      monthlyGoal = Math.max(1, monthlyGoal - 1);
      saveGoal();
      renderGoal();
    }
    if (e.target.id === 'goal-plus') {
      monthlyGoal = monthlyGoal + 1;
      saveGoal();
      renderGoal();
    }
  });
}

function saveGoal() {
  localStorage.setItem('reading_room_goal', monthlyGoal.toString());
}

function getBooksReadThisMonth() {
  const books = loadBooks();
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  return books.filter(b => {
    if (b.shelf !== 'read' || !b.dateFinished) return false;
    const d = new Date(b.dateFinished);
    return d.getMonth() === m && d.getFullYear() === y;
  }).length;
}

function renderGoal() {
  const el = document.getElementById('goal-widget');
  const readCount = getBooksReadThisMonth();
  const pct = Math.min(100, (readCount / monthlyGoal) * 100);
  const radius = 47;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  el.innerHTML = `
    <div id="goal-ring-wrap">
      <svg id="goal-ring" width="110" height="110" viewBox="0 0 110 110">
        <circle id="goal-ring-bg" cx="55" cy="55" r="${radius}"></circle>
        <circle id="goal-ring-fill" cx="55" cy="55" r="${radius}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"></circle>
      </svg>
      <div id="goal-text">
        <span id="goal-num">${readCount}/${monthlyGoal}</span>
        <span id="goal-denom">books</span>
      </div>
    </div>
    <div id="goal-controls">
      <button id="goal-minus">−</button>
      <span id="goal-label">monthly goal</span>
      <button id="goal-plus">+</button>
    </div>
  `;
}

// ── add buttons (per shelf) ──
function initAddButtons() {
  document.getElementById('add-toread').addEventListener('click', () => openAddModal('toread'));
  document.getElementById('add-reading').addEventListener('click', () => openAddModal('reading'));
  document.getElementById('add-read').addEventListener('click', () => openAddModal('read'));
}

// ── master render ──
function renderAll() {
  renderNavCounts();
  if (currentView === 'dashboard') renderDashboard();
  else renderShelfView(currentView);
}

function renderNavCounts() {
  const books = loadBooks();
  document.getElementById('count-toread').textContent = books.filter(b => b.shelf === 'toread').length;
  document.getElementById('count-reading').textContent = books.filter(b => b.shelf === 'reading').length;
  document.getElementById('count-read').textContent = books.filter(b => b.shelf === 'read').length;
}

// ── dashboard ──
function renderDashboard() {
  const books = loadBooks();
  const stats = getStats();

  // currently reading
  const reading = books.filter(b => b.shelf === 'reading');
  const curEl = document.getElementById('current-books');
  curEl.innerHTML = reading.length
    ? reading.map(b => `
        <div class="current-card">
          <span class="current-title">${b.title}</span>
          <span class="current-author">${b.author || 'unknown author'}</span>
        </div>
      `).join('')
    : `<div class="empty-state" style="padding:20px 0;">nothing in progress</div>`;

  // goal
  renderGoal();

  // stats
  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card">
      <span class="stat-num">${stats.read}</span>
      <span class="stat-label">Books read</span>
    </div>
    <div class="stat-card">
      <span class="stat-num">${stats.toread}</span>
      <span class="stat-label">On wishlist</span>
    </div>
    <div class="stat-card">
      <span class="stat-num">${stats.avgRating}</span>
      <span class="stat-label">Avg rating</span>
    </div>
    <div class="stat-card">
      <span class="stat-num">${stats.reading}</span>
      <span class="stat-label">In progress</span>
    </div>
  `;

  // recently read
  const recent = books
    .filter(b => b.shelf === 'read')
    .sort((a, b) => (b.dateFinished || '').localeCompare(a.dateFinished || ''))
    .slice(0, 5);
  const recEl = document.getElementById('recent-books');
  recEl.innerHTML = recent.length
    ? recent.map(b => `
        <div class="recent-card">
          <div>
            <div class="recent-title">${b.title}</div>
            <div class="recent-author">${b.author || 'unknown author'}</div>
          </div>
          <div class="recent-stars">${'★'.repeat(b.rating || 0)}${'☆'.repeat(5 - (b.rating || 0))}</div>
        </div>
      `).join('')
    : `<div class="empty-state" style="padding:20px 0;">no finished books yet</div>`;
}

// ── shelf views ──
function renderShelfView(shelf) {
  const books = loadBooks().filter(b => b.shelf === shelf);
  const el = document.getElementById('list-' + shelf);
  el.innerHTML = books.length
    ? books.map(renderCard).join('')
    : `<div class="empty-state">no books here yet</div>`;
}

function renderCard(book) {
  const starsHtml = book.shelf === 'read'
    ? `<div class="book-stars">
        ${[1,2,3,4,5].map(i =>
          `<span class="star ${book.rating >= i ? 'filled' : ''}"
                 onclick="event.stopPropagation(); rateBook('${book.id}', ${i})">★</span>`
        ).join('')}
       </div>`
    : '';

  const genreHtml = book.genre ? `<span class="book-genre">${book.genre}</span>` : '';

  const notesHtml = book.notes
    ? `<div class="book-notes">${book.notes.slice(0, 100)}${book.notes.length > 100 ? '…' : ''}</div>`
    : '';

  let actionsHtml = '';
  if (book.shelf === 'toread') {
    actionsHtml = `
      <button class="action-btn green" onclick="event.stopPropagation(); moveAndRefresh('${book.id}','reading')">start reading</button>
      <button class="action-btn amber" onclick="event.stopPropagation(); moveAndRefresh('${book.id}','read')">mark read</button>
      <button class="action-btn muted" onclick="event.stopPropagation(); deleteAndRefresh('${book.id}')">remove</button>
    `;
  } else if (book.shelf === 'reading') {
    actionsHtml = `
      <button class="action-btn amber" onclick="event.stopPropagation(); moveAndRefresh('${book.id}','read')">finished</button>
      <button class="action-btn muted" onclick="event.stopPropagation(); moveAndRefresh('${book.id}','toread')">back to list</button>
      <button class="action-btn muted" onclick="event.stopPropagation(); deleteAndRefresh('${book.id}')">remove</button>
    `;
  } else if (book.shelf === 'read') {
    actionsHtml = `
      <button class="action-btn green" onclick="event.stopPropagation(); moveAndRefresh('${book.id}','reading')">re-reading</button>
      <button class="action-btn muted" onclick="event.stopPropagation(); deleteAndRefresh('${book.id}')">remove</button>
    `;
  }

  return `
    <div class="book-card ${book.shelf}" onclick="openEditModal('${book.id}')">
      <div class="book-title">${book.title}</div>
      <div class="book-author">${book.author || 'unknown author'}</div>
      <div class="book-meta">${genreHtml}${starsHtml}</div>
      ${notesHtml}
      <div class="card-actions">${actionsHtml}</div>
    </div>
  `;
}

function moveAndRefresh(id, shelf) {
  moveBook(id, shelf);
  renderAll();
}

function deleteAndRefresh(id) {
  deleteBook(id);
  renderAll();
}

function rateBook(id, rating) {
  const books = loadBooks();
  const book = books.find(b => b.id === id);
  if (!book) return;
  const newRating = book.rating === rating ? 0 : rating;
  updateBook(id, { rating: newRating });
  renderAll();
}

// ── add modal ──
function openAddModal(defaultShelf) {
  currentEditId = null;
  const html = `
    <div class="modal-title">add a book</div>
    <div class="form-row">
      <label class="form-label">title *</label>
      <input class="form-input" id="f-title" placeholder="book title" />
    </div>
    <div class="form-row">
      <label class="form-label">author</label>
      <input class="form-input" id="f-author" placeholder="author name" />
    </div>
    <div class="form-row">
      <label class="form-label">genre</label>
      <select class="form-input" id="f-genre">
        <option value="">— select —</option>
        ${GENRES.map(g => `<option value="${g}">${g}</option>`).join('')}
      </select>
    </div>
    <div class="form-row">
      <label class="form-label">shelf</label>
      <select class="form-input" id="f-shelf">
        <option value="toread" ${defaultShelf === 'toread' ? 'selected' : ''}>To Read</option>
        <option value="reading" ${defaultShelf === 'reading' ? 'selected' : ''}>Reading</option>
        <option value="read" ${defaultShelf === 'read' ? 'selected' : ''}>Read</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">cancel</button>
      <button class="btn-primary" onclick="submitAdd()">add book</button>
    </div>
  `;
  showModal(html);
}

function submitAdd() {
  const title = document.getElementById('f-title').value.trim();
  if (!title) { alert('title is required'); return; }
  const shelf = document.getElementById('f-shelf').value;
  addBook({
    title,
    author: document.getElementById('f-author').value,
    genre: document.getElementById('f-genre').value,
    shelf,
  });
  closeModal();
  switchView(shelf === currentView ? currentView : currentView);
  renderAll();
}

// ── edit modal ──
function openEditModal(id) {
  currentEditId = id;
  const book = loadBooks().find(b => b.id === id);
  if (!book) return;
  const isRead = book.shelf === 'read';

  const html = `
    <div class="modal-title">${book.title}</div>
    <div class="form-row">
      <label class="form-label">title</label>
      <input class="form-input" id="f-edit-title" value="${book.title}" />
    </div>
    <div class="form-row">
      <label class="form-label">author</label>
      <input class="form-input" id="f-edit-author" value="${book.author || ''}" />
    </div>
    <div class="form-row">
      <label class="form-label">genre</label>
      <select class="form-input" id="f-edit-genre">
        <option value="">— select —</option>
        ${GENRES.map(g => `<option value="${g}" ${book.genre === g ? 'selected' : ''}>${g}</option>`).join('')}
      </select>
    </div>
    ${isRead ? `
      <div class="form-row">
        <label class="form-label">your rating</label>
        <div class="book-stars" style="font-size:18px; gap:6px;">
          ${[1,2,3,4,5].map(i =>
            `<span class="star ${book.rating >= i ? 'filled' : ''}" onclick="rateInModal('${book.id}', ${i})" style="cursor:pointer">★</span>`
          ).join('')}
        </div>
      </div>
      <div class="form-row">
        <label class="form-label">date finished</label>
        <input class="form-input" id="f-edit-date" type="date" value="${book.dateFinished || ''}" />
      </div>
    ` : ''}
    <div class="form-row">
      <label class="form-label">notes / thoughts</label>
      <textarea class="form-input" id="f-edit-notes" placeholder="what did you think...">${book.notes || ''}</textarea>
    </div>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">close</button>
      <button class="btn-primary" onclick="submitEdit()">save</button>
    </div>
  `;
  showModal(html);
}

function rateInModal(id, rating) {
  rateBook(id, rating);
  closeModal();
  openEditModal(id);
}

function submitEdit() {
  const id = currentEditId;
  if (!id) return;
  const title = document.getElementById('f-edit-title').value.trim();
  if (!title) { alert('title is required'); return; }

  const changes = {
    title,
    author: document.getElementById('f-edit-author').value.trim(),
    genre: document.getElementById('f-edit-genre').value,
    notes: document.getElementById('f-edit-notes').value.trim(),
  };

  const dateEl = document.getElementById('f-edit-date');
  if (dateEl) changes.dateFinished = dateEl.value;

  updateBook(id, changes);
  closeModal();
  renderAll();
}

// ── modal helpers ──
function showModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  currentEditId = null;
}

document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay') closeModal();
});