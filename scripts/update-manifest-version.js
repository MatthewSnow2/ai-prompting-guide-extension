#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Updates the version in manifest.json and package.json
 * @param {string} version - The new version to set
 */
function updateVersion(version) {
  if (!version) {
    console.error('❌ Version argument is required');
    process.exit(1);
  }

  // Validate version format (semantic versioning)
  const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*|[0-9a-zA-Z-]*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*|[0-9a-zA-Z-]*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  
  if (!semverRegex.test(version)) {
    console.error('❌ Invalid semantic version format:', version);
    process.exit(1);
  }

  const rootDir = path.join(__dirname, '..');
  const manifestPath = path.join(rootDir, 'manifest.json');
  const packagePath = path.join(rootDir, 'package.json');

  // Update manifest.json
  try {
    if (!fs.existsSync(manifestPath)) {
      console.error('❌ manifest.json not found');
      process.exit(1);
    }

    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    const oldVersion = manifest.version;
    
    manifest.version = version;
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`✅ Updated manifest.json: ${oldVersion} → ${version}`);
  } catch (error) {
    console.error('❌ Error updating manifest.json:', error.message);
    process.exit(1);
  }

  // Update package.json
  try {
    if (!fs.existsSync(packagePath)) {
      console.error('❌ package.json not found');
      process.exit(1);
    }

    const packageContent = fs.readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    const oldPackageVersion = packageJson.version;
    
    packageJson.version = version;
    
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ Updated package.json: ${oldPackageVersion} → ${version}`);
  } catch (error) {
    console.error('❌ Error updating package.json:', error.message);
    process.exit(1);
  }

  // Validate the updates
  try {
    const updatedManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const updatedPackage = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    if (updatedManifest.version !== version || updatedPackage.version !== version) {
      console.error('❌ Version update validation failed');
      process.exit(1);
    }
    
    console.log('✅ Version update completed successfully');
  } catch (error) {
    console.error('❌ Version update validation error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const version = process.argv[2];
  updateVersion(version);
}

module.exports = { updateVersion };