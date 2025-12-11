import { getBooks, getChapterVerses } from "./api.mjs";

let books = [];

// Initialize books data
try {
    books = await getBooks();
} catch (error) {
    console.error("Failed to load books from API:", error);
}

// --- URL & Navigation Utils ---

export function getParams() {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  return {
    book: urlParams.get('book'),
    chapter: urlParams.get('chapter'),
    verse: urlParams.get('verse')
  };
}

export function setParams(book, chapter, verse) {
  const url = new URL(window.location);
  url.searchParams.set('book', book);
  url.searchParams.set('chapter', chapter);
  url.searchParams.set('verse', verse);
  window.history.pushState({}, '', url);
}

// --- Template Loading Utils ---

export async function loadTemplate(path){
  const file = await fetch(path);
  return await file.text();
}

export function renderWithTemplate(template, parentElement) {
  parentElement.innerHTML = template;
}

export async function loadHeaderFooter(){
  const headerContent = await loadTemplate('../partials/header.html');
  const footerContent = await loadTemplate('../partials/footer.html');

  const header = document.getElementById('main-header');
  const footer = document.getElementById('main-footer');

  if (header) renderWithTemplate(headerContent, header);
  if (footer) renderWithTemplate(footerContent, footer);
}

// --- Dropdown Population Utils ---

export async function loadBooks(testament = "Old Testament") {
  const booksElement = document.getElementById("books");
  if (!booksElement) return;
  
  booksElement.innerHTML = ""; 
  
  if (!books || books.length === 0) {
      const option = document.createElement("option");
      option.textContent = "Error loading books";
      booksElement.appendChild(option);
      return;
  }
  
  // Filter books by testament (OT: first 39, NT: remaining 27)
  let filteredBooks = testament === "Old Testament" ? books.slice(0, 39) : books.slice(39);

  filteredBooks.forEach(book => {
    const bookElement = document.createElement("option");
    bookElement.value = book.id; 
    bookElement.textContent = book.name || book.commonName || book.id; 
    booksElement.appendChild(bookElement);
  });
}

export async function loadNumberOfChapters(selectedBookId) {
  const booksElement = document.getElementById("books");
  const bookId = selectedBookId || booksElement.value;

  if (bookId) {
    const book = books.find((b) => b.id === bookId);
    const chaptersElement = document.getElementById("chapters");
    if (chaptersElement) {
        chaptersElement.innerHTML = ""; 

        if (book) {
          for (let i = 0; i < book.numberOfChapters; i++) {
            const chapterElement = document.createElement("option");
            chapterElement.value = i + 1;
            chapterElement.textContent = i + 1;
            chaptersElement.appendChild(chapterElement);
          }
        }
    }
  }
}

export async function loadNumberOfVerses(book, chapter){
  const booksElement = document.getElementById("books");
  const chaptersElement = document.getElementById("chapters");
  
  const bookVal = book || booksElement?.value;
  const chapterVal = chapter || chaptersElement?.value;

  if (!bookVal || !chapterVal) return;

  try {
      const verses = await getChapterVerses(bookVal, chapterVal);
      const versesElement = document.getElementById("verses");
      const verseInput = document.getElementById("verse-choice");

      if(versesElement) versesElement.innerHTML = "";
      if(verseInput) verseInput.value = ""; 

      if (verses && verses.chapter && verses.chapter.content){
        verses.chapter.content.forEach((verse) => {
              const verseElement = document.createElement("option");
              verseElement.value = verse.verse;
              verseElement.textContent = verse.verse
              versesElement.appendChild(verseElement);
        });
      }
  } catch (error) {
      console.error("Error loading verses:", error);
  }
}

// --- Local Storage Utils ---

export function getStorageData() {
    const streak = parseInt(localStorage.getItem('discipleme_streak') || '0');
    const mastered = JSON.parse(localStorage.getItem('discipleme_mastered') || '[]');
    return { streak, mastered };
}

export function saveStorageData(streak, mastered) {
    localStorage.setItem('discipleme_streak', streak.toString());
    localStorage.setItem('discipleme_mastered', JSON.stringify(mastered));
}

// --- UI Helper Utils ---

export function updateStreakUI() {
    const { streak } = getStorageData();
    const streakElement = document.querySelector(".streak span");
    if (streakElement) {
        streakElement.textContent = streak;
    }
}

export function showModal(title, content) {
    let modal = document.getElementById('ai-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ai-modal';
        // Inline styles for simplicity, but could be moved to CSS
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;
        `;
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div style="background: white; padding: 24px; border-radius: 12px; max-width: 90%; width: 400px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h3 style="margin-top: 0; color: var(--primary);">${title}</h3>
            <div style="margin: 16px 0; font-size: 1rem; color: #374151;">${content}</div>
            <button class="btn-primary" onclick="document.getElementById('ai-modal').remove()">Close</button>
        </div>
    `;
}