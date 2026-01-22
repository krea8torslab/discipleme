/**
 * DiscipleMe - Main Application Entry Point
 * 
 * A premium scripture memorization PWA by Creators Lab
 */

import { 
  loadHeaderFooter, 
  loadBooks, 
  loadNumberOfChapters, 
  loadNumberOfVerses, 
  getParams, 
  setParams, 
  updateStreakUI,
  hasLegacyData,
  showLegacySyncPrompt,
  initNetworkAwareness
} from "./utils.mjs";
import { ScriptureGame } from "./game.mjs";
import { onAuthStateChanged, updateAuthUI, showAuthModal, signOut } from "./auth.mjs";
import { showSupportModal } from "./paystack.mjs";
import { auth } from "./firebase-config.mjs";
import { initRouter, navigateTo, handleAuthNavigation, VIEWS, onViewChange } from "./router.mjs";
import { initProfile } from "./profile.mjs";
import { initDashboard, showDashboard } from "./dashboard.mjs";

// Initialize Game Class
const game = new ScriptureGame();

/**
 * Main initialization
 */
async function init() {
  // Load header and footer partials
  await loadHeaderFooter();
  
  // Initialize network awareness
  initNetworkAwareness();
  
  // Initialize router
  const initialView = initRouter();

  // Setup auth state listener
  onAuthStateChanged(async (user) => {
    updateAuthUI(user);
    handleAuthNavigation(user);
    
    if (user) {
      await updateStreakUI();
      
      // Check for legacy data migration
      if (hasLegacyData()) {
        await showLegacySyncPrompt();
      }
    }
  });

  // Setup view change listener
  onViewChange((viewId) => {
    if (viewId === VIEWS.PROFILE && auth.currentUser) {
      initProfile();
    }
    if (viewId === VIEWS.APP && auth.currentUser) {
      initDashboard();
    }
  });

  // Setup all event listeners
  setupEventListeners();
  
  // Check URL params for direct game access
  const params = getParams();
  if (params.book && params.chapter && params.verse && auth.currentUser) {
    game.start(params.book, params.chapter, params.verse);
  }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // ========== LANDING PAGE EVENTS ==========
  
  // Hero CTA buttons
  document.getElementById('hero-get-started')?.addEventListener('click', () => {
    showAuthModal('signup');
  });
  
  document.getElementById('hero-learn-more')?.addEventListener('click', () => {
    // Scroll to features section
    document.querySelector('.landing-features')?.scrollIntoView({ behavior: 'smooth' });
  });
  
  // CTA section button
  document.getElementById('cta-get-started')?.addEventListener('click', () => {
    showAuthModal('signup');
  });

  // ========== APP VIEW EVENTS ==========
  
  // Get DOM elements (these may not exist if not on app view)
  const testamentButtons = document.querySelectorAll('.testament-toggle button');
  const booksElement = document.getElementById('books');
  const chaptersElement = document.getElementById('chapters');
  const verseElement = document.getElementById('verse-choice');
  const difficultyButtons = document.querySelectorAll('.difficulty-section button');
  
  // Testament Toggle (only if buttons exist)
  if (testamentButtons.length > 0) {
    testamentButtons.forEach(button => {
      button?.addEventListener("click", async () => {
        testamentButtons.forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        
        const testament = button.textContent.trim();
        await loadBooks(testament);
        
        const newFirstBook = booksElement?.value; 
        await loadNumberOfChapters(newFirstBook);
        await loadNumberOfVerses(newFirstBook, "1"); 
      });
    });
  }

  // Book selector change
  booksElement?.addEventListener("change", async () => {
    await loadNumberOfChapters();
    await loadNumberOfVerses(booksElement.value, chaptersElement?.value);
  });

  // Chapter selector change
  chaptersElement?.addEventListener("change", async () => {
    await loadNumberOfVerses(booksElement?.value, chaptersElement.value);
  });

  // Difficulty Selection (only if buttons exist)
  if (difficultyButtons.length > 0) {
    difficultyButtons.forEach(button => {
      button?.addEventListener("click", () => {
        difficultyButtons.forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
      });
    });
  }

  // Start Memorizing Button
  document.getElementById('start-memorizing-btn')?.addEventListener("click", () => {
    if (!booksElement?.value || !chaptersElement?.value || !verseElement?.value) {
      showErrorToast("Please select a book, chapter, and verse");
      return;
    }

    const book = booksElement.value;
    const chapter = chaptersElement.value;
    const verse = verseElement.value || "1"; 

    setParams(book, chapter, verse);
    game.start(book, chapter, verse);
  });

  // Game back button
  document.getElementById('game-back-btn')?.addEventListener('click', () => {
    showDashboard();
  });

  // ========== FOOTER EVENTS ==========
  
  document.getElementById('footer-home-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (auth.currentUser) {
      navigateTo(VIEWS.APP);
    } else {
      navigateTo(VIEWS.LANDING);
    }
  });

  document.getElementById('footer-support-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (auth.currentUser) {
      showSupportModal();
    } else {
      showAuthModal('signin');
    }
  });

  // ========== HEADER NAVIGATION ==========
  
  // Add profile navigation to header (done dynamically in updateAuthUI)
  
  // Setup support button in footer
  setupSupportButton();
}

/**
 * Show error toast
 */
function showErrorToast(message) {
  // Create toast element
  let toast = document.getElementById('error-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'error-toast';
    toast.style.cssText = `
      position: fixed;
      top: 90px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--accent-error);
      color: white;
      padding: var(--space-3) var(--space-6);
      border-radius: var(--radius-md);
      z-index: 1100;
      opacity: 0;
      transition: opacity 0.3s ease;
      font-weight: 500;
      box-shadow: var(--shadow-lg);
    `;
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.style.opacity = '1';
  
  setTimeout(() => {
    toast.style.opacity = '0';
  }, 3000);
}

/**
 * Setup Support Button in footer
 */
function setupSupportButton() {
  setTimeout(() => {
    const footer = document.getElementById('main-footer');
    if (footer && !document.getElementById('support-btn')) {
      const supportBtn = document.createElement('button');
      supportBtn.id = 'support-btn';
      supportBtn.className = 'support-btn';
      supportBtn.innerHTML = `<i class="fa-solid fa-heart"></i> Support the Mission`;
      supportBtn.addEventListener('click', () => {
        if (auth.currentUser) {
          showSupportModal();
        } else {
          showAuthModal('signin');
        }
      });
      
      const footerContent = footer.querySelector('.footer-content');
      if (footerContent) {
        footerContent.insertBefore(supportBtn, footerContent.querySelector('.footer-links'));
      }
    }
  }, 500);
}

// Initialize the app
init();