/**
 * Page initializers module
 * Contains functions to initialize different pages in the application
 */

import { trackLogin, trackSignup, trackGoal, trackApiKeyCreated } from './utils/datafast-tracking.js';

/**
 * Initialize login page
 */
export async function initLoginPage() {
  const form = document.getElementById('login-form');
  if (!form) return;
  
  // Initialize auth status check button
  const checkAuthStatusButton = document.getElementById('check-auth-status');
  const authStatusResult = document.getElementById('auth-status-result');
  
  if (checkAuthStatusButton && authStatusResult) {
    checkAuthStatusButton.addEventListener('click', async () => {
      try {
        // Import auth status utility
        const { logAuthStatus } = await import('./utils/auth-status.js');
        
        // Show loading state
        authStatusResult.textContent = 'Checking auth status...';
        
        // Check auth status
        const status = await logAuthStatus();
        
        // Display result
        authStatusResult.textContent = JSON.stringify(status, null, 2);
      } catch (error) {
        console.error('Error checking auth status:', error);
        authStatusResult.textContent = `Error: ${error.message}`;
      }
    });
  }
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = 'Logging in...';
    submitButton.disabled = true;
    
    try {
      // Import the API client
      const { ApiClient } = await import('./api-client.js');
      
      // Import Supabase client for JWT authentication
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      
      // Fetch Supabase configuration from the server
      const configResponse = await fetch('/api/1/config/supabase');
      if (!configResponse.ok) {
        throw new Error('Failed to fetch Supabase configuration');
      }
      
      const { supabaseUrl, supabaseAnonKey } = await configResponse.json();
      
      console.log('Creating Supabase client with URL:', supabaseUrl);
      console.log('Anon key exists:', !!supabaseAnonKey);
      
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      console.log('Supabase client created successfully');
      
      console.log('Attempting to sign in with Supabase:', email);
      
      // Sign in with Supabase to get JWT token
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError) {
        console.error('Supabase auth error:', authError);
        throw new Error('Authentication failed: ' + authError.message);
      }
      
      if (!authData || !authData.session) {
        throw new Error('Authentication failed: No session data returned');
      }
      
      // Store JWT token in localStorage
      localStorage.setItem('jwt_token', authData.session.access_token);
      console.log('JWT token stored successfully, length:', authData.session.access_token.length);
      console.log('JWT token preview:', authData.session.access_token.substring(0, 10) + '...');
      
      try {
        // Check subscription status using the JWT token
        console.log('Checking subscription status for:', email);
        const subscriptionStatus = await ApiClient.checkSubscriptionStatus(email);
        console.log('Subscription status:', subscriptionStatus);
      } catch (subscriptionError) {
        console.error('Error checking subscription status:', subscriptionError);
        // Continue even if subscription check fails
        // We'll handle this case below
      }
      
      // Get subscription status from the try/catch block above
      let subscriptionStatus = null;
      try {
        subscriptionStatus = await ApiClient.checkSubscriptionStatus(email);
      } catch (error) {
        console.warn('Could not verify subscription status, proceeding with login anyway');
      }
      
      // Store username regardless of subscription status
      localStorage.setItem('username', email);
      
      if (subscriptionStatus && subscriptionStatus.has_subscription) {
        console.log('User has an active subscription');
        // User has an active subscription
        localStorage.setItem('subscription_data', JSON.stringify(subscriptionStatus));
        
        // Create and store a sanitized user object without PII
        const userObject = {
          username: email.split('@')[0], // Extract username from email
          subscription: {
            plan: subscriptionStatus.plan || 'monthly',
            status: subscriptionStatus.status || 'active',
            expiresAt: subscriptionStatus.expires_at || null
          },
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('user', JSON.stringify(userObject));
      } else {
        console.log('No subscription data available or user has no active subscription');
        // Create a basic sanitized user object without PII
        const userObject = {
          username: email.split('@')[0], // Extract username from email
          subscription: {
            status: 'unknown'
          },
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('user', JSON.stringify(userObject));
      }
      
      // Track successful login
      trackLogin({
        email,
        method: 'email'
      });
      
      // Dispatch auth changed event
      window.dispatchEvent(new CustomEvent('auth-changed'));
      
      // Check if the user is using the default password
      if (password === 'ChangeMe123!') {
        // Redirect to the reset password page
        console.log('User is using default password, redirecting to reset password page');
        alert('For security reasons, please change your default password before continuing.');
        window.router.navigate('/reset-password');
      } else {
        // Redirect to the API keys page
        console.log('Login successful, redirecting to API keys page');
        window.router.navigate('/api-keys');
      }
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error stack:', error.stack);
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
      
      // Provide more specific error messages based on the error type
      let errorMessage = 'Login failed: ';
      
      if (error.message && error.message.includes('API key')) {
        errorMessage += 'Invalid credentials. Please check your email and password.';
      } else if (error.message && error.message.includes('session')) {
        errorMessage += 'Authentication server error. Please try again later.';
      } else {
        errorMessage += (error.message || 'Unable to complete login process');
      }
      
      console.error('Showing error message to user:', errorMessage);
      alert(errorMessage);
    }
  });
}

