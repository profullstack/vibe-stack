import { trackCheckoutInitiated, trackPaymentSuccess, trackGoal } from '../utils/datafast-tracking.js';

/**
 * Initialize the Stripe payment page
 */
export function initStripePaymentPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get('payment');
  
  if (paymentStatus === 'success') {
    window.showFloatingAlert('Payment successful! Your subscription is now active.', 'success');
    // Track successful payment
    trackPaymentSuccess({
      plan: localStorage.getItem('last_selected_plan') || 'unknown'
    });
    // Remove the query parameter from the URL
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (paymentStatus === 'cancel') {
    window.showFloatingAlert('Payment cancelled. You can try again when you\'re ready.', 'info');
    // Track payment cancellation
    trackGoal('payment_cancelled', {
      plan: localStorage.getItem('last_selected_plan') || 'unknown'
    });
    // Remove the query parameter from the URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  
  // Pre-fill the form with data from localStorage if available
  const emailInput = document.getElementById('email');
  if (emailInput) {
    // Get email from localStorage
    const email = localStorage.getItem('stripe_payment_email');
    if (email) {
      emailInput.value = email;
      // Clear the localStorage item
      localStorage.removeItem('stripe_payment_email');
    }
  }
  
  // Get plan from localStorage
  const plan = localStorage.getItem('stripe_payment_plan');
  if (plan && (plan === 'monthly' || plan === 'yearly')) {
    // Select the appropriate radio button
    const planRadios = document.querySelectorAll('input[name="plan"]');
    planRadios.forEach(radio => {
      if (radio.value === plan) {
        radio.checked = true;
        // Update the selected class
        document.querySelectorAll('.plan-option').forEach(option => {
          if (option.contains(radio)) {
            option.classList.add('selected');
          } else {
            option.classList.remove('selected');
          }
        });
        // Update price display
        updatePriceDisplay(plan);
      }
    });
    
    // Clear the localStorage item
    localStorage.removeItem('stripe_payment_plan');
  }
  
  // Get elements
  const monthlyPlan = document.getElementById('monthly-plan');
  const yearlyPlan = document.getElementById('yearly-plan');
  const monthlyRadio = document.querySelector('input[value="monthly"]');
  const yearlyRadio = document.querySelector('input[value="yearly"]');
  
  // Add event listeners for plan selection
  if (monthlyPlan && yearlyPlan && monthlyRadio && yearlyRadio) {
    monthlyRadio.addEventListener('change', function() {
      updatePriceDisplay('monthly');
    });
    
    yearlyRadio.addEventListener('change', function() {
      updatePriceDisplay('yearly');
    });
    
    monthlyPlan.addEventListener('click', function() {
      monthlyRadio.checked = true;
      updatePriceDisplay('monthly');
    });
    
    yearlyPlan.addEventListener('click', function() {
      yearlyRadio.checked = true;
      updatePriceDisplay('yearly');
    });
  }
  
  // Function to update price display
  function updatePriceDisplay(plan) {
    const priceDisplay = document.getElementById('price-display');
    const selectedPlanInput = document.getElementById('selected-plan');
    const monthlyPlan = document.getElementById('monthly-plan');
    const yearlyPlan = document.getElementById('yearly-plan');
    
    if (priceDisplay && selectedPlanInput) {
      const monthlyPrice = 5;
      const yearlyPrice = 30;
      
      // Update price display
      if (plan === 'yearly') {
        priceDisplay.textContent = `$${yearlyPrice.toFixed(2)}/year`;
      } else {
        priceDisplay.textContent = `$${monthlyPrice.toFixed(2)}/month`;
      }
      
      // Update selected plan input
      selectedPlanInput.value = plan;
      
      // Update selected class
      if (monthlyPlan && yearlyPlan) {
        if (plan === 'yearly') {
          yearlyPlan.classList.add('selected');
          monthlyPlan.classList.remove('selected');
        } else {
          monthlyPlan.classList.add('selected');
          yearlyPlan.classList.remove('selected');
        }
      }
      
      console.log(`Price display updated to: ${priceDisplay.textContent} for plan: ${plan}`);
    }
  }
  
  // Initialize price display based on default selection
  const defaultPlan = document.querySelector('input[name="plan"]:checked')?.value || 'monthly';
  updatePriceDisplay(defaultPlan);
  
  // Handle form submission
  const form = document.getElementById('stripe-form');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = document.getElementById('email').value.trim();
      const plan = document.getElementById('selected-plan').value;
      
      if (!email) {
        window.showFloatingAlert('Please enter your email address', 'error');
        return;
      }
      
      // Show loading state
      const submitButton = document.getElementById('payment-button');
      submitButton.disabled = true;
      submitButton.textContent = 'Processing...';
      
      // Get the current URL for success and cancel URLs
      const currentUrl = window.location.href;
      const successUrl = `${currentUrl}?payment=success`;
      const cancelUrl = `${currentUrl}?payment=cancel`;
      
      try {
        console.log('Creating checkout session with:', { email, plan, successUrl, cancelUrl });
        
        // Track checkout initiation
        trackCheckoutInitiated({
          email,
          plan,
          amount: plan === 'yearly' ? 3000 : 500
        });
        
        // Store the selected plan for tracking on return
        localStorage.setItem('last_selected_plan', plan);
        
        // Show processing state
        submitButton.disabled = true;
        submitButton.textContent = 'Processing...';
        
        // Create checkout session
        const response = await fetch('/api/1/payments/stripe/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            plan,
            success_url: successUrl,
            cancel_url: cancelUrl
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Server error response:', errorText);
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Checkout session created:', data);
        
        if (data && data.checkout_url) {
          console.log('Redirecting to:', data.checkout_url);
          // Redirect to Stripe checkout
          window.location.href = data.checkout_url;
        } else {
          console.error('No checkout URL in response:', data);
          window.showFloatingAlert('Failed to create checkout session', 'error');
          submitButton.disabled = false;
          submitButton.textContent = 'Subscribe with Stripe';
        }
      } catch (error) {
        console.error('Payment error:', error);
        window.showFloatingAlert('An error occurred while processing your payment', 'error');
        submitButton.disabled = false;
        submitButton.textContent = 'Subscribe with Stripe';
      }
    });
  }
}

// Initialize the page when the module is imported
initStripePaymentPage();