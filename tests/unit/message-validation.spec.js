/**
 * Unit Tests for Message Handling and Validation
 * Tests message validation, sanitization, and communication protocols
 */

const { ChromeApiMocks } = require('../mocks/chrome-apis');
const { 
  testSpecialists, 
  testModels,
  testMessages,
  securityTestPayloads 
} = require('../fixtures/test-data');

describe('Message Handling and Validation', () => {
  let chromeMocks;
  
  beforeEach(() => {
    chromeMocks = new ChromeApiMocks();
    global.chrome = chromeMocks.chrome;
    chromeMocks.setupDefaultBehaviors();
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    chromeMocks.reset();
  });

  describe('Message Structure Validation', () => {
    test('should validate required message fields', () => {
      // Test cases for message validation
      const validMessage = { action: 'getSpecialists' };
      const invalidMessages = [
        null,
        undefined,
        {},
        { action: null },
        { action: '' },
        { notAction: 'test' }
      ];

      // Valid message should pass
      expect(validateMessage(validMessage)).toBe(true);
      
      // Invalid messages should fail
      invalidMessages.forEach(msg => {
        expect(validateMessage(msg)).toBe(false);
      });
    });

    test('should validate message action types', () => {
      const validActions = [
        'getSpecialists',
        'getModels',
        'getUserPreferences',
        'getSpecialistDetails',
        'getModelDetails',
        'saveUserPreferences',
        'saveUserNotes',
        'saveCustomRules',
        'generateResponse',
        'toggleInterface',
        'ping'
      ];

      const invalidActions = [
        'invalidAction',
        'GETSPECIALISTS', // Wrong case
        'get_specialists', // Wrong format
        '<script>alert("xss")</script>',
        'admin_deleteAll',
        'system_shutdown'
      ];

      validActions.forEach(action => {
        expect(validateMessageAction(action)).toBe(true);
      });

      invalidActions.forEach(action => {
        expect(validateMessageAction(action)).toBe(false);
      });
    });

    test('should validate message payload data', () => {
      const testCases = [
        {
          message: { action: 'getSpecialistDetails', specialistId: 'valid-id' },
          valid: true
        },
        {
          message: { action: 'getSpecialistDetails', specialistId: '' },
          valid: false
        },
        {
          message: { action: 'saveUserNotes', specialistId: 'valid-id', notes: 'Valid notes' },
          valid: true
        },
        {
          message: { action: 'saveUserNotes', specialistId: 'valid-id', notes: null },
          valid: false
        },
        {
          message: { action: 'generateResponse', specialistId: 'id', modelId: 'id', message: 'text' },
          valid: true
        },
        {
          message: { action: 'generateResponse', specialistId: '', modelId: 'id', message: 'text' },
          valid: false
        }
      ];

      testCases.forEach(({ message, valid }) => {
        expect(validateMessagePayload(message)).toBe(valid);
      });
    });
  });

  describe('Input Sanitization', () => {
    test('should sanitize HTML in user input', () => {
      const testCases = [
        {
          input: '<script>alert("xss")</script>',
          expected: '&lt;script&gt;alert("xss")&lt;/script&gt;'
        },
        {
          input: '<img src="x" onerror="alert(\'xss\')">',
          expected: '&lt;img src="x" onerror="alert(\'xss\')"&gt;'
        },
        {
          input: 'Normal text with <b>bold</b>',
          expected: 'Normal text with &lt;b&gt;bold&lt;/b&gt;'
        },
        {
          input: 'Text with & ampersand',
          expected: 'Text with &amp; ampersand'
        }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(sanitizeHtml(input)).toBe(expected);
      });
    });

    test('should sanitize JavaScript in URLs', () => {
      const dangerousUrls = [
        'javascript:alert("xss")',
        'JAVASCRIPT:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'vbscript:msgbox("xss")',
        'javascript%3Aalert("xss")'
      ];

      dangerousUrls.forEach(url => {
        expect(sanitizeUrl(url)).not.toContain('javascript:');
        expect(sanitizeUrl(url)).not.toContain('vbscript:');
        expect(sanitizeUrl(url)).not.toContain('<script>');
      });
    });

    test('should preserve safe URLs', () => {
      const safeUrls = [
        'https://example.com',
        'http://example.com',
        'chrome-extension://id/page.html',
        '/relative/path.html',
        '#anchor',
        'mailto:user@example.com'
      ];

      safeUrls.forEach(url => {
        expect(sanitizeUrl(url)).toBe(url);
      });
    });

    test('should sanitize user notes input', () => {
      const maliciousNotes = [
        '<script>stealData()</script>Notes content',
        'Notes with <iframe src="evil.com"></iframe>',
        'Normal notes\n<script>alert("xss")</script>',
        'Notes with javascript:alert("xss") link'
      ];

      maliciousNotes.forEach(notes => {
        const sanitized = sanitizeUserNotes(notes);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('<iframe>');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized.length).toBeGreaterThan(0); // Should preserve content
      });
    });

    test('should validate and sanitize specialist IDs', () => {
      const validIds = [
        'software-engineer',
        'data-scientist',
        'ui-ux-designer',
        'project-manager-123',
        'specialist_id_with_underscores'
      ];

      const invalidIds = [
        '../../../admin',
        '<script>alert("xss")</script>',
        'id with spaces',
        'id/with/slashes',
        '',
        null,
        undefined
      ];

      validIds.forEach(id => {
        expect(validateSpecialistId(id)).toBe(true);
        expect(sanitizeSpecialistId(id)).toBe(id);
      });

      invalidIds.forEach(id => {
        expect(validateSpecialistId(id)).toBe(false);
        if (id) {
          const sanitized = sanitizeSpecialistId(id);
          expect(sanitized).toMatch(/^[a-zA-Z0-9_-]*$/); // Only safe characters
        }
      });
    });
  });

  describe('XSS Prevention', () => {
    test('should prevent XSS in message responses', () => {
      securityTestPayloads.xssPayloads.forEach(payload => {
        const message = { action: 'generateResponse', message: payload };
        const sanitized = sanitizeMessage(message);
        
        expect(sanitized.message).not.toContain('<script>');
        expect(sanitized.message).not.toContain('javascript:');
        expect(sanitized.message).not.toContain('onerror=');
        expect(sanitized.message).not.toContain('onload=');
      });
    });

    test('should prevent XSS in custom rules', () => {
      const maliciousRules = [
        '<script>steal_data()</script>Rule content',
        '<img src=x onerror=alert("xss")>Rule',
        'javascript:alert("xss")'
      ];

      maliciousRules.forEach(rule => {
        const sanitized = sanitizeCustomRule(rule);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror=');
      });
    });

    test('should prevent XSS in specialist names and descriptions', () => {
      const maliciousSpecialist = {
        id: 'test-specialist',
        name: '<script>alert("xss")</script>Evil Specialist',
        description: '<img src=x onerror=alert("xss")>Description',
        icon: '🤖'
      };

      const sanitized = sanitizeSpecialist(maliciousSpecialist);
      expect(sanitized.name).not.toContain('<script>');
      expect(sanitized.description).not.toContain('<img');
      expect(sanitized.description).not.toContain('onerror=');
    });
  });

  describe('Content Security Policy Compliance', () => {
    test('should reject inline scripts in generated content', () => {
      const contentWithInlineScripts = [
        '<div onclick="alert(\'xss\')">Click me</div>',
        '<button onmouseover="stealData()">Hover</button>',
        '<img src="x" onerror="maliciousCode()">',
        '<svg onload="executePayload()"></svg>'
      ];

      contentWithInlineScripts.forEach(content => {
        const sanitized = sanitizeGeneratedContent(content);
        expect(sanitized).not.toMatch(/on\w+\s*=/i); // No inline event handlers
        expect(sanitized).not.toContain('javascript:');
      });
    });

    test('should allow safe HTML elements in responses', () => {
      const safeContent = [
        '<strong>Bold text</strong>',
        '<em>Italic text</em>',
        '<ul><li>List item</li></ul>',
        '<br>',
        '<p>Paragraph</p>',
        '<code>code block</code>'
      ];

      safeContent.forEach(content => {
        const sanitized = sanitizeGeneratedContent(content);
        expect(sanitized).toBe(content); // Should remain unchanged
      });
    });

    test('should remove dangerous HTML elements', () => {
      const dangerousContent = [
        '<iframe src="evil.com"></iframe>',
        '<object data="evil.swf"></object>',
        '<embed src="evil.swf">',
        '<form action="evil.com"><input type="hidden"></form>',
        '<link rel="stylesheet" href="evil.css">',
        '<style>body { background: url("evil.com/track.gif"); }</style>'
      ];

      dangerousContent.forEach(content => {
        const sanitized = sanitizeGeneratedContent(content);
        expect(sanitized).not.toContain('<iframe');
        expect(sanitized).not.toContain('<object');
        expect(sanitized).not.toContain('<embed');
        expect(sanitized).not.toContain('<form');
        expect(sanitized).not.toContain('<link');
        expect(sanitized).not.toContain('<style');
      });
    });
  });

  describe('Message Rate Limiting', () => {
    test('should implement rate limiting for message processing', () => {
      const rateLimiter = createRateLimiter(5, 1000); // 5 requests per second
      
      // Should allow first 5 messages
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.checkLimit('test-sender')).toBe(true);
      }
      
      // Should block 6th message
      expect(rateLimiter.checkLimit('test-sender')).toBe(false);
    });

    test('should reset rate limits after time window', async () => {
      const rateLimiter = createRateLimiter(2, 100); // 2 requests per 100ms
      
      // Exhaust rate limit
      expect(rateLimiter.checkLimit('test-sender')).toBe(true);
      expect(rateLimiter.checkLimit('test-sender')).toBe(true);
      expect(rateLimiter.checkLimit('test-sender')).toBe(false);
      
      // Wait for reset
      await global.testUtils.waitFor(150);
      
      // Should allow messages again
      expect(rateLimiter.checkLimit('test-sender')).toBe(true);
    });

    test('should maintain separate rate limits per sender', () => {
      const rateLimiter = createRateLimiter(2, 1000);
      
      // Sender 1 exhausts limit
      expect(rateLimiter.checkLimit('sender1')).toBe(true);
      expect(rateLimiter.checkLimit('sender1')).toBe(true);
      expect(rateLimiter.checkLimit('sender1')).toBe(false);
      
      // Sender 2 should still have limit available
      expect(rateLimiter.checkLimit('sender2')).toBe(true);
      expect(rateLimiter.checkLimit('sender2')).toBe(true);
      expect(rateLimiter.checkLimit('sender2')).toBe(false);
    });
  });

  describe('Error Message Security', () => {
    test('should not leak sensitive information in error messages', () => {
      const sensitiveErrors = [
        new Error('Database connection failed: password123'),
        new Error('API key invalid: sk-1234567890abcdef'),
        new Error('File not found: /etc/passwd'),
        new Error('SQL query failed: SELECT * FROM users WHERE password = "secret"')
      ];

      sensitiveErrors.forEach(error => {
        const sanitizedError = sanitizeErrorMessage(error);
        expect(sanitizedError).not.toContain('password123');
        expect(sanitizedError).not.toContain('sk-1234567890abcdef');
        expect(sanitizedError).not.toContain('/etc/passwd');
        expect(sanitizedError).not.toContain('password = "secret"');
        expect(sanitizedError).toContain('An error occurred');
      });
    });

    test('should provide generic error messages to prevent information disclosure', () => {
      const internalErrors = [
        'Connection refused to internal service at 192.168.1.100:3306',
        'Authentication failed for user admin',
        'Permission denied accessing /admin/config.json'
      ];

      internalErrors.forEach(errorMsg => {
        const sanitized = sanitizeErrorMessage(new Error(errorMsg));
        expect(sanitized).toBe('An error occurred while processing your request');
      });
    });
  });
});

