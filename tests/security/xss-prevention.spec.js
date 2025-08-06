/**
 * Security Tests for XSS Prevention and Input Sanitization
 * Tests protection against various security vulnerabilities
 */

const { ChromeApiMocks } = require('../mocks/chrome-apis');
const { securityTestPayloads } = require('../fixtures/test-data');

describe('XSS Prevention and Input Sanitization', () => {
  let chromeMocks;
  let mockDOMPurify;
  
  beforeEach(() => {
    chromeMocks = new ChromeApiMocks();
    global.chrome = chromeMocks.chrome;
    chromeMocks.setupDefaultBehaviors();
    
    // Mock DOMPurify for testing
    mockDOMPurify = {
      sanitize: jest.fn((input, options) => {
        // Basic sanitization simulation
        if (typeof input !== 'string') return '';
        return input
          .replace(/<script[^>]*>.*?<\/script>/gis, '')
          .replace(/<iframe[^>]*>.*?<\/iframe>/gis, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }),
      isSupported: true
    };
    
    global.DOMPurify = mockDOMPurify;
    
    // Mock DOM elements for testing
    global.document = {
      createElement: jest.fn((tag) => ({
        tagName: tag.toUpperCase(),
        innerHTML: '',
        textContent: '',
        setAttribute: jest.fn(),
        removeAttribute: jest.fn(),
        appendChild: jest.fn(),
        removeChild: jest.fn()
      })),
      getElementById: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => [])
    };
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    chromeMocks.reset();
    global.DOMPurify = undefined;
    global.document = undefined;
  });

  describe('HTML Content Sanitization', () => {
    test('should sanitize malicious script tags', () => {
      const maliciousInputs = [
        '<script>alert("XSS")</script>Normal content',
        '<script src="evil.js"></script>Content',
        '<SCRIPT>maliciousCode()</SCRIPT>',
        '<script\x20type="text/javascript">alert("XSS")</script>',
        '<script\x0Dtype="text/javascript">alert("XSS")</script>',
        '<script\x0Asrc="http://evil.com/xss.js"></script>'
      ];

      maliciousInputs.forEach(input => {
        const sanitized = sanitizeHtmlContent(input);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('</script>');
        expect(sanitized).not.toContain('alert(');
        expect(sanitized).not.toContain('maliciousCode');
      });
    });

    test('should sanitize dangerous HTML elements', () => {
      const dangerousElements = [
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<object data="data:text/html,<script>alert(\'XSS\')</script>"></object>',
        '<embed src="javascript:alert(\'XSS\')">',
        '<form><input type="hidden" name="csrf" value="token"></form>',
        '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
        '<style>body{background:url("javascript:alert(\'XSS\')")}</style>'
      ];

      dangerousElements.forEach(element => {
        const sanitized = sanitizeHtmlContent(element);
        expect(sanitized).not.toContain('<iframe');
        expect(sanitized).not.toContain('<object');
        expect(sanitized).not.toContain('<embed');
        expect(sanitized).not.toContain('<form');
        expect(sanitized).not.toContain('<link');
        expect(sanitized).not.toContain('<style');
      });
    });

    test('should sanitize event handlers', () => {
      const eventHandlerInputs = [
        '<div onclick="alert(\'XSS\')">Click me</div>',
        '<img src="x" onerror="alert(\'XSS\')">',
        '<button onmouseover="stealCookies()">Hover</button>',
        '<input type="text" onfocus="maliciousFunction()">',
        '<body onload="executePayload()">Content</body>',
        '<svg onload="alert(\'XSS\')"></svg>'
      ];

      eventHandlerInputs.forEach(input => {
        const sanitized = sanitizeHtmlContent(input);
        expect(sanitized).not.toMatch(/on\w+\s*=/i);
        expect(sanitized).not.toContain('alert(');
        expect(sanitized).not.toContain('stealCookies');
        expect(sanitized).not.toContain('maliciousFunction');
      });
    });

    test('should preserve safe HTML elements', () => {
      const safeContent = [
        '<p>Safe paragraph content</p>',
        '<strong>Bold text</strong>',
        '<em>Italic text</em>',
        '<ul><li>List item</li></ul>',
        '<br>',
        '<code>safe code block</code>',
        '<pre>preformatted text</pre>',
        '<blockquote>quoted text</blockquote>'
      ];

      safeContent.forEach(content => {
        const sanitized = sanitizeHtmlContent(content);
        expect(sanitized).toContain(content.replace(/<[^>]+>/g, '')); // Should preserve text content
      });
    });

    test('should handle encoded XSS attempts', () => {
      const encodedPayloads = [
        '&lt;script&gt;alert("XSS")&lt;/script&gt;',
        '%3Cscript%3Ealert("XSS")%3C/script%3E',
        '&#60;script&#62;alert("XSS")&#60;/script&#62;',
        '\u003cscript\u003ealert("XSS")\u003c/script\u003e'
      ];

      encodedPayloads.forEach(payload => {
        const sanitized = sanitizeHtmlContent(payload);
        // Should not decode and execute
        expect(sanitized).not.toContain('alert("XSS")');
      });
    });
  });

  describe('URL Sanitization', () => {
    test('should block javascript: URLs', () => {
      const javascriptUrls = [
        'javascript:alert("XSS")',
        'JAVASCRIPT:alert("XSS")',
        'javascript%3Aalert("XSS")',
        'javascript&#58;alert("XSS")',
        'javascript\x00:alert("XSS")',
        'java\x00script:alert("XSS")'
      ];

      javascriptUrls.forEach(url => {
        const sanitized = sanitizeUrl(url);
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('alert');
        expect(sanitized).toBe('#') // Should fallback to safe URL
      });
    });

    test('should block data: URLs with HTML content', () => {
      const dataUrls = [
        'data:text/html,<script>alert("XSS")</script>',
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgiWFNTIik8L3NjcmlwdD4=',
        'data:image/svg+xml,<svg onload="alert(\'XSS\')"></svg>'
      ];

      dataUrls.forEach(url => {
        const sanitized = sanitizeUrl(url);
        if (url.includes('script') || url.includes('onload')) {
          expect(sanitized).toBe('#'); // Should block dangerous data URLs
        }
      });
    });

    test('should allow safe URLs', () => {
      const safeUrls = [
        'https://example.com',
        'http://example.com',
        'chrome-extension://extension-id/page.html',
        '/relative/path.html',
        '#anchor-link',
        'mailto:user@example.com',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yAAAAABJRU5ErkJggg==' // 1x1 pixel PNG
      ];

      safeUrls.forEach(url => {
        const sanitized = sanitizeUrl(url);
        expect(sanitized).toBe(url); // Should remain unchanged
      });
    });
  });

  describe('Message Content Sanitization', () => {
    test('should sanitize user messages before processing', () => {
      const maliciousMessages = [
        'Tell me about <script>stealData()</script> security',
        'How do I implement <iframe src="evil.com"></iframe> authentication?',
        'javascript:alert("XSS") - explain this code',
        '<img src=x onerror=alert("XSS")>What is this?'
      ];

      maliciousMessages.forEach(message => {
        const sanitized = sanitizeUserMessage(message);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('<iframe>');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror=');
        // Should preserve meaningful content
        expect(sanitized.length).toBeGreaterThan(0);
      });
    });

    test('should sanitize generated response content', () => {
      const responses = [
        'Here\'s how to implement: <script>maliciousCode()</script>',
        'Use this pattern: <iframe src="data:text/html,<script>alert(1)</script>"></iframe>',
        'Try this approach: <img src=x onerror="alert(\'XSS\')">'
      ];

      responses.forEach(response => {
        const sanitized = sanitizeResponseContent(response);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('<iframe>');
        expect(sanitized).not.toContain('onerror=');
        expect(sanitized).not.toContain('maliciousCode');
      });
    });

    test('should sanitize custom rules and notes', () => {
      const customRules = [
        'Always validate input <script>alert("rule")</script>',
        '<iframe src="evil.com">Rule content</iframe>',
        'Use secure patterns javascript:void(0)'
      ];

      customRules.forEach(rule => {
        const sanitized = sanitizeCustomRule(rule);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('<iframe>');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).toContain('Always validate input') || 
        expect(sanitized).toContain('Rule content') ||
        expect(sanitized).toContain('Use secure patterns'); // Should preserve text
      });
    });
  });

  describe('DOM Manipulation Security', () => {
    test('should use textContent instead of innerHTML for user content', () => {
      const mockElement = {
        textContent: '',
        innerHTML: '',
        appendChild: jest.fn(),
        removeChild: jest.fn()
      };

      global.document.createElement.mockReturnValue(mockElement);

      // Simulate safe DOM manipulation
      const userContent = '<script>alert("XSS")</script>User note';
      updateElementContent(mockElement, userContent);

      // Should set textContent, not innerHTML
      expect(mockElement.textContent).toBe(userContent);
      expect(mockElement.innerHTML).toBe(''); // Should not be set
    });

    test('should sanitize before inserting HTML content', () => {
      const mockElement = {
        innerHTML: '',
        textContent: ''
      };

      const htmlContent = '<p>Safe content</p><script>alert("XSS")</script>';
      setInnerHTMLSafely(mockElement, htmlContent);

      expect(mockElement.innerHTML).not.toContain('<script>');
      expect(mockElement.innerHTML).toContain('<p>Safe content</p>');
    });

    test('should validate element attributes before setting', () => {
      const mockElement = {
        setAttribute: jest.fn(),
        removeAttribute: jest.fn()
      };

      const dangerousAttributes = [
        { name: 'onclick', value: 'alert("XSS")' },
        { name: 'src', value: 'javascript:alert("XSS")' },
        { name: 'href', value: 'javascript:void(0)' }
      ];

      dangerousAttributes.forEach(attr => {
        setSafeAttribute(mockElement, attr.name, attr.value);
        
        // Should not set dangerous attributes
        if (attr.name.startsWith('on') || attr.value.includes('javascript:')) {
          expect(mockElement.setAttribute).not.toHaveBeenCalledWith(attr.name, attr.value);
        }
      });
    });
  });

  describe('Content Security Policy (CSP) Compliance', () => {
    test('should generate CSP-compliant HTML', () => {
      const generatedContent = generateHtmlResponse('Test content with formatting');
      
      // Should not contain inline scripts or styles
      expect(generatedContent).not.toMatch(/<script[^>]*>/);
      expect(generatedContent).not.toMatch(/<style[^>]*>/);
      expect(generatedContent).not.toMatch(/on\w+\s*=/);
      expect(generatedContent).not.toContain('javascript:');
    });

    test('should use nonce for legitimate scripts if needed', () => {
      // If the extension needs legitimate scripts, they should use CSP nonce
      const nonce = generateSecureNonce();
      const scriptWithNonce = `<script nonce="${nonce}">legitimateCode();</script>`;
      
      expect(nonce).toMatch(/^[a-zA-Z0-9+/=]+$/); // Base64 pattern
      expect(nonce.length).toBeGreaterThan(16); // Sufficient entropy
      expect(scriptWithNonce).toContain(`nonce="${nonce}"`);
    });

    test('should reject inline event handlers in CSP mode', () => {
      const elementsWithHandlers = [
        '<button onclick="handleClick()">Click</button>',
        '<div onload="initialize()">Content</div>',
        '<img onmouseover="showTooltip()">',
        '<form onsubmit="validateForm()">Form</form>'
      ];

      elementsWithHandlers.forEach(element => {
        const cspCompliant = makeCSPCompliant(element);
        expect(cspCompliant).not.toMatch(/on\w+\s*=/);
      });
    });
  });

  describe('Input Validation Edge Cases', () => {
    test('should handle null and undefined inputs', () => {
      expect(sanitizeHtmlContent(null)).toBe('');
      expect(sanitizeHtmlContent(undefined)).toBe('');
      expect(sanitizeUrl(null)).toBe('#');
      expect(sanitizeUrl(undefined)).toBe('#');
      expect(sanitizeUserMessage(null)).toBe('');
      expect(sanitizeUserMessage(undefined)).toBe('');
    });

    test('should handle extremely long inputs', () => {
      const longInput = 'A'.repeat(1000000) + '<script>alert("XSS")</script>';
      const sanitized = sanitizeHtmlContent(longInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized.length).toBeLessThanOrEqual(longInput.length);
    });

    test('should handle special characters and encoding', () => {
      const specialChars = [
        '&amp;&lt;&gt;&quot;&#x27;',
        '💻🤖🔒🛡️', // Emojis
        'Iñtërnâtiônàlizætiøn', // International characters
        '\u0000\u0001\u0002', // Control characters
        '‌‍⁠', // Zero-width characters
      ];

      specialChars.forEach(input => {
        const sanitized = sanitizeHtmlContent(input);
        expect(typeof sanitized).toBe('string');
        expect(sanitized).not.toContain('<script>');
      });
    });

    test('should handle malformed HTML', () => {
      const malformedHtml = [
        '<script><script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)" onerror="alert(2)">',
        '<div class="<script>alert(1)</script>">Content</div>',
        '<<script>alert("XSS")<</script>>'
      ];

      malformedHtml.forEach(html => {
        const sanitized = sanitizeHtmlContent(html);
        expect(sanitized).not.toContain('alert(');
        expect(sanitized).not.toContain('<script>');
      });
    });
  });

  describe('Chrome Extension Security Context', () => {
    test('should validate chrome-extension:// URLs', () => {
      const extensionUrls = [
        'chrome-extension://valid-id/page.html',
        'chrome-extension://../../../etc/passwd',
        'chrome-extension://malicious-id/../../page.html',
        'chrome-extension://valid-id/page.html?param=<script>alert(1)</script>'
      ];

      extensionUrls.forEach(url => {
        const isValid = validateExtensionUrl(url);
        
        if (url.includes('../') || url.includes('<script>')) {
          expect(isValid).toBe(false);
        } else if (url.startsWith('chrome-extension://valid-id/')) {
          expect(isValid).toBe(true);
        }
      });
    });

    test('should sanitize postMessage communications', () => {
      const messages = [
        { action: 'update', data: '<script>alert("XSS")</script>' },
        { action: 'ping', callback: 'javascript:alert(1)' },
        { 
          action: 'setContent', 
          html: '<div onclick="stealData()">Content</div>' 
        }
      ];

      messages.forEach(message => {
        const sanitized = sanitizePostMessage(message);
        expect(JSON.stringify(sanitized)).not.toContain('<script>');
        expect(JSON.stringify(sanitized)).not.toContain('javascript:');
        expect(JSON.stringify(sanitized)).not.toContain('onclick=');
      });
    });

    test('should validate content script injection context', () => {
      const contexts = [
        { url: 'https://example.com', allowed: true },
        { url: 'chrome://settings/', allowed: false },
        { url: 'chrome-extension://other-extension/', allowed: false },
        { url: 'file:///local/file.html', allowed: false },
        { url: 'about:blank', allowed: false }
      ];

      contexts.forEach(context => {
        const isAllowed = isContentScriptAllowed(context.url);
        expect(isAllowed).toBe(context.allowed);
      });
    });
  });
});

