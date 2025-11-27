/**
 * Datafast Analytics Tracking Utility
 * 
 * Provides a clean API for tracking pageviews and custom goals
 * using the Datafast analytics service.
 * 
 * @module datafast-tracking
 */

/**
 * Check if Datafast is available
 * @returns {boolean} True if datafast is loaded
 */
const isDatafastAvailable = () => typeof window?.datafast === 'function';

/**
 * Track a custom goal/event with Datafast
 * 
 * @param {string} eventName - The name of the event/goal to track
 * @param {Object} [properties={}] - Optional properties to include with the event
 * @param {string} [properties.name] - User's name
 * @param {string} [properties.email] - User's email
 * @param {string} [properties.product_id] - Product identifier
 * @returns {boolean} True if the event was tracked successfully
 * 
 * @example
 * // Track a checkout initiation
 * trackGoal('initiate_checkout', {
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   product_id: 'prod_123'
 * });
 * 
 * @example
 * // Track a simple event
 * trackGoal('button_click');
 */
export const trackGoal = (eventName, properties = {}) => {
  if (!eventName) {
    console.warn('[Datafast] Event name is required for tracking');
    return false;
  }

  if (!isDatafastAvailable()) {
    console.warn('[Datafast] Analytics not loaded yet');
    return false;
  }

  try {
    window.datafast(eventName, properties);
    return true;
  } catch (error) {
    console.error('[Datafast] Error tracking event:', error);
    return false;
  }
};

/**
 * Track a pageview event
 * 
 * @param {string} [path] - Optional path to track (defaults to current path)
 * @returns {boolean} True if the pageview was tracked successfully
 * 
 * @example
 * // Track current page
 * trackPageview();
 * 
 * @example
 * // Track specific path
 * trackPageview('/dashboard');
 */
export const trackPageview = (path) => {
  const pagePath = path ?? window.location.pathname;
  return trackGoal('pageview', { path: pagePath });
};

/**
 * Track checkout initiation
 * 
 * @param {Object} data - Checkout data
 * @param {string} [data.name] - Customer name
 * @param {string} [data.email] - Customer email
 * @param {string} [data.product_id] - Product identifier
 * @param {string} [data.plan] - Subscription plan name
 * @param {number} [data.amount] - Amount in cents
 * @returns {boolean} True if tracked successfully
 * 
 * @example
 * trackCheckoutInitiated({
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   product_id: 'prod_123',
 *   plan: 'pro',
 *   amount: 999
 * });
 */
export const trackCheckoutInitiated = (data = {}) => {
  return trackGoal('initiate_checkout', data);
};

/**
 * Track successful payment/conversion
 * 
 * @param {Object} data - Payment data
 * @param {string} [data.name] - Customer name
 * @param {string} [data.email] - Customer email
 * @param {string} [data.product_id] - Product identifier
 * @param {string} [data.plan] - Subscription plan name
 * @param {number} [data.amount] - Amount in cents
 * @param {string} [data.payment_method] - Payment method used
 * @returns {boolean} True if tracked successfully
 */
export const trackPaymentSuccess = (data = {}) => {
  return trackGoal('payment_success', data);
};

/**
 * Track user signup
 * 
 * @param {Object} data - Signup data
 * @param {string} [data.name] - User name
 * @param {string} [data.email] - User email
 * @param {string} [data.method] - Signup method (email, google, etc.)
 * @returns {boolean} True if tracked successfully
 */
export const trackSignup = (data = {}) => {
  return trackGoal('signup', data);
};

/**
 * Track user login
 * 
 * @param {Object} data - Login data
 * @param {string} [data.email] - User email
 * @param {string} [data.method] - Login method (email, google, etc.)
 * @returns {boolean} True if tracked successfully
 */
export const trackLogin = (data = {}) => {
  return trackGoal('login', data);
};

/**
 * Track document conversion
 * 
 * @param {Object} data - Conversion data
 * @param {string} data.from_format - Source format (pdf, docx, etc.)
 * @param {string} data.to_format - Target format (markdown, html, etc.)
 * @param {number} [data.file_size] - File size in bytes
 * @returns {boolean} True if tracked successfully
 */
export const trackConversion = (data = {}) => {
  return trackGoal('document_conversion', data);
};

/**
 * Track API key creation
 * 
 * @param {Object} data - API key data
 * @param {string} [data.key_name] - Name of the API key
 * @returns {boolean} True if tracked successfully
 */
export const trackApiKeyCreated = (data = {}) => {
  return trackGoal('api_key_created', data);
};

/**
 * Track feature usage
 * 
 * @param {string} featureName - Name of the feature used
 * @param {Object} [data={}] - Additional data about the feature usage
 * @returns {boolean} True if tracked successfully
 */
export const trackFeatureUsage = (featureName, data = {}) => {
  return trackGoal('feature_usage', { feature: featureName, ...data });
};

/**
 * Initialize automatic pageview tracking for SPA navigation
 * Listens to the 'route-changed' event and tracks pageviews automatically
 * 
 * @returns {Function} Cleanup function to remove the event listener
 */
export const initAutoPageviewTracking = () => {
  const handleRouteChange = () => {
    trackPageview();
  };

  window.addEventListener('route-changed', handleRouteChange);

  // Return cleanup function
  return () => {
    window.removeEventListener('route-changed', handleRouteChange);
  };
};

// Default export with all tracking functions
export default {
  trackGoal,
  trackPageview,
  trackCheckoutInitiated,
  trackPaymentSuccess,
  trackSignup,
  trackLogin,
  trackConversion,
  trackApiKeyCreated,
  trackFeatureUsage,
  initAutoPageviewTracking,
  isDatafastAvailable
};