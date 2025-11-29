/**
 * Enhanced renderer for SPA Router
 * Provides component preservation and translation support
 */
import { extractModuleScriptSources, executeInlineScripts, filterScriptTags } from './component-loader.js';

/**
 * Create a content renderer that handles translations and component preservation
 * @param {Object} options - Renderer options
 * @param {Function} options.translateContainer - Function to translate a container
 * @param {Function} options.applyRTLToDocument - Function to apply RTL direction to document
 * @param {Boolean} options.handleScripts - Whether to handle scripts in content (default: true)
 * @param {Boolean} options.keepScripts - Whether to keep script tags in the output (default: false)
 * @returns {Function} Renderer function
 */
export function createRenderer(options = {}) {
  const translateContainer = options.translateContainer || ((container) => {});
  const applyRTLToDocument = options.applyRTLToDocument || (() => {});
  const handleScripts = options.handleScripts !== false; // Default to true
  const keepScripts = options.keepScripts === true; // Default to false

  return async (content, element) => {
    // Create a new container with absolute positioning (off-screen)
    const newContainer = document.createElement('div');
    newContainer.style.position = 'absolute';
    newContainer.style.top = '0';
    newContainer.style.left = '0';
    newContainer.style.width = '100%';
    newContainer.style.height = '100%';
    newContainer.style.opacity = '0'; // Start hidden
    newContainer.style.zIndex = '1'; // Above the current content
    
    // Handle different content types
    let doc;
    
    if (content instanceof DocumentFragment) {
      console.log('Received DocumentFragment as content');
      // Create a temporary document to hold the fragment
      doc = document.implementation.createHTMLDocument('');
      
      // Clone the fragment to avoid modifying the original
      const clonedFragment = content.cloneNode(true);
      
      // Append the fragment to the document body
      doc.body.appendChild(clonedFragment);
    } else if (typeof content === 'string') {
      console.log('Received string as content');
      // Parse the content into DOM
      const parser = new DOMParser();
      doc = parser.parseFromString(content, 'text/html');
    } else {
      console.error('Unsupported content type:', typeof content);
      throw new Error('Unsupported content type: ' + typeof content);
    }
    
    // Handle scripts if enabled
    let scriptExecutor;
    let moduleScripts = [];
    let scriptElements = [];
    
    if (handleScripts) {
      // Extract module scripts but don't execute them yet
      // We'll store them to execute after the DOM is updated
      moduleScripts = extractModuleScriptSources(doc);
      
      // Get the script executor function to be called after content is added to DOM
      scriptExecutor = await executeInlineScripts(doc);
      
      // If keepScripts is true, collect all script elements to be properly inserted later
      if (keepScripts) {
        console.log('Collecting script tags to properly insert them later');
        scriptElements = Array.from(doc.querySelectorAll('script')).map(script => {
          // Create a clone of the script element
          const newScript = document.createElement('script');
          
          // Copy all attributes
          Array.from(script.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
          });
          
          // Copy the content
          newScript.textContent = script.textContent;
          
          // Remove the original script from the DOM
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
          
          return newScript;
        });
        
        console.log(`Collected ${scriptElements.length} script elements`);
      } else {
        // Filter out script tags from the content
        const bodyWithoutScripts = filterScriptTags(doc.body, false);
        
        // Clear the body and append each child individually
        while (doc.body.firstChild) {
          doc.body.removeChild(doc.body.firstChild);
        }
        
        Array.from(bodyWithoutScripts.children).forEach(child => {
          doc.body.appendChild(child);
        });
      }
    }
    
    // Get all existing web components in the current DOM to preserve
    const existingComponents = {};
    const customElements = element.querySelectorAll('*').filter(el => el.tagName.includes('-'));
    
    customElements.forEach(el => {
      const id = el.tagName.toLowerCase();
      existingComponents[id] = el;
    });
    
    // Process the new content
    Array.from(doc.body.children).forEach(child => {
      // If it's a custom element that already exists, skip it (we'll keep the existing one)
      if (child.tagName.includes('-') && existingComponents[child.tagName.toLowerCase()]) {
        console.log(`Preserving existing component: ${child.tagName.toLowerCase()}`);
      } else {
        // Otherwise, add the new element to the container
        newContainer.appendChild(child);
      }
    });
    
    // Translate all text in new DOM
    if (translateContainer) {
      translateContainer(newContainer);
    }
    
    // Add preserved components back to the new container
    Object.values(existingComponents).forEach(component => {
      newContainer.appendChild(component);
    });
    
    // Add the new container to the DOM
    element.appendChild(newContainer);
    
    // Apply RTL direction if needed
    if (applyRTLToDocument) {
      applyRTLToDocument();
    }
    
    // Short delay to ensure everything is ready, then show new content and remove old
    setTimeout(() => {
      // Remove all old content
      Array.from(element.children).forEach(child => {
        if (child !== newContainer) {
          element.removeChild(child);
        }
      });
      
      // Show the new content by changing position and opacity
      newContainer.style.position = 'relative';
      newContainer.style.opacity = '1';
      
      // Execute inline scripts if we have a script executor
      if (scriptExecutor) {
        console.log('Executing inline scripts');
        scriptExecutor(newContainer);
      }
      
      // Insert collected script elements if keepScripts is true
      if (scriptElements && scriptElements.length > 0) {
        console.log(`Inserting ${scriptElements.length} script elements into the DOM`);
        scriptElements.forEach(script => {
          if (script.type === 'module') {
            console.log(`Inserting module script: ${script.src || 'inline'}`);
          } else {
            console.log(`Inserting regular script: ${script.src || 'inline'}`);
          }
          
          // If it's a src script, ensure the URL is absolute
          if (script.src && !script.src.startsWith('http://') && !script.src.startsWith('https://')) {
            const baseUrl = window.location.origin;
            const absoluteSrc = script.src.startsWith('/')
              ? `${baseUrl}${script.src}`
              : `${baseUrl}/${script.src}`;
            script.src = absoluteSrc;
          }
          
          // Append to the document to execute it
          document.head.appendChild(script);
        });
      }
      
      // Now that the DOM is updated, import and execute module scripts
      if (moduleScripts.length > 0) {
        console.log('Importing module scripts after DOM update');
        
        // Get the base URL of the current application
        const baseUrl = window.location.origin;
        
        // Import each module script
        moduleScripts.forEach(src => {
          // Create a new script element
          const script = document.createElement('script');
          script.type = 'module';
          
          // Convert to absolute URL if needed
          if (src.startsWith('http://') || src.startsWith('https://')) {
            script.src = src;
          } else {
            // For local scripts, create absolute URL based on current origin
            const absoluteSrc = src.startsWith('/')
              ? `${baseUrl}${src}`
              : `${baseUrl}/${src}`;
            script.src = absoluteSrc;
          }
          
          console.log(`Loading module script: ${script.src}`);
          document.head.appendChild(script);
        });
      }
      
      // Dispatch a custom event to notify that the SPA transition is complete
      window.dispatchEvent(new CustomEvent('spa-transition-end'));
    }, 50);
  };
}

/**
 * Create a default error handler
 * @param {Object} options - Error handler options
 * @returns {Function} Error handler function
 */
export function createErrorHandler(options = {}) {
  return (path) => {
    return `
      <div class="error-page">
        <h1>404 - Page Not Found</h1>
        <p>The page "${path}" could not be found.</p>
        <a href="/" class="back-link">Go back to home</a>
      </div>
    `;
  };
}

export default {
  createRenderer,
  createErrorHandler
};