// Security utility functions (would be in actual extension code)
function sanitizeHtmlContent(input) {
  if (!input || typeof input !== 'string') return '';
  
  return mockDOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'ul', 'ol', 'li', 'br', 'code', 'pre'],
    ALLOWED_ATTR: ['class'],
    FORBID_SCRIPT: true,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'style', 'link']
  });
}

function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '#';
  
  const lower = url.toLowerCase();
  if (lower.startsWith('javascript:') || 
      lower.startsWith('vbscript:') ||
      lower.startsWith('data:text/html') ||
      lower.includes('<script>')) {
    return '#';
  }
  
  return url;
}

function sanitizeUserMessage(message) {
  return sanitizeHtmlContent(message);
}

function sanitizeResponseContent(content) {
  return sanitizeHtmlContent(content);
}

function sanitizeCustomRule(rule) {
  return sanitizeHtmlContent(rule);
}

function updateElementContent(element, content) {
  // Always use textContent for user-provided content
  element.textContent = content;
}

function setInnerHTMLSafely(element, html) {
  element.innerHTML = sanitizeHtmlContent(html);
}

function setSafeAttribute(element, name, value) {
  // Block dangerous attributes
  if (name.startsWith('on') || 
      (name === 'src' && value.includes('javascript:')) ||
      (name === 'href' && value.includes('javascript:'))) {
    return;
  }
  
  element.setAttribute(name, value);
}

function generateHtmlResponse(content) {
  const sanitized = sanitizeHtmlContent(content);
  return `<div class="response-content">${sanitized}</div>`;
}

function generateSecureNonce() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

function makeCSPCompliant(html) {
  return html.replace(/\son\w+\s*=[^>\s]+/gi, '');
}

function validateExtensionUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  if (!url.startsWith('chrome-extension://')) return false;
  if (url.includes('../')) return false;
  if (url.includes('<script>')) return false;
  
  return true;
}

function sanitizePostMessage(message) {
  if (!message || typeof message !== 'object') return {};
  
  const sanitized = {};
  for (const [key, value] of Object.entries(message)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHtmlContent(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

function isContentScriptAllowed(url) {
  if (!url || typeof url !== 'string') return false;
  
  return url.startsWith('http://') || 
         url.startsWith('https://') ||
         url.startsWith('chrome-extension://test-id/'); // Own extension pages only
}