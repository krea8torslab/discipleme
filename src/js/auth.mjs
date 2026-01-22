/**
 * Firebase Authentication Module
 * 
 * Handles user authentication with Email/Password and Google Sign-In.
 * Includes UI rendering for auth modals.
 */

import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase-config.mjs';

const googleProvider = new GoogleAuthProvider();

// --- Auth State Management ---

let currentUser = null;
const authStateListeners = [];

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChanged(callback) {
  authStateListeners.push(callback);
  // Return unsubscribe function
  return () => {
    const index = authStateListeners.indexOf(callback);
    if (index > -1) authStateListeners.splice(index, 1);
  };
}

// Check for redirect result on page load (for signInWithRedirect flow)
getRedirectResult(auth).then(async (result) => {
  if (result?.user) {
    console.log('Google redirect sign-in successful');
    // User signed in via redirect, auth state listener will handle the rest
  }
}).catch((error) => {
  console.error('Redirect result error:', error);
});

// Initialize Firebase auth listener
firebaseOnAuthStateChanged(auth, async (user) => {
  currentUser = user;
  
  if (user) {
    // Ensure user document exists in Firestore
    await ensureUserDocument(user);
  }
  
  // Notify all listeners
  authStateListeners.forEach(cb => cb(user));
});

/**
 * Get current authenticated user
 */
export function getCurrentUser() {
  return currentUser;
}

// --- User Document Management ---

/**
 * Create or update user document in Firestore
 */
async function ensureUserDocument(user) {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    // Create new user document
    await setDoc(userRef, {
      displayName: user.displayName || 'Disciple',
      email: user.email,
      streak: 0,
      supporterStatus: false,
      aiRequestCount: 0,
      createdAt: serverTimestamp(),
      lastActivityDate: serverTimestamp()
    });
  } else {
    // Update last activity
    await setDoc(userRef, {
      lastActivityDate: serverTimestamp()
    }, { merge: true });
  }
}

// --- Authentication Methods ---

/**
 * Sign in with Google
 * Uses popup first, falls back to redirect if popup is blocked/cancelled
 */
export async function signInWithGoogle() {
  try {
    // First, try popup (faster, better UX when it works)
    const result = await signInWithPopup(auth, googleProvider);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Google sign-in popup error:', error);
    
    // If popup was blocked or cancelled, try redirect instead
    const popupErrors = [
      'auth/popup-blocked',
      'auth/popup-closed-by-user',
      'auth/cancelled-popup-request'
    ];
    
    if (popupErrors.includes(error.code)) {
      console.log('Popup failed, falling back to redirect sign-in...');
      try {
        // This will redirect to Google, then back to the app
        await signInWithRedirect(auth, googleProvider);
        // Note: This won't return - page will redirect
        return { success: true, redirecting: true };
      } catch (redirectError) {
        console.error('Redirect sign-in also failed:', redirectError);
        return { success: false, error: getAuthErrorMessage(redirectError.code) };
      }
    }
    
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Email sign-in error:', error);
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
}

/**
 * Create account with email and password
 */
export async function signUpWithEmail(email, password, displayName = 'Disciple') {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update profile with display name
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }
    
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Sign-up error:', error);
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Sign-out error:', error);
    return { success: false, error: error.message };
  }
}

// --- UI Rendering ---

/**
 * Show authentication modal
 */
