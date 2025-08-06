/**
 * Security Utilities for AI Prompting Guide Extension
 * Provides XSS prevention, input sanitization, and secure DOM manipulation
 */

class SecurityUtils {
  constructor() {
    // Safe HTML tags allowed in responses
    this.allowedTags = ['p', 'strong', 'em', 'ul', 'ol', 'li', 'br', 'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    this.allowedAttributes = ['class', 'id'];
    
    // Dangerous patterns to filter
    this.dangerousPatterns = [
      /<script[^>]*>.*?<\/script>/gis,
      /<iframe[^>]*>.*?<\/iframe>/gis,
      /<object[^>]*>.*?<\/object>/gis,
      /<embed[^>]*>.*?<\/embed>/gis,
      /<form[^>]*>.*?<\/form>/gis,
      /<input[^>]*>/gis,
      /<style[^>]*>.*?<\/style>/gis,
      /<link[^>]*>/gis,
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /on\w+\s*=/gi
    ];
  }

  /**
   * Sanitize HTML content to prevent XSS attacks
   * @param {string} html - The HTML content to sanitize
   * @returns {string} - Sanitized HTML
   */
  sanitizeHtml(html) {
    if (!html || typeof html !== 'string') {
      return '';
    }

    let sanitized = html;

    // Remove dangerous patterns
    this.dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Additional XSS prevention for encoded content
    sanitized = sanitized
      .replace(/&lt;script/gi, '&amp;lt;script')
      .replace(/&lt;\/script/gi, '&amp;lt;/script')
      .replace(/%3Cscript/gi, '%253Cscript')
      .replace(/\\u003c/gi, '\\\\u003c');

    return sanitized;
  }

  /**
   * Sanitize text content for safe display
   * @param {string} text - The text content to sanitize
   * @returns {string} - Sanitized text
   */
  sanitizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/&/g, '&amp;');
  }

  /**
   * Sanitize URLs to prevent javascript: and data: URL attacks
   * @param {string} url - The URL to sanitize
   * @returns {string} - Sanitized URL or fallback
   */
  sanitizeUrl(url) {
    if (!url || typeof url !== 'string') {
      return '#';
    }

    const lower = url.toLowerCase().trim();
    
    // Block dangerous URL schemes
    if (lower.startsWith('javascript:') || 
        lower.startsWith('vbscript:') ||
        lower.startsWith('data:text/html') ||
        lower.includes('<script>') ||
        lower.includes('%3cscript')) {
      return '#';
    }

    // Allow safe URL schemes
    const safeSchemes = ['https:', 'http:', 'chrome-extension:', 'mailto:', '#'];
    const hasValidScheme = safeSchemes.some(scheme => 
      lower.startsWith(scheme) || url.startsWith('/')
    );

    return hasValidScheme ? url : '#';
  }

  /**
   * Safely set element content using textContent instead of innerHTML
   * @param {Element} element - The DOM element
   * @param {string} content - The content to set
   */
  setTextContent(element, content) {
    if (!element) return;
    element.textContent = this.sanitizeText(content || '');
  }

  /**
   * Safely set element HTML content with sanitization
   * @param {Element} element - The DOM element
   * @param {string} html - The HTML content to set
   */
  setInnerHTMLSafe(element, html) {
    if (!element) return;
    element.innerHTML = this.sanitizeHtml(html || '');
  }

  /**
   * Create a safe DOM element with sanitized attributes
   * @param {string} tagName - The tag name
   * @param {Object} attributes - Attributes to set
   * @param {string} content - Text content
   * @returns {Element} - The created element
   */
  createElement(tagName, attributes = {}, content = '') {
    if (!this.allowedTags.includes(tagName.toLowerCase())) {
      tagName = 'div'; // Default to safe element
    }

    const element = document.createElement(tagName);
    
    // Set safe attributes
    for (const [name, value] of Object.entries(attributes)) {
      this.setSafeAttribute(element, name, value);
    }

    // Set safe content
    if (content) {
      this.setTextContent(element, content);
    }

    return element;
  }

  /**
   * Safely set element attributes
   * @param {Element} element - The DOM element
   * @param {string} name - Attribute name
   * @param {string} value - Attribute value
   */
  setSafeAttribute(element, name, value) {
    if (!element || !name) return;

    const safeName = name.toLowerCase();
    
    // Block dangerous attributes
    if (safeName.startsWith('on') || 
        !this.allowedAttributes.includes(safeName)) {
      return;
    }

    // Sanitize URL attributes
    if (safeName === 'src' || safeName === 'href') {
      value = this.sanitizeUrl(value);
    }

    element.setAttribute(name, value);
  }

  /**
   * Validate and sanitize message data for chrome.runtime messaging
   * @param {Object} message - The message object to validate
   * @returns {Object} - Sanitized message
   */
  sanitizeMessage(message) {
    if (!message || typeof message !== 'object') {
      return {};
    }

    const sanitized = {};
    
    for (const [key, value] of Object.entries(message)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeText(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMessage(value); // Recursive sanitization
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value; // Safe primitive types
      }
      // Skip functions and other unsafe types
    }

    return sanitized;
  }

  /**
   * Debounce function calls to prevent excessive API requests
   * @param {Function} func - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} - Debounced function
   */
  debounce(func, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * Validate Chrome extension URL
   * @param {string} url - URL to validate
   * @returns {boolean} - Whether URL is valid
   */
  validateExtensionUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    if (!url.startsWith('chrome-extension://')) return false;
    if (url.includes('../')) return false;
    if (url.includes('<script>')) return false;
    
    return true;
  }

  /**
   * Generate Content Security Policy nonce
   * @returns {string} - Secure nonce value
   */
  generateNonce() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  /**
   * Escape HTML for safe template usage
   * @param {string} unsafe - Unsafe string
   * @returns {string} - HTML-escaped string
   */
  escapeHtml(unsafe) {
    return (unsafe || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Safely create HTML templates with escaped values
   * @param {string} template - Template string
   * @param {Object} values - Values to substitute
   * @returns {string} - Safe HTML
   */
  createSafeTemplate(template, values = {}) {
    let safe = template;
    
    for (const [key, value] of Object.entries(values)) {
      const placeholder = `{{${key}}}`;
      const escapedValue = this.escapeHtml(String(value));
      safe = safe.replace(new RegExp(placeholder, 'g'), escapedValue);
    }
    
    return safe;
  }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecurityUtils;
} else {
  window.SecurityUtils = SecurityUtils;
}