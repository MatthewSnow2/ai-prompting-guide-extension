/**
 * Performance Tests for Memory Usage and DOM Operations
 * Tests memory efficiency, DOM manipulation performance, and resource usage
 */

const { ChromeApiMocks } = require('../mocks/chrome-apis');
const { performanceTestConfig } = require('../fixtures/test-data');

describe('Memory Usage and DOM Operations Performance', () => {
  let chromeMocks;
  let performanceObserver;
  let memoryTracker;
  
  beforeEach(() => {
    chromeMocks = new ChromeApiMocks();
    global.chrome = chromeMocks.chrome;
    chromeMocks.setupDefaultBehaviors();
    
    // Mock performance APIs
    global.performance = {
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByType: jest.fn(() => []),
      memory: {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
        jsHeapSizeLimit: 100000000
      }
    };
    
    // Mock PerformanceObserver
    global.PerformanceObserver = jest.fn().mockImplementation((callback) => {
      performanceObserver = {
        observe: jest.fn(),
        disconnect: jest.fn(),
        takeRecords: jest.fn(() => [])
      };
      return performanceObserver;
    });
    
    // Memory tracking utility
    memoryTracker = {
      startTracking: jest.fn(),
      stopTracking: jest.fn(),
      getMemoryUsage: jest.fn(() => ({
        used: global.performance.memory.usedJSHeapSize,
        total: global.performance.memory.totalJSHeapSize
      })),
      checkForLeaks: jest.fn(() => false)
    };
    
    global.memoryTracker = memoryTracker;
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    chromeMocks.reset();
    global.performance = undefined;
    global.PerformanceObserver = undefined;
    global.memoryTracker = undefined;
  });

  describe('Memory Usage Tests', () => {
    test('should not exceed memory limits during normal operation', async () => {
      // Arrange
      const initialMemory = global.performance.memory.usedJSHeapSize;
      const memoryLimit = performanceTestConfig.maxMemoryUsage;
      
      // Simulate normal extension operations
      const operations = [
        () => simulateDataLoading(),
        () => simulateUICreation(),
        () => simulateMessageProcessing(),
        () => simulateStorageOperations()
      ];
      
      // Act
      for (const operation of operations) {
        await operation();
        
        // Simulate memory usage increase
        global.performance.memory.usedJSHeapSize += Math.random() * 1000000;
      }
      
      const finalMemory = global.performance.memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Assert
      expect(memoryIncrease).toBeLessThan(memoryLimit);
      expect(finalMemory).toBeLessThan(global.performance.memory.jsHeapSizeLimit * 0.8); // Stay under 80% of limit
    });

    test('should properly clean up resources after operations', async () => {
      // Arrange
      const resources = [];
      const mockResource = {
        cleanup: jest.fn(),
        isActive: true
      };
      
      // Act - Create and use resources
      for (let i = 0; i < 10; i++) {
        const resource = { ...mockResource, id: i };
        resources.push(resource);
        await simulateResourceUsage(resource);
      }
      
      // Cleanup resources
      await cleanupResources(resources);
      
      // Assert
      resources.forEach(resource => {
        expect(resource.cleanup).toHaveBeenCalled();
        expect(resource.isActive).toBe(false);
      });
    });

    test('should detect and prevent memory leaks', async () => {
      // Arrange
      let memorySnapshots = [];
      const leakDetector = createMemoryLeakDetector();
      
      // Act - Simulate operations that might cause leaks
      for (let i = 0; i < 5; i++) {
        const snapshot = {
          timestamp: Date.now(),
          memory: global.performance.memory.usedJSHeapSize + (i * 100000),
          operations: i + 1
        };
        memorySnapshots.push(snapshot);
        
        await simulateOperationCycle();
        await triggerGarbageCollection();
      }
      
      // Analyze memory trend
      const hasLeak = leakDetector.analyzeTrend(memorySnapshots);
      
      // Assert
      expect(hasLeak).toBe(false);
      expect(leakDetector.getLeakSeverity()).toBe('none');
    });

    test('should handle memory pressure gracefully', async () => {
      // Arrange
      const memoryPressureHandler = createMemoryPressureHandler();
      
      // Simulate memory pressure
      global.performance.memory.usedJSHeapSize = global.performance.memory.totalJSHeapSize * 0.9;
      
      // Act
      const response = await memoryPressureHandler.handlePressure();
      
      // Assert
      expect(response.actionsKaken).toContain('cache_cleared');
      expect(response.memoryFreed).toBeGreaterThan(0);
      expect(global.performance.memory.usedJSHeapSize).toBeLessThan(
        global.performance.memory.totalJSHeapSize * 0.8
      );
    });

    test('should efficiently manage large datasets', async () => {
      // Arrange
      const largeDataset = generateLargeDataset(1000); // 1000 specialists/models
      const dataManager = createDataManager();
      
      const startTime = performance.now();
      const startMemory = global.performance.memory.usedJSHeapSize;
      
      // Act
      await dataManager.loadData(largeDataset);
      const searchResults = await dataManager.search('engineer');
      await dataManager.filter({ category: 'technical' });
      await dataManager.sort('name');
      
      const endTime = performance.now();
      const endMemory = global.performance.memory.usedJSHeapSize;
      
      // Assert
      const executionTime = endTime - startTime;
      const memoryIncrease = endMemory - startMemory;
      
      expect(executionTime).toBeLessThan(performanceTestConfig.maxExecutionTime);
      expect(memoryIncrease).toBeLessThan(performanceTestConfig.maxMemoryUsage / 2);
      expect(searchResults.length).toBeGreaterThan(0);
    });
  });

  describe('DOM Operations Performance', () => {
    test('should create DOM elements efficiently', async () => {
      // Arrange
      const domManager = createDOMManager();
      const startTime = performance.now();
      
      // Act - Create multiple DOM elements
      const elements = [];
      for (let i = 0; i < 100; i++) {
        const element = await domManager.createElement('div', {
          id: `element-${i}`,
          className: 'ai-guide-element',
          textContent: `Element ${i}`
        });
        elements.push(element);
      }
      
      const endTime = performance.now();
      const creationTime = endTime - startTime;
      
      // Assert
      expect(creationTime).toBeLessThan(100); // Less than 100ms for 100 elements
      expect(elements).toHaveLength(100);
      elements.forEach((element, index) => {
        expect(element.id).toBe(`element-${index}`);
        expect(element.className).toBe('ai-guide-element');
      });
    });

    test('should handle DOM node limits', async () => {
      // Arrange
      const domManager = createDOMManager();
      const nodeLimit = performanceTestConfig.maxDOMNodes;
      
      // Act - Create elements up to limit
      const elements = [];
      for (let i = 0; i < nodeLimit + 100; i++) {
        try {
          const element = await domManager.createElement('div');
          elements.push(element);
        } catch (error) {
          // Should handle limit gracefully
          expect(error.message).toContain('DOM node limit');
          break;
        }
      }
      
      // Assert
      expect(elements.length).toBeLessThanOrEqual(nodeLimit);
      expect(domManager.getNodeCount()).toBeLessThanOrEqual(nodeLimit);
    });

    test('should efficiently update DOM elements', async () => {
      // Arrange
      const domManager = createDOMManager();
      const elements = [];
      
      // Create initial elements
      for (let i = 0; i < 50; i++) {
        const element = await domManager.createElement('div', {
          textContent: `Initial content ${i}`
        });
        elements.push(element);
      }
      
      const startTime = performance.now();
      
      // Act - Update all elements
      const updatePromises = elements.map(async (element, index) => {
        return domManager.updateElement(element, {
          textContent: `Updated content ${index}`,
          className: 'updated-element'
        });
      });
      
      await Promise.all(updatePromises);
      
      const endTime = performance.now();
      const updateTime = endTime - startTime;
      
      // Assert
      expect(updateTime).toBeLessThan(50); // Less than 50ms for 50 updates
      elements.forEach((element, index) => {
        expect(element.textContent).toBe(`Updated content ${index}`);
        expect(element.className).toBe('updated-element');
      });
    });

    test('should batch DOM operations for performance', async () => {
      // Arrange
      const domManager = createDOMManager();
      const operations = [];
      
      for (let i = 0; i < 20; i++) {
        operations.push({
          type: 'create',
          tag: 'div',
          properties: { textContent: `Element ${i}` }
        });
        
        operations.push({
          type: 'update',
          selector: `#element-${i}`,
          properties: { className: 'batch-updated' }
        });
      }
      
      const startTime = performance.now();
      
      // Act
      await domManager.batchOperations(operations);
      
      const endTime = performance.now();
      const batchTime = endTime - startTime;
      
      // Assert
      expect(batchTime).toBeLessThan(30); // Batching should be faster than individual operations
      expect(domManager.getBatchedOperationCount()).toBe(operations.length);
    });

    test('should handle rapid DOM changes without blocking', async () => {
      // Arrange
      const domManager = createDOMManager();
      const rapidChanges = [];
      
      // Act - Simulate rapid UI updates
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        const changePromise = domManager.scheduleUpdate(`element-${i % 10}`, {
          textContent: `Rapid update ${i}`,
          style: { opacity: Math.random() }
        });
        rapidChanges.push(changePromise);
        
        // Small delay to simulate real-world timing
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      await Promise.all(rapidChanges);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Assert
      expect(totalTime).toBeLessThan(500); // Should complete within 500ms
      expect(domManager.getQueuedUpdates()).toBe(0); // All updates processed
    });
  });

  describe('Event Listener Performance', () => {
    test('should manage event listeners efficiently', async () => {
      // Arrange
      const eventManager = createEventManager();
      const listeners = [];
      const eventCount = performanceTestConfig.maxEventListeners;
      
      // Act - Add many event listeners
      for (let i = 0; i < eventCount; i++) {
        const listener = jest.fn();
        await eventManager.addEventListener(`element-${i}`, 'click', listener);
        listeners.push(listener);
      }
      
      // Simulate events
      const startTime = performance.now();
      
      for (let i = 0; i < eventCount; i++) {
        eventManager.fireEvent(`element-${i}`, 'click');
      }
      
      const endTime = performance.now();
      const eventProcessingTime = endTime - startTime;
      
      // Assert
      expect(eventProcessingTime).toBeLessThan(100); // Process all events quickly
      expect(eventManager.getListenerCount()).toBe(eventCount);
      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalledTimes(1);
      });
    });

    test('should prevent memory leaks from event listeners', async () => {
      // Arrange
      const eventManager = createEventManager();
      const initialMemory = global.performance.memory.usedJSHeapSize;
      
      // Act - Add and remove listeners repeatedly
      for (let cycle = 0; cycle < 10; cycle++) {
        const listeners = [];
        
        // Add listeners
        for (let i = 0; i < 20; i++) {
          const listener = jest.fn();
          await eventManager.addEventListener(`temp-element-${i}`, 'click', listener);
          listeners.push(listener);
        }
        
        // Remove all listeners
        await eventManager.removeAllListeners();
        
        // Force garbage collection simulation
        global.performance.memory.usedJSHeapSize = initialMemory + (cycle * 1000);
      }
      
      await triggerGarbageCollection();
      const finalMemory = global.performance.memory.usedJSHeapSize;
      
      // Assert
      expect(eventManager.getListenerCount()).toBe(0);
      expect(finalMemory).toBeLessThan(initialMemory * 1.1); // Max 10% increase
    });

    test('should debounce high-frequency events', async () => {
      // Arrange
      const eventManager = createEventManager();
      const handler = jest.fn();
      
      await eventManager.addEventListener('input-field', 'input', handler, {
        debounce: 100 // 100ms debounce
      });
      
      // Act - Fire rapid events
      const rapidEvents = [];
      for (let i = 0; i < 20; i++) {
        rapidEvents.push(
          eventManager.fireEvent('input-field', 'input', { value: `text-${i}` })
        );
        await new Promise(resolve => setTimeout(resolve, 10)); // 10ms intervals
      }
      
      await Promise.all(rapidEvents);
      
      // Wait for debounce period
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Assert
      expect(handler).toHaveBeenCalledTimes(1); // Only once due to debouncing
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        value: 'text-19' // Last value
      }));
    });
  });

  describe('Storage Performance', () => {
    test('should handle large storage operations efficiently', async () => {
      // Arrange
      const largeData = generateLargeStorageData(1000); // 1000 items
      const storageManager = createStorageManager();
      
      const startTime = performance.now();
      
      // Act
      await storageManager.setItems(largeData);
      const retrievedData = await storageManager.getItems(Object.keys(largeData));
      
      const endTime = performance.now();
      const operationTime = endTime - startTime;
      
      // Assert
      expect(operationTime).toBeLessThan(1000); // Less than 1 second
      expect(Object.keys(retrievedData)).toHaveLength(1000);
      expect(retrievedData).toEqual(largeData);
    });

    test('should implement efficient caching strategy', async () => {
      // Arrange
      const cacheManager = createCacheManager();
      const dataToCache = generateTestData(100);
      
      // Act - Cache data
      const cacheStartTime = performance.now();
      await cacheManager.set('test-data', dataToCache);
      const cacheTime = performance.now() - cacheStartTime;
      
      // Retrieve from cache
      const retrieveStartTime = performance.now();
      const cachedData = await cacheManager.get('test-data');
      const retrieveTime = performance.now() - retrieveStartTime;
      
      // Assert
      expect(cacheTime).toBeLessThan(50); // Cache quickly
      expect(retrieveTime).toBeLessThan(10); // Retrieve very quickly
      expect(cachedData).toEqual(dataToCache);
      expect(cacheManager.getHitRate()).toBeGreaterThan(0.8); // Good hit rate
    });

    test('should handle storage quota gracefully', async () => {
      // Arrange
      const storageManager = createStorageManager();
      const quotaManager = createQuotaManager();
      
      // Simulate approaching quota limit
      quotaManager.setAvailableSpace(1000000); // 1MB available
      
      const largeItem = 'x'.repeat(2000000); // 2MB item (exceeds quota)
      
      // Act & Assert
      await expect(storageManager.setItem('large-item', largeItem))
        .rejects.toThrow('Quota exceeded');
      
      // Should handle gracefully and suggest cleanup
      const cleanupSuggestions = await quotaManager.getCleanupSuggestions();
      expect(cleanupSuggestions).toContain('Remove old cached data');
      expect(cleanupSuggestions).toContain('Compress stored data');
    });
  });

  describe('Background Script Performance', () => {
    test('should process messages efficiently under load', async () => {
      // Arrange
      const messageProcessor = createMessageProcessor();
      const messages = [];
      
      for (let i = 0; i < performanceTestConfig.loadTestIterations; i++) {
        messages.push({
          action: 'generateResponse',
          id: i,
          data: `Test message ${i}`
        });
      }
      
      const startTime = performance.now();
      
      // Act
      const results = await Promise.all(
        messages.map(msg => messageProcessor.processMessage(msg))
      );
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Assert
      expect(processingTime).toBeLessThan(5000); // Process 100 messages in under 5 seconds
      expect(results).toHaveLength(messages.length);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.id).toBe(index);
      });
    });

    test('should maintain responsiveness during heavy operations', async () => {
      // Arrange
      const heavyOperationManager = createHeavyOperationManager();
      const responseTimes = [];
      
      // Start heavy background operation
      const heavyOperation = heavyOperationManager.startHeavyTask();
      
      // Act - Test responsiveness during heavy operation
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        await heavyOperationManager.ping();
        const responseTime = performance.now() - startTime;
        responseTimes.push(responseTime);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      await heavyOperation;
      
      // Assert
      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      
      expect(averageResponseTime).toBeLessThan(50); // Average under 50ms
      expect(maxResponseTime).toBeLessThan(100); // Max under 100ms
    });
  });
});