/**
 * Initialize register page
 */
export function initRegisterPage() {
  const form = document.getElementById('register-form');
  if (!form) return;
  
  // Set up plan selection
  const planOptions = document.querySelectorAll('.plan-option');
  if (planOptions.length > 0) {
    planOptions.forEach(option => {
      option.addEventListener('click', () => {
        planOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
      });
    });
  }
  
  // Set up payment method selection
  const paymentMethods = document.querySelectorAll('.payment-method');
  if (paymentMethods.length > 0) {
    paymentMethods.forEach(method => {
      method.addEventListener('click', () => {
        paymentMethods.forEach(m => m.classList.remove('selected'));
        method.classList.add('selected');
      });
    });
  }
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get the submit button reference right away to avoid reference errors
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : 'Register & Subscribe';
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    // Get selected plan and payment method if they exist
    let selectedPlan = 'monthly';
    let selectedPayment = 'btc';
    
    const selectedPlanElement = document.querySelector('.plan-option.selected');
    if (selectedPlanElement) {
      selectedPlan = selectedPlanElement.dataset.plan;
    }
    
    const selectedPaymentElement = document.querySelector('.payment-method.selected');
    if (selectedPaymentElement) {
      selectedPayment = selectedPaymentElement.dataset.payment;
    }
    
    // If Stripe is selected as payment method, we'll use a popup for checkout
    // No need to show any additional fields for Stripe payment
    if (selectedPayment === 'stripe') {
      // Remove any existing Stripe container since we're using Checkout instead
      const existingContainer = document.getElementById('stripe-card-container');
      if (existingContainer) {
        existingContainer.remove();
      }
      
      // Remove any existing info container if present
      const infoContainer = document.getElementById('stripe-info-container');
      if (infoContainer) {
        infoContainer.remove();
      }
    }
    
    // Show loading state
    submitButton.textContent = 'Processing...';
    submitButton.disabled = true;
    
    try {
      // Import the API client
      const { ApiClient } = await import('./api-client.js');
      
      // Register user through the server API instead of directly with Supabase
      console.log('Registering user through server API');
      
      // Create a registration request with all necessary data
      const registrationData = {
        email,
        password,
        plan: selectedPlan,
        payment_method: selectedPayment
      };
      
      // For Stripe payment, we'll register the user first, then redirect to Stripe Checkout
      if (selectedPayment === 'stripe') {
        // Continue with registration but mark payment as pending
        registrationData.payment_status = 'pending';
      }
      
      // Send registration request to the server
      const response = await fetch('/api/1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Registration error:', errorData);
        throw new Error('Registration failed: ' + (errorData.error || response.statusText));
      }
      
      const authData = await response.json();
      
      // Track successful signup
      trackSignup({
        email,
        method: 'email',
        plan: selectedPlan,
        payment_method: selectedPayment
      });
      
      if (authData && authData.session && authData.session.access_token) {
        // Store JWT token in localStorage
        localStorage.setItem('jwt_token', authData.session.access_token);
        console.log('JWT token stored successfully');
      } else {
        console.warn('No session data returned during registration. This might be expected if email confirmation is required.');
        // We'll continue with subscription creation even without a JWT token
      }
      
      // Handle different payment flows
      if (selectedPayment === 'stripe') {
        // For Stripe, redirect to the checkout page
        console.log('Redirecting to Stripe Checkout');
        
        try {
          // Generate a unique client ID for this registration attempt
          const tempClientId = `temp_${Date.now()}`;
          localStorage.setItem('temp_client_id', tempClientId);
          
          // Store registration data in localStorage only (no database)
          localStorage.setItem('temp_registration_email', email);
          localStorage.setItem('temp_registration_plan', selectedPlan);
          localStorage.setItem('temp_register_timestamp', Date.now().toString());
          
          // Simple function to redirect to Stripe checkout
          function redirectToStripeCheckout(checkoutUrl) {
            console.log('Redirecting to Stripe checkout:', checkoutUrl);
            
            // Store the checkout URL in case we need to retry
            localStorage.setItem('temp_checkout_url', checkoutUrl);
            
            // Direct redirect - simple is better
            window.location.href = checkoutUrl;
          }
          
          // Ultra-simple checkout flow - just one API call
          try {
            console.log('Creating Stripe checkout session...');
            submitButton.disabled = true;
            submitButton.textContent = 'Preparing checkout...';
            
            // Use our simplified endpoint that makes a direct fetch call to Stripe
            const response = await fetch('/api/stripe-simple/create-checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                email,
                plan: selectedPlan
              })
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Failed to create checkout session');
            }
            
            const data = await response.json();
            console.log('Checkout session created:', data);
            
            // Check for checkout URL
            if (!data.url && !data.checkout_url) {
              throw new Error('No checkout URL in response');
            }
            
            // Save checkout details in localStorage
            localStorage.setItem('temp_checkout_id', data.id);
            
            // Redirect to Stripe checkout page
            redirectToStripeCheckout(data.checkout_url || data.url);
            return;
          } catch (error) {
            console.error('Simple checkout failed:', error);
            
            // Fallback to direct checkout if simple checkout fails
            try {
              console.log('Falling back to direct checkout...');
              submitButton.textContent = 'Retrying checkout...';
              
              const response = await fetch('/api/stripe-direct/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  email, 
                  plan: selectedPlan
                })
              });
              
              if (!response.ok) {
                throw new Error('Fallback checkout also failed');
              }
              
              const data = await response.json();
              
              if (data.checkout_url || data.url) {
                redirectToStripeCheckout(data.checkout_url || data.url);
                return;
              }
              
              throw new Error('No checkout URL in fallback response');
            } catch (fallbackError) {
              console.error('Fallback checkout failed:', fallbackError);
            }
          }
          
          // Our redirection logic is now handled in the redirectToStripeCheckout function
          
          return;
        } catch (error) {
          console.error('Stripe checkout error:', error);
          alert('Payment setup failed. Please try again or contact support.');
          
          // Reset button state
          submitButton.textContent = originalButtonText;
          submitButton.disabled = false;
          return;
        }
      } else {
        // For crypto payments, continue with the regular flow
        const subscriptionData = await ApiClient.createSubscription(email, selectedPlan, selectedPayment);
        console.log('Subscription created:', subscriptionData);
        
        // Store user data in localStorage
        localStorage.setItem('username', email);
        localStorage.setItem('subscription_data', JSON.stringify(subscriptionData));
      }
      
      // Create and store a sanitized user object without PII
      const userObject = {
        username: email.split('@')[0], // Extract username from email
        subscription: {
          plan: subscriptionData.subscription?.plan || selectedPlan,
          status: 'pending',
          expiresAt: null
        },
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('user', JSON.stringify(userObject));
      
      // Dispatch auth changed event
      window.dispatchEvent(new CustomEvent('auth-changed'));
      
      // Show success message with payment information
      const paymentAddress = subscriptionData.subscription.payment_address;
      const amount = subscriptionData.subscription.amount;
      const cryptoAmount = subscriptionData.subscription.crypto_amount ? subscriptionData.subscription.crypto_amount.toFixed(8) : 'calculating...';
      const coin = subscriptionData.subscription.payment_method.toUpperCase();
      
      // Create elements to store references for updating later
      const statusDisplay = {
        container: null,
        text: null,
        spinner: null
      };
      
      // Function to check payment status and update UI
      const checkPaymentStatus = async (email, paymentAddress, coin) => {
        try {
          // Use the ApiClient class for consistency with the correct API path
          const subscriptionStatus = await ApiClient.checkSubscriptionStatus(email);
          console.log('Payment status check result:', subscriptionStatus);
          
          // Use the result from the API client
          const data = subscriptionStatus;
          
          // Check if we have valid references to the elements
          if (!statusDisplay.container || !statusDisplay.text || !statusDisplay.spinner) {
            console.error('Status elements not found');
            return false;
          }
          
          if (data.has_subscription && data.subscription.status === 'active') {
            // Payment received, show success message
            statusDisplay.container.style.backgroundColor = '#d1fae5'; // Light green
            statusDisplay.text.textContent = 'Payment received! Redirecting to your dashboard...';
            statusDisplay.spinner.style.display = 'none';
            
            // Wait 3 seconds and redirect
            setTimeout(() => {
              // Use the dialog completion handler instead of trying to click a button
              window.router.navigate('/api-keys');
            }, 3000);
            
            // Clear the polling interval
            return true;
          }
          
          // Payment not received yet, keep polling
          return false;
        } catch (error) {
          console.error('Error checking payment status:', error);
          return false;
        }
      };
      
      // Import PfDialog component
      const { default: PfDialog } = await import('./components/pf-dialog.js');
      
      // Enhanced dialog with the payment information, copyable fields and payment verification
      // Using classes instead of IDs to make them easier to query
      const paymentDialog = PfDialog.alert(`
        <div class="payment-success">
          <h3 style="color: #2563eb; margin-bottom: 15px;">Registration Successful!</h3>
          <p style="margin-bottom: 20px;">Please send <strong>${amount} USD</strong> (<strong>${cryptoAmount} ${coin}</strong>) to the address below:</p>
          
          <div style="margin-bottom: 15px;">
            <label style="display: block; font-weight: 600; margin-bottom: 5px;">Amount:</label>
            <div style="display: flex; align-items: center;">
              <input type="text" value="${cryptoAmount} ${coin}" readonly
                style="flex: 1; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; background-color: #f9fafb;">
              <button onclick="navigator.clipboard.writeText('${cryptoAmount} ${coin}').then(() => this.textContent = 'Copied!'); setTimeout(() => this.textContent = 'Copy', 2000)"
                style="margin-left: 8px; padding: 8px 12px; background-color: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer;">Copy</button>
            </div>
          </div>
          
          <div style="margin-bottom: 15px;">
            <label style="display: block; font-weight: 600; margin-bottom: 5px;">Address:</label>
            <div style="display: flex; align-items: center;">
              <input type="text" value="${paymentAddress}" readonly
                style="flex: 1; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; background-color: #f9fafb;">
              <button onclick="navigator.clipboard.writeText('${paymentAddress}').then(() => this.textContent = 'Copied!'); setTimeout(() => this.textContent = 'Copy', 2000)"
                style="margin-left: 8px; padding: 8px 12px; background-color: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer;">Copy</button>
            </div>
          </div>
          
          <div class="payment-status-container" style="margin-top: 20px; padding: 12px; border-radius: 6px; background-color: #f0f9ff; display: flex; align-items: center;">
            <div class="payment-spinner" style="margin-right: 12px; width: 20px; height: 20px; border: 3px solid rgba(37, 99, 235, 0.3); border-radius: 50%; border-top-color: #2563eb; animation: spin 1s linear infinite;"></div>
            <p class="payment-status-text" style="margin: 0; color: #1e40af;">Waiting for payment confirmation...</p>
          </div>
          
          <style>
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </div>
      `, 'Payment Details', null, 'Check Payment Status');
      
      // Find the dialog in the DOM and get references to status elements
      // We need to wait for the dialog to be fully rendered
      const userEmail = document.getElementById('email').value;
      let pollingInterval = null;
      
      setTimeout(() => {
        // Find dialog in the document
        const dialog = document.querySelector('pf-dialog');
        if (dialog && dialog.shadowRoot) {
          // Query the dialog's shadow DOM for elements
          const dialogBody = dialog.shadowRoot.querySelector('.dialog-body');
          const continueButton = dialog.shadowRoot.querySelector('.confirm-button');
          
          if (dialogBody && continueButton) {
            // Get references to status elements
            statusDisplay.container = dialogBody.querySelector('.payment-status-container');
            statusDisplay.spinner = dialogBody.querySelector('.payment-spinner');
            statusDisplay.text = dialogBody.querySelector('.payment-status-text');
            
            // Initial state - hide the status container until Continue is clicked
            if (statusDisplay.container) {
              statusDisplay.container.style.display = 'none';
            }
            
            // Replace the Continue button click handler to handle polling
            continueButton.removeEventListener('click', continueButton.onclick);
            continueButton.addEventListener('click', async function(e) {
              e.preventDefault();
              e.stopPropagation();
              
              // Show the spinner in the button and disable it
              const originalButtonText = continueButton.textContent;
              continueButton.innerHTML = `<span style="display: inline-block; width: 15px; height: 15px; border: 2px solid white; border-radius: 50%; border-top-color: transparent; margin-right: 8px; animation: spin 1s linear infinite;"></span> Checking...`;
              continueButton.disabled = true;
              
              // Show the status container
              if (statusDisplay.container) {
                statusDisplay.container.style.display = 'flex';
              }
              
              // First check if payment is already received
              const paymentReceived = await checkPaymentStatus(userEmail, paymentAddress, coin);
              if (paymentReceived) {
                // Already paid, will redirect shortly
                return;
              }
              
              // Start polling for payment status every 5 seconds
              pollingInterval = setInterval(async () => {
                const paymentReceived = await checkPaymentStatus(userEmail, paymentAddress, coin);
                if (paymentReceived) {
                  clearInterval(pollingInterval);
                }
              }, 5000); // Check every 5 seconds
            });
            
            console.log('Payment verification components initialized');
          }
        }
      }, 300); // Short delay to ensure dialog is rendered
      
      // Add an event listener to clean up the interval when the dialog is closed
      // The continue button already has the click handler from the PfDialog.alert call
      document.addEventListener('dialog-closed', function dialogClosedHandler() {
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }
        document.removeEventListener('dialog-closed', dialogClosedHandler);
      }, { once: true });
    } catch (error) {
      console.error('Registration error:', error);
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
      
      // Show error message
      alert('Registration failed: ' + (error.message || 'Unable to create subscription'));
    }
  });
}