export function showAuthModal(mode = 'signin') {
  // Remove existing modal if any
  const existing = document.getElementById('auth-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'auth-modal';
  modal.className = 'auth-modal-overlay';
  
  modal.innerHTML = `
    <div class="auth-modal">
      <button class="auth-modal-close" aria-label="Close">&times;</button>
      
      <div class="auth-modal-header">
        <h2>${mode === 'signin' ? 'Welcome Back!' : 'Join DiscipleMe'}</h2>
        <p>${mode === 'signin' ? 'Sign in to continue your journey' : 'Create an account to save your progress'}</p>
      </div>

      <button class="auth-google-btn" id="google-auth-btn">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      <div class="auth-divider">
        <span>or</span>
      </div>

      <form class="auth-form" id="auth-form">
        ${mode === 'signup' ? `
          <div class="auth-input-group">
            <label for="auth-name">Display Name</label>
            <input type="text" id="auth-name" placeholder="Your name" required>
          </div>
        ` : ''}
        
        <div class="auth-input-group">
          <label for="auth-email">Email</label>
          <input type="email" id="auth-email" placeholder="you@example.com" required>
        </div>

        <div class="auth-input-group">
          <label for="auth-password">Password</label>
          <input type="password" id="auth-password" placeholder="••••••••" required minlength="6">
        </div>

        <div class="auth-error" id="auth-error" style="display: none;"></div>

        <button type="submit" class="btn-primary auth-submit-btn">
          ${mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <p class="auth-switch">
        ${mode === 'signin' 
          ? `Don't have an account? <a href="#" id="switch-to-signup">Sign up</a>` 
          : `Already have an account? <a href="#" id="switch-to-signin">Sign in</a>`
        }
      </p>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  modal.querySelector('.auth-modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  // Google auth
  document.getElementById('google-auth-btn').addEventListener('click', async () => {
    const btn = document.getElementById('google-auth-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting...';
    btn.disabled = true;
    
    const result = await signInWithGoogle();
    
    if (result.success) {
      if (result.redirecting) {
        // Page will redirect to Google, show a message
        btn.innerHTML = '<i class="fa-solid fa-arrow-right"></i> Redirecting to Google...';
      } else {
        modal.remove();
      }
    } else {
      btn.innerHTML = originalText;
      btn.disabled = false;
      showAuthError(result.error);
    }
  });

  // Form submission
  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name')?.value;

    let result;
    if (mode === 'signup') {
      result = await signUpWithEmail(email, password, name);
    } else {
      result = await signInWithEmail(email, password);
    }

    if (result.success) {
      modal.remove();
    } else {
      showAuthError(result.error);
    }
  });

  // Switch between signin/signup
  const switchLink = document.getElementById('switch-to-signup') || document.getElementById('switch-to-signin');
  if (switchLink) {
    switchLink.addEventListener('click', (e) => {
      e.preventDefault();
      modal.remove();
      showAuthModal(mode === 'signin' ? 'signup' : 'signin');
    });
  }
}

function showAuthError(message) {
  const errorEl = document.getElementById('auth-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

// --- Helper Functions ---

function getAuthErrorMessage(code) {
  const errorMessages = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/invalid-credential': 'Invalid email or password.'
  };
  
  return errorMessages[code] || 'An error occurred. Please try again.';
}

/**
 * Update header UI based on auth state
 */
export function updateAuthUI(user) {
  const authContainer = document.getElementById('auth-buttons');
  const streakElement = document.querySelector('.streak');
  
  if (!authContainer) return;

  // Show/hide streak based on auth state
  if (streakElement) {
    streakElement.style.display = user ? 'flex' : 'none';
  }

  if (user) {
    // Create avatar content
    const avatarContent = user.photoURL 
      ? `<img src="${user.photoURL}" alt="${user.displayName}">`
      : (user.displayName || user.email || 'D').charAt(0).toUpperCase();
    
    authContainer.innerHTML = `
      <div class="dropdown" id="user-dropdown">
        <button class="user-avatar" id="user-menu-btn" aria-label="User menu">
          ${user.photoURL ? avatarContent : avatarContent}
        </button>
        <div class="dropdown-menu" id="user-menu">
          <div style="padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--border-subtle);">
            <div style="font-weight: 600; color: var(--text-primary);">${user.displayName || 'Disciple'}</div>
            <div style="font-size: var(--text-xs); color: var(--text-muted);">${user.email}</div>
          </div>
          <button class="dropdown-item" id="nav-app-btn">
            <i class="fa-solid fa-book-bible"></i> Practice
          </button>
          <button class="dropdown-item" id="nav-profile-btn">
            <i class="fa-solid fa-user"></i> Profile
          </button>
          <button class="dropdown-item" id="nav-support-btn">
            <i class="fa-solid fa-heart"></i> Support Us
          </button>
          <div class="dropdown-divider"></div>
          <button class="dropdown-item" id="sign-out-btn" style="color: var(--accent-error);">
            <i class="fa-solid fa-sign-out-alt"></i> Sign Out
          </button>
        </div>
      </div>
    `;
    
    // Toggle dropdown
    const dropdownBtn = document.getElementById('user-menu-btn');
    const dropdown = document.getElementById('user-dropdown');
    
    dropdownBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown?.classList.toggle('open');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      dropdown?.classList.remove('open');
    });
    
    // Navigation handlers
    document.getElementById('nav-app-btn')?.addEventListener('click', () => {
      window.location.hash = '/app';
      dropdown?.classList.remove('open');
    });
    
    document.getElementById('nav-profile-btn')?.addEventListener('click', () => {
      window.location.hash = '/profile';
      dropdown?.classList.remove('open');
    });
    
    document.getElementById('nav-support-btn')?.addEventListener('click', () => {
      import('./paystack.mjs').then(({ showSupportModal }) => showSupportModal());
      dropdown?.classList.remove('open');
    });
    
    document.getElementById('sign-out-btn')?.addEventListener('click', signOut);
  } else {
    authContainer.innerHTML = `
      <button class="btn-primary btn-sm" id="sign-in-btn">
        <i class="fa-solid fa-user"></i> Sign In
      </button>
    `;
    document.getElementById('sign-in-btn')?.addEventListener('click', () => showAuthModal('signin'));
  }
}