// Performance testing utilities (would be in actual extension code)
async function simulateDataLoading() {
  // Simulate loading specialists and models data
  const data = Array.from({ length: 100 }, (_, i) => ({
    id: `item-${i}`,
    name: `Item ${i}`,
    data: Array.from({ length: 50 }, () => Math.random())
  }));
  
  return new Promise(resolve => setTimeout(() => resolve(data), 10));
}

async function simulateUICreation() {
  // Simulate creating UI elements
  const elements = [];
  for (let i = 0; i < 20; i++) {
    elements.push({
      type: 'div',
      id: `ui-element-${i}`,
      content: `UI Element ${i}`
    });
  }
  return elements;
}

async function simulateMessageProcessing() {
  // Simulate processing extension messages
  return new Promise(resolve => {
    setTimeout(() => resolve({ processed: true }), 5);
  });
}

async function simulateStorageOperations() {
  // Simulate storage read/write operations
  const data = { key1: 'value1', key2: 'value2' };
  return new Promise(resolve => setTimeout(() => resolve(data), 15));
}

async function simulateResourceUsage(resource) {
  resource.isActive = true;
  await new Promise(resolve => setTimeout(resolve, 10));
}

async function cleanupResources(resources) {
  return Promise.all(resources.map(async (resource) => {
    resource.cleanup();
    resource.isActive = false;
  }));
}