/**
 * Initialize API keys page
 */
export async function initApiKeysPage() {
  try {
    // Import auth status utility
    const { checkAuthStatus } = await import('./utils/auth-status.js');
    
    // Check auth status with the server
    const status = await checkAuthStatus();
    
    if (!status.authenticated) {
      console.log('Not authenticated, redirecting to login page:', status.message);
      window.router.navigate('/login');
      return;
    }
    
    console.log('Authentication verified with server');
  } catch (error) {
    console.error('Error checking authentication status:', error);
    window.router.navigate('/login');
    return;
  }
  
  // Initialize API keys page
  console.log('JWT token found, initializing API keys page');
}

/**
 * Initialize settings page
 */
export async function initSettingsPage() {
  try {
    // Import auth status utility
    const { checkAuthStatus } = await import('./utils/auth-status.js');
    
    // Check auth status with the server
    const status = await checkAuthStatus();
    
    if (!status.authenticated) {
      console.log('Not authenticated, redirecting to login page:', status.message);
      window.router.navigate('/login');
      return;
    }
    
    console.log('Authentication verified with server');
  } catch (error) {
    console.error('Error checking authentication status:', error);
    window.router.navigate('/login');
    return;
  }
  
  console.log('JWT token found, initializing settings page');
  
  // Initialize profile form
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Update profile
      // ...
      
      // Import PfDialog component
      import('./components/pf-dialog.js').then(({ default: PfDialog }) => {
        PfDialog.alert('Profile updated successfully!');
      });
    });
  }
  
  // Initialize password form
  const passwordForm = document.getElementById('password-form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;
      
      if (newPassword !== confirmPassword) {
        import('./components/pf-dialog.js').then(({ default: PfDialog }) => {
          PfDialog.alert('New passwords do not match');
        });
        return;
      }
      
      // Update password
      // ...
      
      import('./components/pf-dialog.js').then(({ default: PfDialog }) => {
        PfDialog.alert('Password changed successfully!');
      });
    });
  }
  
  // Initialize delete account button
  const deleteButton = document.getElementById('delete-account-button');
  if (deleteButton) {
    deleteButton.addEventListener('click', async () => {
      const { default: PfDialog } = await import('./components/pf-dialog.js');
      
      const confirmed = await PfDialog.confirm(
        'Are you sure you want to delete your account? This action cannot be undone.',
        'Delete Account',
        null,
        null,
        'Delete',
        'Cancel'
      );
      
      if (confirmed) {
        // Delete account
        // ...
        
        // Clear authentication data
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('username');
        
        // Dispatch auth changed event
        window.dispatchEvent(new CustomEvent('auth-changed'));
        
        // Redirect to home page
        window.router.navigate('/');
      }
    });
  }
}

