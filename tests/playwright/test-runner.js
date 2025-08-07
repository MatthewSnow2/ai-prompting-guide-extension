/**
 * Comprehensive Test Runner
 * Orchestrates all test suites with proper reporting and error handling
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class ExtensionTestRunner {
  constructor() {
    this.testSuites = [
      {
        name: 'Extension Loading & Initialization',
        file: 'extension-loading.chrome.spec.js',
        priority: 1,
        timeout: 30000
      },
      {
        name: 'Specialist Selection & Switching',
        file: 'specialist-selection.chrome.spec.js',
        priority: 2,
        timeout: 45000
      },
      {
        name: 'Specialist Workflows',
        file: 'specialist-workflows.chrome.spec.js',
        priority: 3,
        timeout: 60000
      },
      {
        name: 'Data Management',
        file: 'data-management.chrome.spec.js',
        priority: 4,
        timeout: 45000
      },
      {
        name: 'LLM Integration',
        file: 'llm-integration.chrome.spec.js',
        priority: 5,
        timeout: 60000
      },
      {
        name: 'UI/UX & Responsive Design',
        file: 'ui-ux-responsive.chrome.spec.js',
        priority: 6,
        timeout: 45000
      },
      {
        name: 'Accessibility',
        file: 'accessibility.chrome.spec.js',
        priority: 7,
        timeout: 60000
      },
      {
        name: 'Security',
        file: 'security.chrome.spec.js',
        priority: 8,
        timeout: 45000
      },
      {
        name: 'Performance',
        file: 'performance.chrome.spec.js',
        priority: 9,
        timeout: 60000
      }
    ];
    
    this.results = [];
    this.startTime = Date.now();
  }

  async runAllTests(options = {}) {
    console.log('🚀 Starting AI Prompting Guide Extension Test Suite');
    console.log('='.repeat(60));
    
    try {
      // Ensure test results directory exists
      await this.ensureTestResultsDirectory();
      
      // Run tests based on priority and options
      if (options.fast) {
        await this.runFastTests();
      } else if (options.suite) {
        await this.runSpecificSuite(options.suite);
      } else {
        await this.runFullSuite();
      }
      
      // Generate comprehensive report
      await this.generateFinalReport();
      
      // Check if all tests passed
      const allTestsPassed = this.results.every(result => result.success);
      
      if (allTestsPassed) {
        console.log('✅ All tests passed successfully!');
        process.exit(0);
      } else {
        console.log('❌ Some tests failed. Check the detailed report.');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('💥 Test runner encountered a critical error:', error);
      process.exit(1);
    }
  }

  async ensureTestResultsDirectory() {
    try {
      await fs.access('./test-results');
    } catch (error) {
      await fs.mkdir('./test-results', { recursive: true });
    }
    
    try {
      await fs.access('./playwright-report');
    } catch (error) {
      await fs.mkdir('./playwright-report', { recursive: true });
    }
  }

  async ensurePlaywrightSetup() {
    try {
      console.log('   🔍 Checking Playwright browser installation...');
      
      // Check if Playwright browsers are installed
      const checkCommand = 'npx playwright --version';
      execSync(checkCommand, { encoding: 'utf8', stdio: 'pipe' });
      
      console.log('   ✅ Playwright is available');
      
      // Try to install browsers if not already installed
      try {
        const installCommand = 'npx playwright install chromium --with-deps';
        console.log('   🚀 Installing/updating Playwright browsers...');
        
        execSync(installCommand, { 
          encoding: 'utf8', 
          stdio: 'inherit', // Show installation progress
          timeout: 300000 // 5 minutes for installation
        });
        
        console.log('   ✅ Playwright browsers ready');
        
      } catch (installError) {
        console.log('   ⚠️  Browser installation failed, but continuing with test...');
        console.log('     Error:', installError.message.split('\n')[0]);
      }
      
    } catch (error) {
      throw new Error(`Playwright setup failed: ${error.message}`);
    }
  }

  async runFastTests() {
    console.log('⚡ Running fast test suite (core functionality only)');
    
    const fastTests = this.testSuites
      .filter(suite => suite.priority <= 5)
      .sort((a, b) => a.priority - b.priority);
    
    for (const suite of fastTests) {
      await this.runSingleSuite(suite);
    }
  }

  async runSpecificSuite(suiteName) {
    console.log(`🎯 Running specific test suite: ${suiteName}`);
    
    const suite = this.testSuites.find(s => 
      s.name.toLowerCase().includes(suiteName.toLowerCase()) ||
      s.file.includes(suiteName)
    );
    
    if (!suite) {
      throw new Error(`Test suite '${suiteName}' not found`);
    }
    
    await this.runSingleSuite(suite);
  }

  async runFullSuite() {
    console.log('🏁 Running complete test suite');
    
    const sortedSuites = this.testSuites.sort((a, b) => a.priority - b.priority);
    
    for (const suite of sortedSuites) {
      await this.runSingleSuite(suite);
    }
  }

  async runSingleSuite(suite) {
    console.log(`\n🧪 Running: ${suite.name}`);
    console.log('-'.repeat(40));
    
    const startTime = Date.now();
    let result = {
      name: suite.name,
      file: suite.file,
      startTime: startTime,
      endTime: null,
      duration: null,
      success: false,
      error: null,
      output: '',
      testCount: 0,
      passedCount: 0,
      failedCount: 0
    };
    
    try {
      // Check if Playwright browsers are installed first
      await this.ensurePlaywrightSetup();
      
      // Run the specific test file
      const command = `npx playwright test tests/playwright/${suite.file} --reporter=json`;
      
      console.log(`   📋 Executing: ${command}`);
      
      const output = execSync(command, {
        encoding: 'utf8',
        timeout: suite.timeout,
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']  // Capture stderr as well
      });
      
      result.output = output;
      result.success = true;
      
      // Parse Playwright JSON output for test counts
      try {
        const jsonMatch = output.match(/\{.*"stats".*\}/s);
        if (jsonMatch) {
          const playwrightResult = JSON.parse(jsonMatch[0]);
          result.testCount = playwrightResult.stats?.total || 0;
          result.passedCount = playwrightResult.stats?.passed || 0;
          result.failedCount = playwrightResult.stats?.failed || 0;
        }
      } catch (parseError) {
        // If we can't parse the JSON, that's okay - we have the raw output
        console.log('   ⚠️  Could not parse test statistics');
      }
      
      console.log(`   ✅ ${suite.name} completed successfully`);
      
      if (result.testCount > 0) {
        console.log(`   📊 ${result.passedCount}/${result.testCount} tests passed`);
      }
      
    } catch (error) {
      result.success = false;
      result.error = error.message;
      result.output = error.stdout || error.stderr || error.message;
      
      console.log(`   ❌ ${suite.name} failed:`);
      console.log(`      ${error.message.split('\n')[0]}`);
      
      // Provide more detailed error information for debugging
      if (error.stderr && error.stderr.includes('browserType.launch')) {
        console.log(`   💡 Tip: Browser launch failed. Try running 'npx playwright install chromium'`);
      } else if (error.message.includes('ENOENT')) {
        console.log(`   💡 Tip: Command not found. Make sure Playwright is installed: 'npm install @playwright/test'`);
      } else if (error.message.includes('timeout')) {
        console.log(`   💡 Tip: Test timed out. Consider increasing timeout or checking test logic`);
      }
    }
    
    result.endTime = Date.now();
    result.duration = result.endTime - result.startTime;
    
    this.results.push(result);
    
    // Brief pause between test suites
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async generateFinalReport() {
    console.log('\n📊 Generating Test Report');
    console.log('='.repeat(60));
    
    const totalDuration = Date.now() - this.startTime;
    const successfulSuites = this.results.filter(r => r.success).length;
    const failedSuites = this.results.filter(r => !r.success).length;
    
    // Console summary
    console.log(`\n📈 TEST SUMMARY`);
    console.log(`   Total Suites: ${this.results.length}`);
    console.log(`   Passed: ${successfulSuites} ✅`);
    console.log(`   Failed: ${failedSuites} ${failedSuites > 0 ? '❌' : ''}`);
    console.log(`   Duration: ${Math.round(totalDuration / 1000)}s`);
    
    // Individual suite results
    console.log(`\n📋 DETAILED RESULTS`);
    for (const result of this.results) {
      const status = result.success ? '✅' : '❌';
      const duration = Math.round(result.duration / 1000);
      console.log(`   ${status} ${result.name} (${duration}s)`);
      
      if (!result.success) {
        console.log(`      Error: ${result.error}`);
      }
    }
    
    // Generate JSON report
    await this.generateJSONReport(totalDuration);
    
    // Generate HTML report
    await this.generateHTMLReport(totalDuration);
    
    // Generate markdown report
    await this.generateMarkdownReport(totalDuration);
    
    console.log(`\n📄 Reports generated in ./test-results/`);
    console.log(`   - test-summary.json`);
    console.log(`   - test-report.html`);
    console.log(`   - TEST-SUMMARY.md`);
  }

  async generateJSONReport(totalDuration) {
    const report = {
      timestamp: new Date().toISOString(),
      totalDuration: totalDuration,
      summary: {
        totalSuites: this.results.length,
        passedSuites: this.results.filter(r => r.success).length,
        failedSuites: this.results.filter(r => !r.success).length,
        totalTests: this.results.reduce((sum, r) => sum + (r.testCount || 0), 0),
        passedTests: this.results.reduce((sum, r) => sum + (r.passedCount || 0), 0),
        failedTests: this.results.reduce((sum, r) => sum + (r.failedCount || 0), 0)
      },
      suites: this.results.map(result => ({
        name: result.name,
        file: result.file,
        success: result.success,
        duration: result.duration,
        testCount: result.testCount,
        passedCount: result.passedCount,
        failedCount: result.failedCount,
        error: result.error
      })),
      environment: {
        platform: process.platform,
        node: process.version,
        timestamp: new Date().toISOString()
      }
    };
    
    await fs.writeFile('./test-results/test-summary.json', JSON.stringify(report, null, 2));
  }

  async generateHTMLReport(totalDuration) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Prompting Guide Extension - Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #666; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .suite { margin-bottom: 20px; padding: 20px; border-radius: 8px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .suite-header { display: flex; justify-content: between; align-items: center; margin-bottom: 10px; }
        .suite-name { font-size: 1.2em; font-weight: bold; }
        .suite-status { padding: 4px 8px; border-radius: 4px; color: white; font-size: 0.8em; }
        .status-pass { background-color: #28a745; }
        .status-fail { background-color: #dc3545; }
        .suite-details { font-size: 0.9em; color: #666; }
        .error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 AI Prompting Guide Extension - Test Report</h1>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Duration:</strong> ${Math.round(totalDuration / 1000)}s</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <div class="metric-value">${this.results.length}</div>
            <div class="metric-label">Total Suites</div>
        </div>
        <div class="metric">
            <div class="metric-value success">${this.results.filter(r => r.success).length}</div>
            <div class="metric-label">Passed</div>
        </div>
        <div class="metric">
            <div class="metric-value failure">${this.results.filter(r => !r.success).length}</div>
            <div class="metric-label">Failed</div>
        </div>
        <div class="metric">
            <div class="metric-value">${this.results.reduce((sum, r) => sum + (r.testCount || 0), 0)}</div>
            <div class="metric-label">Total Tests</div>
        </div>
    </div>
    
    <h2>📋 Test Suite Results</h2>
    ${this.results.map(result => `
        <div class="suite">
            <div class="suite-header">
                <div class="suite-name">${result.name}</div>
                <span class="suite-status ${result.success ? 'status-pass' : 'status-fail'}">
                    ${result.success ? 'PASS' : 'FAIL'}
                </span>
            </div>
            <div class="suite-details">
                <strong>File:</strong> ${result.file}<br>
                <strong>Duration:</strong> ${Math.round(result.duration / 1000)}s<br>
                ${result.testCount ? `<strong>Tests:</strong> ${result.passedCount}/${result.testCount} passed<br>` : ''}
            </div>
            ${result.error ? `<div class="error"><strong>Error:</strong> ${result.error}</div>` : ''}
        </div>
    `).join('')}
    
    <hr style="margin: 40px 0;">
    <p style="text-align: center; color: #666; font-size: 0.9em;">
        Generated by AI Prompting Guide Extension Test Runner
    </p>
</body>
</html>`;
    
    await fs.writeFile('./test-results/test-report.html', html);
  }

  async generateMarkdownReport(totalDuration) {
    const passedSuites = this.results.filter(r => r.success).length;
    const failedSuites = this.results.filter(r => !r.success).length;
    const totalTests = this.results.reduce((sum, r) => sum + (r.testCount || 0), 0);
    const passedTests = this.results.reduce((sum, r) => sum + (r.passedCount || 0), 0);
    
    const markdown = `# AI Prompting Guide Extension - Test Report

**Generated:** ${new Date().toLocaleString()}  
**Duration:** ${Math.round(totalDuration / 1000)}s  
**Status:** ${failedSuites === 0 ? '✅ All tests passed' : `❌ ${failedSuites} suite(s) failed`}

## 📊 Summary

| Metric | Value |
|--------|--------|
| Total Suites | ${this.results.length} |
| Passed Suites | ${passedSuites} ✅ |
| Failed Suites | ${failedSuites} ${failedSuites > 0 ? '❌' : '✅'} |
| Total Tests | ${totalTests} |
| Passed Tests | ${passedTests} |
| Success Rate | ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}% |

## 📋 Test Suite Results

${this.results.map(result => `
### ${result.success ? '✅' : '❌'} ${result.name}

- **File:** \`${result.file}\`
- **Duration:** ${Math.round(result.duration / 1000)}s
${result.testCount ? `- **Tests:** ${result.passedCount}/${result.testCount} passed` : ''}
${result.error ? `\n**Error:**\n\`\`\`\n${result.error}\n\`\`\`` : ''}
`).join('\n')}

## 🔍 Test Coverage

This comprehensive test suite covers:

1. **Extension Loading & Initialization** - Core extension functionality
2. **Specialist Selection & Switching** - All 10 specialists and their configurations
3. **Specialist Workflows** - Step-by-step workflow validation
4. **Data Management** - Persistence, editing, and session data
5. **LLM Integration** - API calls and response handling
6. **UI/UX & Responsive Design** - Cross-device compatibility
7. **Accessibility** - WCAG compliance and screen reader support
8. **Security** - XSS prevention and input sanitization
9. **Performance** - Memory usage and response times

---

*Generated by AI Prompting Guide Extension Test Runner*`;
    
    await fs.writeFile('./test-results/TEST-SUMMARY.md', markdown);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  for (const arg of args) {
    if (arg === '--fast') {
      options.fast = true;
    } else if (arg.startsWith('--suite=')) {
      options.suite = arg.split('=')[1];
    } else if (arg === '--help') {
      console.log(`
AI Prompting Guide Extension Test Runner

Usage:
  node test-runner.js [options]

Options:
  --fast              Run only core functionality tests (faster)
  --suite=<name>      Run a specific test suite
  --help              Show this help message

Examples:
  node test-runner.js --fast
  node test-runner.js --suite=accessibility
  node test-runner.js --suite=extension-loading
      `);
      process.exit(0);
    }
  }
  
  const runner = new ExtensionTestRunner();
  runner.runAllTests(options);
}

module.exports = ExtensionTestRunner;