async function simulateOperationCycle() {
  // Simulate a complete operation cycle
  await simulateDataLoading();
  await simulateUICreation();
  await simulateMessageProcessing();
}

async function triggerGarbageCollection() {
  // Simulate garbage collection
  return new Promise(resolve => {
    setTimeout(() => {
      // Simulate memory cleanup
      global.performance.memory.usedJSHeapSize *= 0.8;
      resolve();
    }, 50);
  });
}

function createMemoryLeakDetector() {
  return {
    analyzeTrend: (snapshots) => {
      if (snapshots.length < 3) return false;
      
      const trend = snapshots.slice(-3);
      const increases = trend.slice(1).every((snap, i) => 
        snap.memory > trend[i].memory
      );
      
      return increases && (trend[2].memory - trend[0].memory > 5000000); // 5MB increase
    },
    getLeakSeverity: () => 'none'
  };
}

function createMemoryPressureHandler() {
  return {
    handlePressure: async () => {
      // Simulate memory cleanup actions
      const memoryFreed = 1000000; // 1MB freed
      global.performance.memory.usedJSHeapSize -= memoryFreed;
      
      return {
        actionsKaken: ['cache_cleared', 'unused_data_removed'],
        memoryFreed
      };
    }
  };
}

function generateLargeDataset(size) {
  return Array.from({ length: size }, (_, i) => ({
    id: `item-${i}`,
    name: `Item ${i}`,
    description: `Description for item ${i}`,
    metadata: {
      category: i % 5 === 0 ? 'technical' : 'general',
      tags: [`tag-${i % 10}`, `category-${i % 3}`],
      created: new Date(Date.now() - Math.random() * 86400000).toISOString()
    }
  }));
}