// Utility functions for testing (these would normally be in the actual extension code)
function validateMessage(message) {
  return message && 
         typeof message === 'object' && 
         typeof message.action === 'string' && 
         message.action.length > 0;
}

function validateMessageAction(action) {
  const validActions = [
    'getSpecialists', 'getModels', 'getUserPreferences', 'getSpecialistDetails',
    'getModelDetails', 'saveUserPreferences', 'saveUserNotes', 'saveCustomRules',
    'generateResponse', 'toggleInterface', 'ping'
  ];
  return validActions.includes(action);
}

function validateMessagePayload(message) {
  switch (message.action) {
    case 'getSpecialistDetails':
      return typeof message.specialistId === 'string' && message.specialistId.length > 0;
    case 'saveUserNotes':
      return typeof message.specialistId === 'string' && 
             message.specialistId.length > 0 &&
             typeof message.notes === 'string';
    case 'generateResponse':
      return typeof message.specialistId === 'string' && 
             message.specialistId.length > 0 &&
             typeof message.modelId === 'string' && 
             message.modelId.length > 0 &&
             typeof message.message === 'string' && 
             message.message.length > 0;
    default:
      return true;
  }
}

function sanitizeHtml(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizeUrl(url) {
  if (typeof url !== 'string') return '';
  const lower = url.toLowerCase();
  if (lower.startsWith('javascript:') || 
      lower.startsWith('vbscript:') || 
      lower.includes('<script>')) {
    return '#'; // Safe fallback
  }
  return url;
}

function sanitizeUserNotes(notes) {
  if (typeof notes !== 'string') return '';
  return sanitizeHtml(notes);
}

function validateSpecialistId(id) {
  return typeof id === 'string' && 
         id.length > 0 && 
         /^[a-zA-Z0-9_-]+$/.test(id);
}

function sanitizeSpecialistId(id) {
  if (typeof id !== 'string') return '';
  return id.replace(/[^a-zA-Z0-9_-]/g, '');
}

function sanitizeMessage(message) {
  const sanitized = { ...message };
  if (sanitized.message) {
    sanitized.message = sanitizeHtml(sanitized.message);
  }
  return sanitized;
}

function sanitizeCustomRule(rule) {
  return sanitizeHtml(rule);
}

function sanitizeSpecialist(specialist) {
  return {
    ...specialist,
    name: sanitizeHtml(specialist.name),
    description: sanitizeHtml(specialist.description)
  };
}

function sanitizeGeneratedContent(content) {
  if (typeof content !== 'string') return '';
  
  // Remove dangerous elements
  let sanitized = content
    .replace(/<(script|iframe|object|embed|form|link|style)[^>]*>.*?<\/\1>/gis, '')
    .replace(/<(script|iframe|object|embed|form|link|style)[^>]*>/gi, '');
  
  // Remove inline event handlers
  sanitized = sanitized.replace(/\son\w+\s*=\s*[^>\s]+/gi, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  return sanitized;
}

function createRateLimiter(maxRequests, windowMs) {
  const requests = new Map();
  
  return {
    checkLimit(senderId) {
      const now = Date.now();
      const windowStart = now - windowMs;
      
      if (!requests.has(senderId)) {
        requests.set(senderId, []);
      }
      
      const senderRequests = requests.get(senderId);
      
      // Remove old requests outside window
      while (senderRequests.length > 0 && senderRequests[0] < windowStart) {
        senderRequests.shift();
      }
      
      if (senderRequests.length >= maxRequests) {
        return false;
      }
      
      senderRequests.push(now);
      return true;
    }
  };
}

function sanitizeErrorMessage(error) {
  // In production, return generic error messages to prevent information disclosure
  if (process.env.NODE_ENV === 'production') {
    return 'An error occurred while processing your request';
  }
  
  // In development, provide more details but still sanitize
  const message = error.message || 'Unknown error';
  const sensitivePatterns = [
    /password[:\s]*[^\s]+/gi,
    /api[_\s]*key[:\s]*[^\s]+/gi,
    /secret[:\s]*[^\s]+/gi,
    /token[:\s]*[^\s]+/gi,
    /\/etc\/[^\s]*/gi,
    /192\.168\.[0-9]+\.[0-9]+/g
  ];
  
  let sanitized = message;
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  return sanitized;
}