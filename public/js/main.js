/**
 * Main application entry point
 */
import { initI18n, localizer } from './i18n-setup.js';
import { createRouter, defineRoutes } from './router.js';
import './components-loader.js'; // Import all components
import { initAutoPageviewTracking } from './utils/datafast-tracking.js';
import * as datafastTracking from './utils/datafast-tracking.js';

// Initialize the application
let initialized = false;

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded, initializing app');
  if (!initialized) {
    initialized = true;
    initApp();
  }
});

// Also initialize immediately to handle direct navigation
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  console.log('Document already ready, initializing app');
  if (!initialized) {
    initialized = true;
    initApp();
  }
}

/**
 * Initialize the application
 */
function initApp() {
  // Set API base URL for client-side requests (domain only, without /api/1)
  // Use localhost for local development, production URL otherwise
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  window.API_BASE_URL = isLocalhost ? 'http://localhost:8099' : 'https://convert2doc.com';
  console.log('API base URL set to:', window.API_BASE_URL);
  
  // Initialize i18n first
  initI18n().then(() => {
    console.log('i18n initialized');
    
    // Initialize the router for SPA mode
    initRouter();
  }).catch(error => {
    console.error('Error initializing i18n:', error);
    
    // Initialize router anyway to allow basic navigation
    initRouter();
  });
}

/**
 * Initialize the router for SPA mode
 */
function initRouter() {
  // Debug: Log routes before registration
  console.log('About to register routes');
  
  // Create router with the imported functions
  const router = createRouter({
    rootElement: '#app'
  });
  
  // Define and register routes
  defineRoutes(router);
  
  // Initialize automatic pageview tracking for SPA navigation
  initAutoPageviewTracking();
  console.log('Datafast pageview tracking initialized');
  
  // Debug: Try to access the router's internal state
  console.log('Router internal state:', router);
  
  // Safely check router properties
  try {
    if (router) {
      console.log('Router routes property:', router.routes || 'undefined');
      
      if (router.routes && typeof router.routes === 'object') {
        console.log('Router routes keys after registration:', Object.keys(router.routes));
        console.log('Router route for / exists after registration:', router.routes['/'] !== undefined);
      } else {
        console.log('Router routes is not an object or is undefined');
      }
    } else {
      console.log('Router is undefined or null');
    }
  } catch (error) {
    console.error('Error accessing router properties:', error);
  }
  
  // Expose router globally
  window.router = router;
}

// Import page initializers
import {
  initLoginPage,
  initRegisterPage,
  initApiKeysPage,
  initSettingsPage,
  initSubscriptionPage,
  initResetPasswordPage
} from './page-initializers.js';

// No longer needed since we're using SPA mode exclusively

// No longer needed since we're using SPA mode exclusively

// Expose functions globally
window.app = window.app || {};
Object.assign(window.app, {
  initApp
});

// Expose Datafast tracking utilities globally for easy access
window.datafast = window.datafast || {};
window.datafastTracking = datafastTracking;