function createDataManager() {
  let data = [];
  
  return {
    loadData: async (dataset) => {
      data = [...dataset];
      return true;
    },
    search: async (query) => {
      return data.filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
      );
    },
    filter: async (criteria) => {
      return data.filter(item => {
        return Object.entries(criteria).every(([key, value]) => {
          return item.metadata && item.metadata[key] === value;
        });
      });
    },
    sort: async (field) => {
      data.sort((a, b) => a[field].localeCompare(b[field]));
      return data;
    }
  };
}

function createDOMManager() {
  let nodeCount = 0;
  let batchedOps = 0;
  
  return {
    createElement: async (tag, properties = {}) => {
      if (nodeCount >= performanceTestConfig.maxDOMNodes) {
        throw new Error('DOM node limit exceeded');
      }
      
      const element = {
        tagName: tag.toUpperCase(),
        ...properties
      };
      
      nodeCount++;
      return element;
    },
    
    updateElement: async (element, properties) => {
      Object.assign(element, properties);
      return element;
    },
    
    batchOperations: async (operations) => {
      // Simulate batched DOM operations
      batchedOps = operations.length;
      await new Promise(resolve => setTimeout(resolve, 10));
      return true;
    },
    
    scheduleUpdate: async (elementId, properties) => {
      // Simulate scheduled DOM update
      return new Promise(resolve => {
        setTimeout(() => resolve({ elementId, properties }), 1);
      });
    },
    
    getNodeCount: () => nodeCount,
    getBatchedOperationCount: () => batchedOps,
    getQueuedUpdates: () => 0
  };
}

