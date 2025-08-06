#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validates Chrome Extension manifest.json for common issues
 */
function validateManifest() {
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

  // Required fields validation
  const requiredFields = ['manifest_version', 'name', 'version'];
  for (const field of requiredFields) {
    if (!manifest[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Manifest version validation
  if (manifest.manifest_version !== 3) {
    errors.push('manifest_version must be 3 for Chrome Web Store');
  }

  // Version format validation
  if (manifest.version && !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
    errors.push('Version must follow semantic versioning (x.y.z)');
  }

  // Permissions validation
  if (manifest.permissions) {
    const dangerousPermissions = ['<all_urls>', 'tabs', 'history', 'cookies', 'downloads'];
    const usedDangerous = manifest.permissions.filter(p => dangerousPermissions.includes(p));
    if (usedDangerous.length > 0) {
      warnings.push(`Potentially sensitive permissions detected: ${usedDangerous.join(', ')}`);
    }
  }

  // Host permissions validation
  if (manifest.host_permissions) {
    const broadPermissions = manifest.host_permissions.filter(p => 
      p === 'https://*/*' || p === 'http://*/*' || p === '<all_urls>'
    );
    if (broadPermissions.length > 0) {
      warnings.push('Broad host permissions detected. Consider limiting scope for security.');
    }
  }

  // Content Security Policy validation
  if (manifest.content_security_policy && manifest.content_security_policy.extension_pages) {
    const csp = manifest.content_security_policy.extension_pages;
    if (csp.includes("'unsafe-eval'")) {
      errors.push("CSP contains 'unsafe-eval' which is prohibited in Chrome Web Store");
    }
  }

  // Icons validation
  const requiredIcons = ['16', '48', '128'];
  if (manifest.icons) {
    const missingIcons = requiredIcons.filter(size => !manifest.icons[size]);
    if (missingIcons.length > 0) {
      warnings.push(`Missing recommended icon sizes: ${missingIcons.join(', ')}`);
    }

    // Check if icon files exist
    for (const [size, iconPath] of Object.entries(manifest.icons)) {
      const fullPath = path.join(__dirname, '..', iconPath);
      if (!fs.existsSync(fullPath)) {
        errors.push(`Icon file not found: ${iconPath}`);
      }
    }
  }

  // Action validation (for popup)
  if (manifest.action && manifest.action.default_popup) {
    const popupPath = path.join(__dirname, '..', manifest.action.default_popup);
    if (!fs.existsSync(popupPath)) {
      errors.push(`Popup file not found: ${manifest.action.default_popup}`);
    }
  }

  // Background script validation
  if (manifest.background && manifest.background.service_worker) {
    const backgroundPath = path.join(__dirname, '..', manifest.background.service_worker);
    if (!fs.existsSync(backgroundPath)) {
      errors.push(`Background script not found: ${manifest.background.service_worker}`);
    }
  }

  // Content scripts validation
  if (manifest.content_scripts) {
    for (const contentScript of manifest.content_scripts) {
      if (contentScript.js) {
        for (const jsFile of contentScript.js) {
          const jsPath = path.join(__dirname, '..', jsFile);
          if (!fs.existsSync(jsPath)) {
            errors.push(`Content script not found: ${jsFile}`);
          }
        }
      }
      if (contentScript.css) {
        for (const cssFile of contentScript.css) {
          const cssPath = path.join(__dirname, '..', cssFile);
          if (!fs.existsSync(cssPath)) {
            errors.push(`Content CSS file not found: ${cssFile}`);
          }
        }
      }
    }
  }

  // Output results
  if (errors.length > 0) {
    console.error('❌ Manifest validation failed:');
    errors.forEach(error => console.error(`   ${error}`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Manifest warnings:');
    warnings.forEach(warning => console.warn(`   ${warning}`));
  }

  console.log('✅ Manifest validation passed');
}

if (require.main === module) {
  validateManifest();
}

module.exports = { validateManifest };