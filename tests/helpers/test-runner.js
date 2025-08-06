/**
 * Test Runner Helper Utilities
 * Provides utilities for running specific test suites and generating reports
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.testResults = {
      unit: null,
      integration: null,
      e2e: null,
      security: null,
      performance: null
    };
  }

  /**
   * Run all test suites with comprehensive reporting
   */
  async runAllTests(options = {}) {
    console.log('🧪 Starting comprehensive test suite...\n');
    
    const testSuites = [
      { name: 'unit', displayName: 'Unit Tests' },
      { name: 'integration', displayName: 'Integration Tests' },
      { name: 'security', displayName: 'Security Tests' },
      { name: 'performance', displayName: 'Performance Tests' }
    ];

    if (!options.skipE2E) {
      testSuites.push({ name: 'e2e', displayName: 'End-to-End Tests' });
    }

    const results = [];
    
    for (const suite of testSuites) {
      console.log(`\n📋 Running ${suite.displayName}...`);
      const result = await this.runTestSuite(suite.name, options);
      results.push({ suite: suite.name, ...result });
      this.testResults[suite.name] = result;
    }

    // Generate comprehensive report
    await this.generateReport(results, options);
    
    return results;
  }

  /**
   * Run specific test suite
   */
  async runTestSuite(suiteName, options = {}) {
    const startTime = Date.now();
    
    try {
      const command = this.buildTestCommand(suiteName, options);
      
      console.log(`Executing: ${command}`);
      const output = execSync(command, { 
        encoding: 'utf8',
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const result = {
        success: true,
        duration,
        output: output.toString(),
        coverage: this.extractCoverage(output.toString()),
        testCount: this.extractTestCount(output.toString())
      };
      
      console.log(`✅ ${suiteName} tests passed (${duration}ms)`);
      return result;
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const result = {
        success: false,
        duration,
        error: error.message,
        output: error.stdout?.toString() || '',
        stderr: error.stderr?.toString() || ''
      };
      
      console.log(`❌ ${suiteName} tests failed (${duration}ms)`);
      console.log(`Error: ${error.message}`);
      
      return result;
    }
  }

  /**
   * Build test command for specific suite
   */
  buildTestCommand(suiteName, options = {}) {
    let command = 'npx jest';
    
    // Test path pattern
    switch (suiteName) {
      case 'unit':
        command += ' tests/unit';
        break;
      case 'integration':
        command += ' tests/integration';
        break;
      case 'e2e':
        command += ' tests/e2e';
        break;
      case 'security':
        command += ' tests/security';
        break;
      case 'performance':
        command += ' tests/performance';
        break;
      default:
        command += ` tests/${suiteName}`;
    }
    
    // Add options
    if (options.coverage) {
      command += ' --coverage';
    }
    
    if (options.verbose) {
      command += ' --verbose';
    }
    
    if (options.silent) {
      command += ' --silent';
    }
    
    if (options.watchMode) {
      command += ' --watch';
    }
    
    if (options.updateSnapshots) {
      command += ' --updateSnapshot';
    }
    
    // Set environment
    if (process.env.CI) {
      command += ' --ci --watchAll=false';
    }
    
    return command;
  }

  /**
   * Extract coverage information from Jest output
   */
  extractCoverage(output) {
    const coverageRegex = /All files[^\|]*\|[^\|]*\|[^\|]*\|[^\|]*\|[^\|]*\|[^\n]*(\d+\.?\d*)/;
    const match = output.match(coverageRegex);
    
    if (match) {
      return parseFloat(match[1]);
    }
    
    // Try alternative coverage format
    const altCoverageRegex = /Coverage summary[^%]*(\d+\.?\d*)%/;
    const altMatch = output.match(altCoverageRegex);
    
    return altMatch ? parseFloat(altMatch[1]) : null;
  }

  /**
   * Extract test count from Jest output
   */
  extractTestCount(output) {
    const testRegex = /Tests:\s+(\d+)\s+passed/;
    const match = output.match(testRegex);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport(results, options = {}) {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(results),
      results: results,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        ci: !!process.env.CI
      }
    };

    // Write JSON report
    await this.writeJSONReport(reportData, options);
    
    // Write HTML report if requested
    if (options.htmlReport) {
      await this.writeHTMLReport(reportData, options);
    }
    
    // Print summary to console
    this.printSummary(reportData);
  }

  /**
   * Generate test summary
   */
  generateSummary(results) {
    const totalTests = results.reduce((sum, r) => sum + (r.testCount || 0), 0);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const passedSuites = results.filter(r => r.success).length;
    const failedSuites = results.filter(r => !r.success).length;
    
    const avgCoverage = results
      .filter(r => r.coverage !== null)
      .reduce((sum, r, _, arr) => sum + (r.coverage || 0) / arr.length, 0);

    return {
      totalTests,
      totalDuration,
      passedSuites,
      failedSuites,
      totalSuites: results.length,
      avgCoverage: Math.round(avgCoverage * 100) / 100,
      success: failedSuites === 0
    };
  }

  /**
   * Write JSON report
   */
  async writeJSONReport(reportData, options = {}) {
    const reportPath = options.reportPath || path.join(process.cwd(), 'test-results.json');
    
    try {
      await fs.promises.writeFile(
        reportPath,
        JSON.stringify(reportData, null, 2),
        'utf8'
      );
      console.log(`📊 JSON report written to: ${reportPath}`);
    } catch (error) {
      console.error('❌ Failed to write JSON report:', error.message);
    }
  }

  /**
   * Write HTML report
   */
  async writeHTMLReport(reportData, options = {}) {
    const htmlReport = this.generateHTMLReport(reportData);
    const reportPath = options.htmlReportPath || path.join(process.cwd(), 'test-results.html');
    
    try {
      await fs.promises.writeFile(reportPath, htmlReport, 'utf8');
      console.log(`📊 HTML report written to: ${reportPath}`);
    } catch (error) {
      console.error('❌ Failed to write HTML report:', error.message);
    }
  }

  /**
   * Generate HTML report content
   */
  generateHTMLReport(reportData) {
    const { summary, results, timestamp, environment } = reportData;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Test Results - AI Prompting Guide Extension</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; color: #333; }
        .metric-label { color: #666; margin-top: 8px; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
        .suite-results { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .suite-header { font-size: 1.2em; font-weight: bold; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
        .suite-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px; }
        .meta-item { padding: 10px; background: #f8f9fa; border-radius: 4px; }
        .output { background: #f8f9fa; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 0.9em; max-height: 300px; overflow-y: auto; white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Test Results - AI Prompting Guide Extension</h1>
        <p><strong>Generated:</strong> ${new Date(timestamp).toLocaleString()}</p>
        <p><strong>Environment:</strong> Node ${environment.nodeVersion} on ${environment.platform} ${environment.ci ? '(CI)' : '(Local)'}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <div class="metric-value ${summary.success ? 'success' : 'error'}">${summary.passedSuites}/${summary.totalSuites}</div>
            <div class="metric-label">Test Suites Passed</div>
        </div>
        <div class="metric">
            <div class="metric-value">${summary.totalTests}</div>
            <div class="metric-label">Total Tests</div>
        </div>
        <div class="metric">
            <div class="metric-value">${(summary.totalDuration / 1000).toFixed(1)}s</div>
            <div class="metric-label">Total Duration</div>
        </div>
        <div class="metric">
            <div class="metric-value ${summary.avgCoverage >= 80 ? 'success' : summary.avgCoverage >= 70 ? 'warning' : 'error'}">${summary.avgCoverage}%</div>
            <div class="metric-label">Avg Coverage</div>
        </div>
    </div>

    ${results.map(result => `
    <div class="suite-results">
        <div class="suite-header ${result.success ? 'success' : 'error'}">
            ${result.success ? '✅' : '❌'} ${result.suite.toUpperCase()} Tests
        </div>
        
        <div class="suite-meta">
            <div class="meta-item">
                <strong>Duration:</strong> ${(result.duration / 1000).toFixed(2)}s
            </div>
            ${result.testCount ? `<div class="meta-item"><strong>Tests:</strong> ${result.testCount}</div>` : ''}
            ${result.coverage ? `<div class="meta-item"><strong>Coverage:</strong> ${result.coverage}%</div>` : ''}
        </div>
        
        ${result.error ? `<div class="output error">Error: ${result.error}</div>` : ''}
        ${result.stderr ? `<div class="output error">${result.stderr}</div>` : ''}
    </div>
    `).join('')}

</body>
</html>`;
  }

  /**
   * Print summary to console
   */
  printSummary(reportData) {
    const { summary } = reportData;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Overall Status: ${summary.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Test Suites:    ${summary.passedSuites}/${summary.totalSuites} passed`);
    console.log(`Total Tests:    ${summary.totalTests}`);
    console.log(`Duration:       ${(summary.totalDuration / 1000).toFixed(1)}s`);
    console.log(`Avg Coverage:   ${summary.avgCoverage}%`);
    console.log('='.repeat(60));
    
    if (!summary.success) {
      console.log('\n❌ FAILED SUITES:');
      reportData.results
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`  • ${result.suite}: ${result.error || 'Unknown error'}`);
        });
    }
  }

  /**
   * Run tests in watch mode for development
   */
  async watchTests(suiteName = 'unit') {
    console.log(`👀 Starting watch mode for ${suiteName} tests...`);
    return this.runTestSuite(suiteName, { watchMode: true });
  }

  /**
   * Run only failed tests
   */
  async runFailedTests() {
    console.log('🔄 Running only failed tests...');
    const command = 'npx jest --onlyFailures';
    
    try {
      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'inherit'
      });
      console.log('✅ Failed tests completed');
    } catch (error) {
      console.log('❌ Failed tests still failing');
      throw error;
    }
  }

  /**
   * Update test snapshots
   */
  async updateSnapshots() {
    console.log('📸 Updating test snapshots...');
    return this.runTestSuite('unit', { updateSnapshots: true });
  }
}

// CLI interface
if (require.main === module) {
  const runner = new TestRunner();
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  
  const options = {
    coverage: args.includes('--coverage'),
    verbose: args.includes('--verbose'),
    silent: args.includes('--silent'),
    skipE2E: args.includes('--skip-e2e'),
    htmlReport: args.includes('--html'),
    reportPath: args.find(arg => arg.startsWith('--report='))?.split('=')[1]
  };

  async function run() {
    try {
      switch (command) {
        case 'all':
          await runner.runAllTests(options);
          break;
        case 'watch':
          await runner.watchTests(args[1]);
          break;
        case 'failed':
          await runner.runFailedTests();
          break;
        case 'snapshots':
          await runner.updateSnapshots();
          break;
        default:
          await runner.runTestSuite(command, options);
      }
    } catch (error) {
      console.error('Test runner failed:', error.message);
      process.exit(1);
    }
  }

  run();
}

module.exports = TestRunner;