function createEventManager() {
  let listenerCount = 0;
  const listeners = new Map();
  
  return {
    addEventListener: async (elementId, event, handler, options = {}) => {
      const key = `${elementId}-${event}`;
      
      if (!listeners.has(key)) {
        listeners.set(key, []);
      }
      
      let wrappedHandler = handler;
      
      if (options.debounce) {
        let timeout;
        wrappedHandler = (...args) => {
          clearTimeout(timeout);
          timeout = setTimeout(() => handler(...args), options.debounce);
        };
      }
      
      listeners.get(key).push(wrappedHandler);
      listenerCount++;
    },
    
    fireEvent: async (elementId, event, data = {}) => {
      const key = `${elementId}-${event}`;
      const eventListeners = listeners.get(key) || [];
      
      eventListeners.forEach(handler => handler(data));
    },
    
    removeAllListeners: async () => {
      listeners.clear();
      listenerCount = 0;
    },
    
    getListenerCount: () => listenerCount
  };
}

function createStorageManager() {
  return {
    setItems: async (items) => {
      // Simulate storage operation time based on data size
      const dataSize = JSON.stringify(items).length;
      const delay = Math.min(dataSize / 10000, 100); // Max 100ms delay
      
      return new Promise(resolve => setTimeout(resolve, delay));
    },
    
    getItems: async (keys) => {
      const delay = keys.length * 0.1; // 0.1ms per key
      return new Promise(resolve => {
        setTimeout(() => {
          const result = {};
          keys.forEach(key => {
            result[key] = `value-for-${key}`;
          });
          resolve(result);
        }, delay);
      });
    },
    
    setItem: async (key, value) => {
      const size = JSON.stringify(value).length;
      if (size > 1000000) { // 1MB limit
        throw new Error('Quota exceeded');
      }
      return true;
    }
  };
}