/**
 * Initialize subscription page
 */
export function initSubscriptionPage() {
  // Import the subscription form component
  import('./components/subscription-form.js').then(() => {
    console.log('Subscription form component loaded');
    
    // Check if user is logged in using JWT token
    const jwtToken = localStorage.getItem('jwt_token');
    const email = localStorage.getItem('username');
    
    console.log('Initializing subscription page, JWT token exists:', !!jwtToken);
    
    // If user is logged in, pre-fill the email field
    if (jwtToken && email) {
      console.log('User is logged in, pre-filling email:', email);
      const subscriptionForm = document.querySelector('subscription-form');
      if (subscriptionForm) {
        subscriptionForm._email = email;
        subscriptionForm.render();
      }
    }
    
    // Check if we have subscription data in localStorage
    const subscriptionData = localStorage.getItem('subscription_data');
    if (subscriptionData) {
      try {
        // Parse the subscription data
        const data = JSON.parse(subscriptionData);
        
        // Get the subscription form component
        const subscriptionForm = document.querySelector('subscription-form');
        
        // Set the subscription data
        if (subscriptionForm) {
          // Use the component's API to set the data
          if (data.subscription) {
            subscriptionForm._subscription = data.subscription;
          }
          if (data.payment_info) {
            subscriptionForm._paymentInfo = data.payment_info;
          }
          subscriptionForm._email = data.subscription?.email || email || '';
          subscriptionForm.render();
          
          // Clear the localStorage data to prevent reuse
          localStorage.removeItem('subscription_data');
        }
      } catch (error) {
        console.error('Error parsing subscription data:', error);
      }
    }
  }).catch(error => {
    console.error('Error loading subscription form component:', error);
  });
}

