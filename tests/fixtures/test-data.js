/**
 * Test Fixtures and Mock Data
 * Contains reusable test data for consistent testing
 */

const testSpecialists = [
  {
    id: 'software-engineer',
    name: 'Software Engineer',
    description: 'Expert in software development, architecture, and best practices',
    welcomeMessage: 'I am a software engineering specialist. How can I help you with your development tasks?',
    placeholderText: 'Describe your coding challenge or project requirements...',
    icon: '💻',
    defaultPromptingTechniques: [
      'Break down complex problems into smaller tasks',
      'Consider edge cases and error handling',
      'Focus on maintainable and scalable solutions'
    ],
    commonPatterns: [
      'Code review and optimization',
      'Architecture design decisions',
      'Debugging and troubleshooting'
    ],
    pitfallAvoidance: [
      'Avoid premature optimization',
      'Don\'t ignore security considerations',
      'Consider performance implications'
    ],
    outputOptimization: [
      'Provide working code examples',
      'Include documentation and comments',
      'Suggest testing strategies'
    ]
  },
  {
    id: 'data-scientist',
    name: 'Data Scientist',
    description: 'Specialist in data analysis, machine learning, and statistical modeling',
    welcomeMessage: 'I am a data science specialist. What data challenges can I help you solve?',
    placeholderText: 'Describe your data analysis or machine learning task...',
    icon: '📊',
    defaultPromptingTechniques: [
      'Define clear success metrics',
      'Consider data quality and limitations',
      'Plan for model validation and testing'
    ],
    commonPatterns: [
      'Exploratory data analysis',
      'Feature engineering and selection',
      'Model evaluation and comparison'
    ],
    pitfallAvoidance: [
      'Avoid data leakage in models',
      'Don\'t ignore class imbalance',
      'Consider statistical significance'
    ],
    outputOptimization: [
      'Visualize data insights clearly',
      'Provide interpretation of results',
      'Include confidence intervals'
    ]
  }
];

const testModels = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    description: 'OpenAI\'s most capable model for complex reasoning and analysis',
    icon: '🤖',
    optimizations: [
      'Use clear, specific instructions',
      'Break complex tasks into steps',
      'Provide examples when needed'
    ],
    considerations: [
      'Has knowledge cutoff limitations',
      'May hallucinate factual information',
      'Works best with detailed context'
    ],
    bestPractices: [
      'Be explicit about desired output format',
      'Use system messages for role definition',
      'Iterate and refine prompts based on results'
    ]
  },
  {
    id: 'claude-3',
    name: 'Claude 3',
    description: 'Anthropic\'s advanced AI model focused on helpfulness and safety',
    icon: '🎭',
    optimizations: [
      'Leverage strong reasoning capabilities',
      'Use for complex analysis tasks',
      'Provide clear context and constraints'
    ],
    considerations: [
      'Emphasizes safety and helpfulness',
      'May be more conservative in responses',
      'Excels at nuanced understanding'
    ],
    bestPractices: [
      'Frame requests clearly and ethically',
      'Use for tasks requiring careful reasoning',
      'Provide relevant background information'
    ]
  }
];

const testUserPreferences = {
  position: { x: 100, y: 50 },
  size: { width: 450, height: 650 },
  currentSpecialist: 'software-engineer',
  currentModel: 'gpt-4',
  isVisible: false,
  autoOpen: false,
  rememberPosition: true,
  globalRulesEnabled: true,
  theme: 'light'
};

const testUserNotes = {
  'software-engineer': 'Focus on TypeScript and React best practices',
  'data-scientist': 'Prefer Python and scikit-learn examples'
};

const testCustomRules = {
  global: [
    'Always consider accessibility requirements',
    'Include error handling in code examples',
    'Prefer modern JavaScript syntax'
  ],
  specialist: {
    'software-engineer': [
      'Follow SOLID principles',
      'Include unit test suggestions',
      'Consider performance implications'
    ],
    'data-scientist': [
      'Always validate data assumptions',
      'Include visualization recommendations',
      'Consider model interpretability'
    ]
  }
};

const testMessages = [
  {
    action: 'getSpecialists',
    response: { specialists: testSpecialists }
  },
  {
    action: 'getModels',
    response: { models: testModels }
  },
  {
    action: 'getUserPreferences',
    response: { preferences: testUserPreferences }
  },
  {
    action: 'getSpecialistDetails',
    specialistId: 'software-engineer',
    response: { specialist: testSpecialists[0] }
  },
  {
    action: 'generateResponse',
    specialistId: 'software-engineer',
    modelId: 'gpt-4',
    message: 'How do I implement a binary search?',
    response: {
      message: '<strong>As a Software Engineer using GPT-4:</strong><br><br><strong>Implementation approach...</strong>'
    }
  }
];

const testStorageKeys = {
  SPECIALISTS: 'aiPromptingGuide_specialists',
  MODELS: 'aiPromptingGuide_models',
  USER_PREFERENCES: 'aiPromptingGuide_userPrefs',
  USER_NOTES: 'aiPromptingGuide_userNotes',
  CUSTOM_RULES: 'aiPromptingGuide_customRules'
};

// Security test payloads
const securityTestPayloads = {
  xssPayloads: [
    '<script>alert("XSS")</script>',
    '<img src="x" onerror="alert(\'XSS\')">',
    'javascript:alert("XSS")',
    '<svg onload="alert(\'XSS\')">',
    '"><script>alert("XSS")</script>',
    '&lt;script&gt;alert("XSS")&lt;/script&gt;'
  ],
  sqlInjectionPayloads: [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin'--",
    "1' UNION SELECT * FROM users--"
  ],
  pathTraversalPayloads: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    '....//....//....//etc/passwd'
  ],
  overflowPayloads: [
    'A'.repeat(10000),
    'A'.repeat(100000),
    JSON.stringify({ data: 'A'.repeat(50000) })
  ]
};

// Performance test configurations
const performanceTestConfig = {
  maxMemoryUsage: 50 * 1024 * 1024, // 50MB
  maxExecutionTime: 1000, // 1 second
  maxDOMNodes: 1000,
  maxEventListeners: 100,
  loadTestIterations: 100,
  stressTestDuration: 30000 // 30 seconds
};

module.exports = {
  testSpecialists,
  testModels,
  testUserPreferences,
  testUserNotes,
  testCustomRules,
  testMessages,
  testStorageKeys,
  securityTestPayloads,
  performanceTestConfig
};