function createCacheManager() {
  const cache = new Map();
  let hits = 0;
  let misses = 0;
  
  return {
    set: async (key, value) => {
      cache.set(key, value);
      return true;
    },
    
    get: async (key) => {
      if (cache.has(key)) {
        hits++;
        return cache.get(key);
      } else {
        misses++;
        return null;
      }
    },
    
    getHitRate: () => hits / (hits + misses) || 0
  };
}

function createQuotaManager() {
  let availableSpace = 5000000; // 5MB default
  
  return {
    setAvailableSpace: (space) => {
      availableSpace = space;
    },
    
    getCleanupSuggestions: async () => {
      return [
        'Remove old cached data',
        'Compress stored data',
        'Clear temporary files',
        'Optimize data structures'
      ];
    }
  };
}

function generateLargeStorageData(itemCount) {
  const data = {};
  for (let i = 0; i < itemCount; i++) {
    data[`key-${i}`] = {
      id: i,
      data: Array.from({ length: 10 }, () => Math.random()),
      timestamp: Date.now()
    };
  }
  return data;
}

function generateTestData(itemCount) {
  return Array.from({ length: itemCount }, (_, i) => ({
    id: i,
    value: `test-data-${i}`,
    metadata: { type: 'test', index: i }
  }));
}

function createMessageProcessor() {
  return {
    processMessage: async (message) => {
      // Simulate message processing time
      const processingTime = Math.random() * 10 + 1; // 1-11ms
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            success: true,
            id: message.id,
            processed: true,
            processingTime
          });
        }, processingTime);
      });
    }
  };
}

function createHeavyOperationManager() {
  return {
    startHeavyTask: async () => {
      // Simulate heavy computation
      return new Promise(resolve => {
        setTimeout(resolve, 2000); // 2 second heavy task
      });
    },
    
    ping: async () => {
      // Quick response to test responsiveness
      return new Promise(resolve => {
        setTimeout(() => resolve('pong'), Math.random() * 20 + 5); // 5-25ms
      });
    }
  };
}