/**
 * Initialize the test-feature page
 */
export function initTestFeaturePage() {
  console.log('Initializing test-feature page');
  
  // Get the form element
  const form = document.getElementById('test-feature-form');
  if (!form) {
    console.error('test-feature form not found');
    return;
  }
  
  // Get the result container
  const resultContainer = document.getElementById('form-result');
  if (!resultContainer) {
    console.error('Form result container not found');
    return;
  }
  
  // Add submit event listener to the form
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = 'Processing...';
    submitButton.disabled = true;
    
    try {
      // Get form data
      const formData = new FormData(form);
      const formDataObj = Object.fromEntries(formData.entries());
      
      // Process the form data
      console.log('Form data:', formDataObj);
      
      // In a real application, you would send this data to a server
      // For this example, we'll just simulate a server response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      resultContainer.style.display = 'block';
      resultContainer.style.backgroundColor = '#d1fae5'; // Light green
      resultContainer.innerHTML = `
        <h3>Form Submitted Successfully</h3>
        <p>Thank you, ${formDataObj.name}! Your message has been received.</p>
        <p>We'll respond to ${formDataObj.email} as soon as possible.</p>
      `;
      
      // Reset the form
      form.reset();
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // Show error message
      resultContainer.style.display = 'block';
      resultContainer.style.backgroundColor = '#fee2e2'; // Light red
      resultContainer.innerHTML = `
        <h3>Error Submitting Form</h3>
        <p>Sorry, there was an error processing your submission.</p>
        <p>Error: ${error.message || 'Unknown error'}</p>
      `;
    } finally {
      // Reset button state
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
    }
  });
}

