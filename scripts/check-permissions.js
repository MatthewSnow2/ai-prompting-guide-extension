#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Checks Chrome Extension permissions against security best practices
 */
function checkPermissions() {
  const manifestPath = path.join(__dirname, '..', 'manifest.json');
  
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ manifest.json not found');
    process.exit(1);
  }

  let manifest;
  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(manifestContent);
  } catch (error) {
    console.error('❌ Invalid JSON in manifest.json:', error.message);
    process.exit(1);
  }

  const errors = [];
  const warnings = [];
  const info = [];

  // Define permission categories
  const highRiskPermissions = {
    '<all_urls>': 'Access to all websites',
    'tabs': 'Access to browser tabs',
    'history': 'Access to browsing history',
    'cookies': 'Access to website cookies',
    'downloads': 'Access to download files',
    'bookmarks': 'Access to bookmarks',
    'topSites': 'Access to most visited sites',
    'management': 'Manage other extensions',
    'debugger': 'Access to debugger API',
    'desktopCapture': 'Capture screen/windows',
    'privacy': 'Access privacy settings',
    'system.cpu': 'Access CPU information',
    'system.memory': 'Access memory information',
    'system.storage': 'Access storage information'
  };

  const moderateRiskPermissions = {
    'activeTab': 'Access current tab when extension is invoked',
    'scripting': 'Inject scripts into web pages',
    'storage': 'Use chrome.storage API',
    'alarms': 'Schedule code to run periodically',
    'notifications': 'Display notifications',
    'contextMenus': 'Add items to context menu',
    'background': 'Run scripts in background'
  };

  // Check standard permissions
  const permissions = manifest.permissions || [];
  let riskScore = 0;

  permissions.forEach(permission => {
    if (highRiskPermissions[permission]) {
      errors.push(`High-risk permission: ${permission} - ${highRiskPermissions[permission]}`);
      riskScore += 10;
    } else if (moderateRiskPermissions[permission]) {
      info.push(`Moderate-risk permission: ${permission} - ${moderateRiskPermissions[permission]}`);
      riskScore += 3;
    } else {
      info.push(`Permission: ${permission}`);
      riskScore += 1;
    }
  });

  // Check host permissions
  const hostPermissions = manifest.host_permissions || [];
  hostPermissions.forEach(hostPattern => {
    if (hostPattern === '<all_urls>' || hostPattern === 'https://*/*' || hostPattern === 'http://*/*') {
      errors.push(`Overly broad host permission: ${hostPattern} - Consider limiting to specific domains`);
      riskScore += 15;
    } else if (hostPattern.includes('*')) {
      warnings.push(`Wildcard host permission: ${hostPattern} - Ensure this scope is necessary`);
      riskScore += 5;
    } else {
      info.push(`Host permission: ${hostPattern}`);
      riskScore += 2;
    }
  });

  // Check content script matches
  if (manifest.content_scripts) {
    manifest.content_scripts.forEach((script, index) => {
      script.matches.forEach(match => {
        if (match === '<all_urls>' || match === 'https://*/*' || match === 'http://*/*') {
          warnings.push(`Content script ${index} has broad match pattern: ${match}`);
          riskScore += 8;
        } else if (match.includes('*')) {
          info.push(`Content script ${index} match pattern: ${match}`);
          riskScore += 3;
        }
      });
    });
  }

  // Evaluate risk score
  let riskLevel = 'LOW';
  if (riskScore >= 50) {
    riskLevel = 'CRITICAL';
  } else if (riskScore >= 30) {
    riskLevel = 'HIGH';
  } else if (riskScore >= 15) {
    riskLevel = 'MEDIUM';
  }

  // Check for security best practices
  if (!manifest.content_security_policy) {
    warnings.push('No Content Security Policy defined');
  }

  // Check for web accessible resources
  if (manifest.web_accessible_resources) {
    manifest.web_accessible_resources.forEach((resource, index) => {
      if (resource.matches && resource.matches.includes('<all_urls>')) {
        warnings.push(`Web accessible resource ${index} exposed to all URLs`);
      }
    });
  }

  // Generate recommendations
  const recommendations = [];
  
  if (permissions.includes('activeTab') && permissions.includes('tabs')) {
    recommendations.push('Consider using only "activeTab" instead of "tabs" for better security');
  }
  
  if (hostPermissions.some(p => p.includes('http://'))) {
    recommendations.push('Avoid HTTP host permissions; prefer HTTPS for security');
  }
  
  if (riskScore > 20) {
    recommendations.push('Consider implementing optional permissions for better user trust');
  }

  // Output results
  console.log(`🔐 Permission Risk Assessment`);
  console.log(`Risk Level: ${riskLevel} (Score: ${riskScore})`);
  console.log('');

  if (errors.length > 0) {
    console.error('🚨 Security Concerns:');
    errors.forEach(error => console.error(`   ${error}`));
    console.log('');
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Warnings:');
    warnings.forEach(warning => console.warn(`   ${warning}`));
    console.log('');
  }

  if (recommendations.length > 0) {
    console.log('💡 Recommendations:');
    recommendations.forEach(rec => console.log(`   ${rec}`));
    console.log('');
  }

  if (info.length > 0) {
    console.log('ℹ️  Permissions Summary:');
    info.forEach(item => console.log(`   ${item}`));
    console.log('');
  }

  // Fail if critical risk level
  if (riskLevel === 'CRITICAL') {
    console.error('❌ Critical security risk detected. Review and reduce permissions.');
    process.exit(1);
  }

  console.log('✅ Permission check completed');
}

if (require.main === module) {
  checkPermissions();
}

module.exports = { checkPermissions };