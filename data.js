// ── book model ──
// {
//   id: string,
//   title: string,
//   author: string,
//   genre: string,
//   shelf: 'toread' | 'reading' | 'read',
//   rating: number (0-5),
//   notes: string,
//   dateAdded: string (ISO),
//   dateFinished: string (ISO) | '',
// }

const STORAGE_KEY = 'reading_room_v1';

const GENRES = [
    'Fiction', 'Mystery', 'Thriller', 'Sci-Fi', 'Fantasy',
    'Gothic', 'Dystopian', 'Literary', 'Historical',
    'Non-Fiction', 'Bengali Fiction', 'Classic', 'Other'
];

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function loadBooks() {
    try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
    } catch (e) {
    return [];
    }
}

function saveBooks(books) {
    try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    } catch (e) {
    console.error('Failed to save:', e);
    }
}

function addBook({ title, author, genre, shelf }) {
    const books = loadBooks();
    const book = {
    id: uid(),
    title: title.trim(),
    author: (author || '').trim(),
    genre: genre || '',
    shelf: shelf || 'toread',
    rating: 0,
    notes: '',
    dateAdded: new Date().toISOString().slice(0, 10),
    dateFinished: '',
    };
    books.push(book);
    saveBooks(books);
    return book;
}

function updateBook(id, changes) {
    const books = loadBooks();
    const idx = books.findIndex(b => b.id === id);
    if (idx === -1) return null;
    books[idx] = { ...books[idx], ...changes };
    saveBooks(books);
    return books[idx];
}

function moveBook(id, newShelf) {
    const changes = { shelf: newShelf };
    if (newShelf === 'read') {
    const books = loadBooks();
    const book = books.find(b => b.id === id);
    if (book && !book.dateFinished) {
        changes.dateFinished = new Date().toISOString().slice(0, 10);
    }
    }
    return updateBook(id, changes);
}

function deleteBook(id) {
    const books = loadBooks().filter(b => b.id !== id);
    saveBooks(books);
}

function getStats() {
    const books = loadBooks();
    const read = books.filter(b => b.shelf === 'read');
    const rated = read.filter(b => b.rating > 0);
    const avgRating = rated.length
    ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1)
    : '—';
    return {
    total: books.length,
    toread: books.filter(b => b.shelf === 'toread').length,
    reading: books.filter(b => b.shelf === 'reading').length,
    read: read.length,
    avgRating,
    };
}