/**
 * Initialize the faqs page
 */
export function initFaqsPage() {
  console.log('Initializing faqs page');
  
  // Get the form element
  const form = document.getElementById('faqs-form');
  if (!form) {
    console.error('faqs form not found');
    return;
  }
  
  // Get the result container
  const resultContainer = document.getElementById('form-result');
  if (!resultContainer) {
    console.error('Form result container not found');
    return;
  }
  
  // Add submit event listener to the form
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = 'Processing...';
    submitButton.disabled = true;
    
    try {
      // Get form data
      const formData = new FormData(form);
      const formDataObj = Object.fromEntries(formData.entries());
      
      // Process the form data
      console.log('Form data:', formDataObj);
      
      // In a real application, you would send this data to a server
      // For this example, we'll just simulate a server response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      resultContainer.style.display = 'block';
      resultContainer.style.backgroundColor = '#d1fae5'; // Light green
      resultContainer.innerHTML = `
        <h3>Form Submitted Successfully</h3>
        <p>Thank you, ${formDataObj.name}! Your message has been received.</p>
        <p>We'll respond to ${formDataObj.email} as soon as possible.</p>
      `;
      
      // Reset the form
      form.reset();
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // Show error message
      resultContainer.style.display = 'block';
      resultContainer.style.backgroundColor = '#fee2e2'; // Light red
      resultContainer.innerHTML = `
        <h3>Error Submitting Form</h3>
        <p>Sorry, there was an error processing your submission.</p>
        <p>Error: ${error.message || 'Unknown error'}</p>
      `;
    } finally {
      // Reset button state
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
    }
  });
}

