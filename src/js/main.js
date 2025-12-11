import { 
  loadHeaderFooter, 
  loadBooks, 
  loadNumberOfChapters, 
  loadNumberOfVerses, 
  getParams, 
  setParams, 
  updateStreakUI 
} from "./utils.mjs";
import { ScriptureGame } from "./game.mjs";

const booksElement = document.getElementById("books");
const chaptersElement = document.getElementById("chapters");
const verseElement = document.getElementById("verse-choice");
const startButton = document.querySelector(".cta-section button");
const difficultyButtons = document.querySelectorAll(".difficulty-section button");
const testamentButtons = document.querySelectorAll(".books-button button");

// Initialize Game Class
const game = new ScriptureGame();

async function init() {
  await loadHeaderFooter();
  await loadBooks("Old Testament"); // Default to OT
  updateStreakUI();

  const params = getParams();
  
  // If URL has params, jump straight to game
  if (params.book && params.chapter && params.verse) {
    game.start(params.book, params.chapter, params.verse);
  } else {
    // Otherwise load selectors
    await loadNumberOfChapters();
    await loadNumberOfVerses(booksElement.value, chaptersElement.value)
  }
}

// --- Event Listeners ---

// Testament Toggle Logic
testamentButtons.forEach(button => {
    button.addEventListener("click", async () => {
        // Toggle Active State
        testamentButtons.forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");

        // Reload books based on selection
        const testament = button.textContent.trim();
        await loadBooks(testament);
        
        // Reset dependent fields
        const newFirstBook = booksElement.value; 
        await loadNumberOfChapters(newFirstBook);
        await loadNumberOfVerses(newFirstBook, "1"); 
    });
});

// Selector Change Logic
booksElement.addEventListener("change", async () => {
  await loadNumberOfChapters();
  await loadNumberOfVerses(booksElement.value, chaptersElement.value)
});

chaptersElement.addEventListener("change", async() => {
  await loadNumberOfVerses(booksElement.value, chaptersElement.value)
})

// Difficulty Selection Logic
difficultyButtons.forEach(button => {
    button.addEventListener("click", () => {
        difficultyButtons.forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
    });
});

// Start Game Logic
startButton.addEventListener("click", () => {
    if(booksElement.value == "" || chaptersElement.value == "" || verseElement.value == ""){
        alert("Missing Book, Chapter or Verse!!");
        return;
    }

  const book = booksElement.value;
  const chapter = chaptersElement.value;
  const verse = document.getElementById("verse-choice").value || "1"; 

  setParams(book, chapter, verse);
  game.start(book, chapter, verse);
});

init();