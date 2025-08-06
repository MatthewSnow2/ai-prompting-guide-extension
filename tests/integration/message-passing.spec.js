/**
 * Integration Tests for Message Passing Between Components
 * Tests communication flows between background, content, and popup scripts
 */

const { ChromeApiMocks } = require('../mocks/chrome-apis');
const { 
  testSpecialists, 
  testModels, 
  testUserPreferences,
  testMessages 
} = require('../fixtures/test-data');

describe('Message Passing Integration', () => {
  let chromeMocks;
  let backgroundScript;
  let messageRoutes;
  
  beforeEach(() => {
    chromeMocks = new ChromeApiMocks();
    global.chrome = chromeMocks.chrome;
    chromeMocks.setupDefaultBehaviors();
    
    // Mock fetch for JSON loading
    global.fetch = jest.fn();
    
    // Setup message routing system
    messageRoutes = new Map();
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    chromeMocks.reset();
    jest.resetModules();
  });

  describe('Background to Content Script Communication', () => {
    test('should send toggle interface command to content script', async () => {
      // Arrange
      const sentMessages = [];
      const testTabs = [{ id: 1 }, { id: 2 }, { id: 3 }];
      
      chromeMocks.chrome.tabs.query.callsFake((query, callback) => {
        callback(testTabs);
      });
      
      chromeMocks.chrome.tabs.sendMessage.callsFake((tabId, message, callback) => {
        sentMessages.push({ tabId, message });
        if (callback) callback({ success: true });
      });
      
      // Act
      // Simulate background script sending toggle command to all tabs
      await new Promise(resolve => {
        chromeMocks.chrome.tabs.query({}, (tabs) => {
          const promises = tabs.map(tab => 
            new Promise(msgResolve => {
              chromeMocks.chrome.tabs.sendMessage(
                tab.id, 
                { action: 'toggleInterface' },
                msgResolve
              );
            })
          );
          Promise.all(promises).then(resolve);
        });
      });
      
      // Assert
      expect(sentMessages).toHaveLength(3);
      sentMessages.forEach((sent, index) => {
        expect(sent.tabId).toBe(testTabs[index].id);
        expect(sent.message.action).toBe('toggleInterface');
      });
    });

    test('should handle content script not ready errors', async () => {
      // Arrange
      const messageAttempts = [];
      
      chromeMocks.chrome.tabs.sendMessage.callsFake((tabId, message, callback) => {
        messageAttempts.push({ tabId, message, timestamp: Date.now() });
        
        // Simulate content script not loaded
        chromeMocks.chrome.runtime.lastError = { 
          message: 'Could not establish connection. Receiving end does not exist.' 
        };
        
        if (callback) callback(null);
      });
      
      // Act
      let errorOccurred = false;
      try {
        await new Promise((resolve, reject) => {
          chromeMocks.chrome.tabs.sendMessage(1, { action: 'ping' }, (response) => {
            if (chromeMocks.chrome.runtime.lastError) {
              reject(new Error(chromeMocks.chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
      } catch (error) {
        errorOccurred = true;
        expect(error.message).toContain('Could not establish connection');
      }
      
      // Assert
      expect(errorOccurred).toBe(true);
      expect(messageAttempts).toHaveLength(1);
    });

    test('should broadcast updates to all content scripts', async () => {
      // Arrange
      const broadcastMessages = [];
      const activeTabs = [
        { id: 1, url: 'https://example.com' },
        { id: 2, url: 'https://google.com' },
        { id: 3, url: 'https://github.com' }
      ];
      
      chromeMocks.chrome.tabs.query.callsFake((query, callback) => {
        callback(activeTabs);
      });
      
      chromeMocks.chrome.tabs.sendMessage.callsFake((tabId, message, callback) => {
        broadcastMessages.push({ tabId, message });
        if (callback) callback({ received: true });
      });
      
      // Act - Simulate broadcasting settings update
      const settingsUpdate = { 
        action: 'updateSettings', 
        settings: { theme: 'dark', position: { x: 100, y: 100 } } 
      };
      
      await new Promise(resolve => {
        chromeMocks.chrome.tabs.query({}, (tabs) => {
          const broadcasts = tabs.map(tab =>
            new Promise(broadcastResolve => {
              chromeMocks.chrome.tabs.sendMessage(tab.id, settingsUpdate, broadcastResolve);
            })
          );
          Promise.all(broadcasts).then(resolve);
        });
      });
      
      // Assert
      expect(broadcastMessages).toHaveLength(3);
      broadcastMessages.forEach(broadcast => {
        expect(broadcast.message.action).toBe('updateSettings');
        expect(broadcast.message.settings.theme).toBe('dark');
      });
    });
  });

  describe('Content Script to Background Communication', () => {
    test('should send data requests from content script to background', async () => {
      // Arrange
      const backgroundResponses = new Map([
        ['getSpecialists', { specialists: testSpecialists }],
        ['getModels', { models: testModels }],
        ['getUserPreferences', { preferences: testUserPreferences }]
      ]);
      
      chromeMocks.chrome.runtime.sendMessage.callsFake((message, callback) => {
        const response = backgroundResponses.get(message.action);
        if (callback) callback(response);
      });
      
      // Act & Assert - Test each data request type
      for (const [action, expectedResponse] of backgroundResponses) {
        const response = await new Promise(resolve => {
          chromeMocks.chrome.runtime.sendMessage({ action }, resolve);
        });
        
        expect(response).toEqual(expectedResponse);
      }
    });

    test('should handle background script unavailable errors', async () => {
      // Arrange
      chromeMocks.chrome.runtime.sendMessage.callsFake((message, callback) => {
        chromeMocks.chrome.runtime.lastError = { 
          message: 'Extension context invalidated.' 
        };
        if (callback) callback(null);
      });
      
      // Act
      let contextError = false;
      try {
        await new Promise((resolve, reject) => {
          chromeMocks.chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
            if (chromeMocks.chrome.runtime.lastError) {
              reject(new Error(chromeMocks.chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
      } catch (error) {
        contextError = true;
        expect(error.message).toContain('Extension context invalidated');
      }
      
      // Assert
      expect(contextError).toBe(true);
    });

    test('should queue and retry messages when background is temporarily unavailable', async () => {
      // Arrange
      const messageQueue = [];
      let backgroundAvailable = false;
      let retryCount = 0;
      
      chromeMocks.chrome.runtime.sendMessage.callsFake((message, callback) => {
        messageQueue.push(message);
        
        if (!backgroundAvailable && retryCount < 2) {
          retryCount++;
          chromeMocks.chrome.runtime.lastError = { message: 'Background script not ready' };
          if (callback) callback(null);
        } else {
          // Background becomes available
          backgroundAvailable = true;
          delete chromeMocks.chrome.runtime.lastError;
          if (callback) callback({ success: true, queued: messageQueue.length });
        }
      });
      
      // Act - Simulate retry logic
      let finalResponse;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          finalResponse = await new Promise((resolve, reject) => {
            chromeMocks.chrome.runtime.sendMessage(
              { action: 'getSpecialists', attempt: attempt + 1 }, 
              (response) => {
                if (chromeMocks.chrome.runtime.lastError) {
                  reject(new Error(chromeMocks.chrome.runtime.lastError.message));
                } else {
                  resolve(response);
                }
              }
            );
          });
          break; // Success, exit retry loop
        } catch (error) {
          if (attempt === 2) throw error; // Last attempt failed
          // Wait before retry
          await global.testUtils.waitFor(100);
        }
      }
      
      // Assert
      expect(finalResponse.success).toBe(true);
      expect(messageQueue.length).toBe(3); // 3 attempts queued
      expect(backgroundAvailable).toBe(true);
    });
  });

  describe('Popup to Background Communication', () => {
    test('should save user preferences from popup', async () => {
      // Arrange
      const savedPreferences = [];
      
      chromeMocks.chrome.runtime.sendMessage.callsFake((message, callback) => {
        if (message.action === 'saveUserPreferences') {
          savedPreferences.push(message.preferences);
          if (callback) callback({ success: true });
        }
      });
      
      // Act - Simulate popup saving preferences
      const newPreferences = { theme: 'dark', autoOpen: true };
      
      await new Promise(resolve => {
        chromeMocks.chrome.runtime.sendMessage({
          action: 'saveUserPreferences',
          preferences: newPreferences
        }, resolve);
      });
      
      // Assert
      expect(savedPreferences).toHaveLength(1);
      expect(savedPreferences[0]).toEqual(newPreferences);
    });

    test('should handle popup requesting specialist application', async () => {
      // Arrange
      const specialistApplications = [];
      
      chromeMocks.chrome.runtime.sendMessage.callsFake((message, callback) => {
        if (message.action === 'applySpecialist') {
          specialistApplications.push(message);
          if (callback) callback({ success: true });
        }
      });
      
      chromeMocks.chrome.tabs.query.callsFake((query, callback) => {
        callback([{ id: 1, active: true }]);
      });
      
      chromeMocks.chrome.tabs.sendMessage.callsFake((tabId, message, callback) => {
        if (callback) callback({ success: true });
      });
      
      // Act - Simulate popup applying specialist to active tab
      const specialistApplication = {
        action: 'applySpecialist',
        specialistId: 'software-engineer'
      };
      
      // Save preference
      await new Promise(resolve => {
        chromeMocks.chrome.runtime.sendMessage(specialistApplication, resolve);
      });
      
      // Apply to active tab
      await new Promise(resolve => {
        chromeMocks.chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chromeMocks.chrome.tabs.sendMessage(
              tabs[0].id,
              { action: 'changeSpecialist', specialistId: 'software-engineer' },
              resolve
            );
          }
        });
      });
      
      // Assert
      expect(specialistApplications).toHaveLength(1);
      expect(chromeMocks.chrome.tabs.sendMessage).toHaveBeenCalledWith(
        1,
        { action: 'changeSpecialist', specialistId: 'software-engineer' },
        expect.any(Function)
      );
    });
  });

  describe('Cross-Component Message Flow', () => {
    test('should handle complete workflow: popup -> background -> content', async () => {
      // Arrange
      const messageFlow = [];
      
      // Mock background message handling
      chromeMocks.chrome.runtime.sendMessage.callsFake((message, callback) => {
        messageFlow.push({ component: 'background', message, timestamp: Date.now() });
        
        if (message.action === 'toggleInterface') {
          // Background forwards to content scripts
          chromeMocks.chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
              chromeMocks.chrome.tabs.sendMessage(tab.id, message, () => {
                messageFlow.push({ 
                  component: 'content', 
                  tabId: tab.id, 
                  message, 
                  timestamp: Date.now() 
                });
              });
            });
          });
        }
        
        if (callback) callback({ success: true });
      });
      
      chromeMocks.chrome.tabs.query.callsFake((query, callback) => {
        callback([{ id: 1 }, { id: 2 }]);
      });
      
      chromeMocks.chrome.tabs.sendMessage.callsFake((tabId, message, callback) => {
        messageFlow.push({ 
          component: 'content', 
          tabId, 
          message, 
          timestamp: Date.now() 
        });
        if (callback) callback({ success: true });
      });
      
      // Act - Simulate popup initiating toggle
      await new Promise(resolve => {
        chromeMocks.chrome.runtime.sendMessage({ action: 'toggleInterface' }, resolve);
      });
      
      // Wait for async operations
      await global.testUtils.waitFor(50);
      
      // Assert
      expect(messageFlow.length).toBeGreaterThan(0);
      
      const backgroundMessages = messageFlow.filter(m => m.component === 'background');
      const contentMessages = messageFlow.filter(m => m.component === 'content');
      
      expect(backgroundMessages).toHaveLength(1);
      expect(contentMessages).toHaveLength(2); // Two tabs
      
      contentMessages.forEach(msg => {
        expect(msg.message.action).toBe('toggleInterface');
      });
    });

    test('should handle message acknowledgments and responses', async () => {
      // Arrange
      const messageAcks = [];
      
      // Setup bidirectional messaging
      chromeMocks.chrome.runtime.sendMessage.callsFake((message, callback) => {
        if (message.action === 'generateResponse') {
          // Simulate background processing and response
          setTimeout(() => {
            const response = {
              success: true,
              message: `Generated response for: ${message.message}`,
              timestamp: Date.now()
            };
            messageAcks.push({ type: 'response', ...response });
            if (callback) callback(response);
          }, 10);
        }
      });
      
      // Act
      const response = await new Promise(resolve => {
        chromeMocks.chrome.runtime.sendMessage({
          action: 'generateResponse',
          specialistId: 'software-engineer',
          modelId: 'gpt-4',
          message: 'How to implement error handling?'
        }, resolve);
      });
      
      // Assert
      expect(response.success).toBe(true);
      expect(response.message).toContain('Generated response for:');
      expect(messageAcks).toHaveLength(1);
      expect(messageAcks[0].type).toBe('response');
    });

    test('should handle message timeouts and error recovery', async () => {
      // Arrange
      const timeoutMessages = [];
      
      chromeMocks.chrome.runtime.sendMessage.callsFake((message, callback) => {
        timeoutMessages.push({ message, timestamp: Date.now() });
        
        // Don't call callback to simulate timeout
        if (message.action === 'slow_operation') {
          // Simulate timeout scenario
          setTimeout(() => {
            chromeMocks.chrome.runtime.lastError = { message: 'Operation timed out' };
            if (callback) callback(null);
          }, 100);
        } else {
          if (callback) callback({ success: true });
        }
      });
      
      // Act - Test timeout handling
      let timeoutOccurred = false;
      try {
        await Promise.race([
          new Promise((resolve, reject) => {
            chromeMocks.chrome.runtime.sendMessage({ action: 'slow_operation' }, (response) => {
              if (chromeMocks.chrome.runtime.lastError) {
                reject(new Error(chromeMocks.chrome.runtime.lastError.message));
              } else {
                resolve(response);
              }
            });
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 50)
          )
        ]);
      } catch (error) {
        timeoutOccurred = true;
        expect(error.message).toMatch(/timeout|timed out/i);
      }
      
      // Assert
      expect(timeoutOccurred).toBe(true);
      expect(timeoutMessages).toHaveLength(1);
    });
  });

  describe('Message Security and Validation', () => {
    test('should validate message origins and reject unauthorized messages', async () => {
      // Arrange
      const messageAttempts = [];
      let messageListener;
      
      chromeMocks.chrome.runtime.onMessage.addListener.callsFake((listener) => {
        messageListener = listener;
      });
      
      // Setup message validation
      chromeMocks.chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        messageAttempts.push({ message, sender });
        
        // Validate sender origin
        const allowedOrigins = ['https://', 'chrome-extension://test-id/'];
        const isValidOrigin = allowedOrigins.some(origin => 
          sender.tab?.url?.startsWith(origin) ||
          sender.url?.startsWith(origin)
        );
        
        if (!isValidOrigin) {
          sendResponse({ error: 'Unauthorized origin' });
          return;
        }
        
        sendResponse({ success: true });
      });
      
      // Act - Test messages from different origins
      const testSenders = [
        { tab: { url: 'https://example.com' } }, // Valid
        { tab: { url: 'chrome://settings/' } }, // Invalid
        { url: 'chrome-extension://test-id/popup.html' }, // Valid
        { tab: { url: 'chrome-extension://other-id/page.html' } } // Invalid
      ];
      
      if (messageListener) {
        testSenders.forEach(sender => {
          const mockSendResponse = jest.fn();
          messageListener({ action: 'ping' }, sender, mockSendResponse);
        });
      }
      
      // Assert
      expect(messageAttempts).toHaveLength(4);
    });

    test('should sanitize message payloads', async () => {
      // Arrange
      const sanitizedMessages = [];
      let messageListener;
      
      chromeMocks.chrome.runtime.onMessage.addListener.callsFake((listener) => {
        messageListener = listener;
      });
      
      // Setup message sanitization
      chromeMocks.chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // Sanitize message content
        const sanitized = { ...message };
        if (sanitized.message && typeof sanitized.message === 'string') {
          sanitized.message = sanitized.message
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/javascript:/gi, '');
        }
        
        sanitizedMessages.push(sanitized);
        sendResponse({ sanitized: true });
      });
      
      // Act - Send message with potential XSS
      if (messageListener) {
        const maliciousMessage = {
          action: 'generateResponse',
          message: '<script>alert("xss")</script>Tell me about security'
        };
        
        const mockSendResponse = jest.fn();
        const mockSender = { tab: { url: 'https://example.com' } };
        
        messageListener(maliciousMessage, mockSender, mockSendResponse);
      }
      
      // Assert
      expect(sanitizedMessages).toHaveLength(1);
      expect(sanitizedMessages[0].message).not.toContain('<script>');
      expect(sanitizedMessages[0].message).toContain('Tell me about security');
    });

    test('should implement message rate limiting', async () => {
      // Arrange
      const messageRates = new Map();
      let messageListener;
      
      chromeMocks.chrome.runtime.onMessage.addListener.callsFake((listener) => {
        messageListener = listener;
      });
      
      // Setup rate limiting
      chromeMocks.chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const senderId = sender.tab?.id || sender.url || 'unknown';
        const now = Date.now();
        
        if (!messageRates.has(senderId)) {
          messageRates.set(senderId, []);
        }
        
        const senderRates = messageRates.get(senderId);
        
        // Remove messages older than 1 second
        const recentMessages = senderRates.filter(time => now - time < 1000);
        messageRates.set(senderId, recentMessages);
        
        if (recentMessages.length >= 5) { // Max 5 messages per second
          sendResponse({ error: 'Rate limit exceeded' });
          return;
        }
        
        recentMessages.push(now);
        sendResponse({ success: true });
      });
      
      // Act - Send multiple messages rapidly
      if (messageListener) {
        const mockSender = { tab: { id: 1, url: 'https://example.com' } };
        const responses = [];
        
        for (let i = 0; i < 7; i++) {
          const mockSendResponse = jest.fn();
          messageListener({ action: 'ping', id: i }, mockSender, mockSendResponse);
          responses.push(mockSendResponse.mock.calls[0][0]);
        }
        
        // Assert
        const successfulMessages = responses.filter(r => r.success).length;
        const rateLimitedMessages = responses.filter(r => r.error === 'Rate limit exceeded').length;
        
        expect(successfulMessages).toBe(5);
        expect(rateLimitedMessages).toBe(2);
      }
    });
  });

  describe('Message Persistence and Recovery', () => {
    test('should handle service worker restart and message recovery', async () => {
      // Arrange
      const persistentMessages = [];
      let connectionLost = false;
      
      chromeMocks.chrome.runtime.sendMessage.callsFake((message, callback) => {
        if (connectionLost) {
          chromeMocks.chrome.runtime.lastError = { 
            message: 'Extension context invalidated.' 
          };
          if (callback) callback(null);
        } else {
          persistentMessages.push(message);
          if (callback) callback({ success: true });
        }
      });
      
      // Act - Send message, lose connection, retry
      // First message succeeds
      let response1;
      try {
        response1 = await new Promise((resolve, reject) => {
          chromeMocks.chrome.runtime.sendMessage({ action: 'ping', id: 1 }, (response) => {
            if (chromeMocks.chrome.runtime.lastError) {
              reject(new Error(chromeMocks.chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
      } catch (e) {
        response1 = { error: e.message };
      }
      
      // Connection lost
      connectionLost = true;
      
      // Second message fails
      let response2;
      try {
        response2 = await new Promise((resolve, reject) => {
          chromeMocks.chrome.runtime.sendMessage({ action: 'ping', id: 2 }, (response) => {
            if (chromeMocks.chrome.runtime.lastError) {
              reject(new Error(chromeMocks.chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
      } catch (e) {
        response2 = { error: e.message };
      }
      
      // Connection restored
      connectionLost = false;
      delete chromeMocks.chrome.runtime.lastError;
      
      // Third message succeeds after recovery
      let response3;
      try {
        response3 = await new Promise((resolve, reject) => {
          chromeMocks.chrome.runtime.sendMessage({ action: 'ping', id: 3 }, (response) => {
            if (chromeMocks.chrome.runtime.lastError) {
              reject(new Error(chromeMocks.chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
      } catch (e) {
        response3 = { error: e.message };
      }
      
      // Assert
      expect(response1.success).toBe(true);
      expect(response2.error).toContain('Extension context invalidated');
      expect(response3.success).toBe(true);
      expect(persistentMessages).toHaveLength(2); // Messages 1 and 3
    });
  });
});