/**
 * Initialize the test-fix page
 */
export function initTestFixPage() {
  console.log('Initializing test-fix page');
  
  // Get the form element
  const form = document.getElementById('test-fix-form');
  if (!form) {
    console.error('test-fix form not found');
    return;
  }
  
  // Get the result container
  const resultContainer = document.getElementById('form-result');
  if (!resultContainer) {
    console.error('Form result container not found');
    return;
  }
  
  // Add submit event listener to the form
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = 'Processing...';
    submitButton.disabled = true;
    
    try {
      // Get form data
      const formData = new FormData(form);
      const formDataObj = Object.fromEntries(formData.entries());
      
      // Process the form data
      console.log('Form data:', formDataObj);
      
      // In a real application, you would send this data to a server
      // For this example, we'll just simulate a server response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      resultContainer.style.display = 'block';
      resultContainer.style.backgroundColor = '#d1fae5'; // Light green
      resultContainer.innerHTML = `
        <h3>Form Submitted Successfully</h3>
        <p>Thank you, ${formDataObj.name}! Your message has been received.</p>
        <p>We'll respond to ${formDataObj.email} as soon as possible.</p>
      `;
      
      // Reset the form
      form.reset();
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // Show error message
      resultContainer.style.display = 'block';
      resultContainer.style.backgroundColor = '#fee2e2'; // Light red
      resultContainer.innerHTML = `
        <h3>Error Submitting Form</h3>
        <p>Sorry, there was an error processing your submission.</p>
        <p>Error: ${error.message || 'Unknown error'}</p>
      `;
    } finally {
      // Reset button state
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
    }
  });
}

