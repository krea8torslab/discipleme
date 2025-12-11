import { getBooks, getChapterVerses } from "./api.mjs";

let books = [];
try {
    books = await getBooks();
} catch (error) {
    console.error("Failed to load books from API:", error);
}

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

export async function loadTemplate(path){
  const file = await fetch(path);
  const result = await file.text();
  return result;
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

// UPDATED: loadBooks with robust filtering and fallback
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
  
  let filteredBooks = [];
  
  // The first 39 books are Old Testament
  if (testament === "Old Testament") {
      filteredBooks = books.slice(0, 39);
  } else {
      // The rest (27) are New Testament
      filteredBooks = books.slice(39);
  }

  filteredBooks.forEach(book => {
    const bookElement = document.createElement("option");
    // Value = ID (e.g., GEN) for API calls
    bookElement.value = book.id; 
    // Display = Name (e.g., Genesis) from the new API structure
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
      const versesElement = document.getElementById("verses"); // Datalist ID
      const verseInput = document.getElementById("verse-choice");

      if(versesElement) versesElement.innerHTML = "";
      if(verseInput) verseInput.value = ""; 

      if (verses && verses.chapter && verses.chapter.content){
        const versesContent = verses.chapter.content;
        console.log(versesContent)
        versesContent.forEach((verse) => {
          
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