/**
 * Initialize manage subscription page
 */
export async function initManageSubscriptionPage() {
  // Import and initialize the subscription management page
  const { initSubscriptionManagement } = await import('./views/manage-subscription.js');
  return initSubscriptionManagement();
}

/**
 * Initialize the test-fix-2 page
 */
export function initTestFix2Page() {
  console.log('Initializing test-fix-2 page');
  
  // Get the form element
  const form = document.getElementById('test-fix-2-form');
  if (!form) {
    console.error('test-fix-2 form not found');
    return;
  }
  
  // Get the result container
  const resultContainer = document.getElementById('form-result');
  if (!resultContainer) {
    console.error('Form result container not found');
    return;
  }
  
  // Add submit event listener to the form
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = 'Processing...';
    submitButton.disabled = true;
    
    try {
      // Get form data
      const formData = new FormData(form);
      const formDataObj = Object.fromEntries(formData.entries());
      
      // Process the form data
      console.log('Form data:', formDataObj);
      
      // In a real application, you would send this data to a server
      // For this example, we'll just simulate a server response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      resultContainer.style.display = 'block';
      resultContainer.style.backgroundColor = '#d1fae5'; // Light green
      resultContainer.innerHTML = `
        <h3>Form Submitted Successfully</h3>
        <p>Thank you, ${formDataObj.name}! Your message has been received.</p>
        <p>We'll respond to ${formDataObj.email} as soon as possible.</p>
      `;
      
      // Reset the form
      form.reset();
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // Show error message
      resultContainer.style.display = 'block';
      resultContainer.style.backgroundColor = '#fee2e2'; // Light red
      resultContainer.innerHTML = `
        <h3>Error Submitting Form</h3>
        <p>Sorry, there was an error processing your submission.</p>
        <p>Error: ${error.message || 'Unknown error'}</p>
      `;
    } finally {
      // Reset button state
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
    }
  });
}

/**
 * Initialize the charts page
 */
export async function initChartsPage() {
  console.log('Initializing charts page');
  
  try {
    // Import and initialize the charts page functionality
    const { initChartsInteractivity } = await import('./views/charts.js');
    initChartsInteractivity();
    console.log('Charts page initialized successfully');
  } catch (error) {
    console.error('Error initializing charts page:', error);
  }
}

/**
 * Initialize reset password page
 */
export async function initResetPasswordPage() {
  try {
    // Import auth status utility
    const { checkAuthStatus } = await import('./utils/auth-status.js');
    
    // Check auth status with the server
    const status = await checkAuthStatus();
    
    if (!status.authenticated) {
      console.log('Not authenticated, redirecting to login page:', status.message);
      window.router.navigate('/login');
      return;
    }
    
    console.log('Authentication verified with server');
  } catch (error) {
    console.error('Error checking authentication status:', error);
    window.router.navigate('/login');
    return;
  }
  
  console.log('JWT token found, initializing reset password page');
  
  // The reset password form is handled by the inline script in the HTML file
}