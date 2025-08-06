#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

/**
 * Creates a Chrome extension package for distribution
 * @param {string} version - The version to package
 */
function createExtensionPackage(version) {
  if (!version) {
    console.error('❌ Version argument is required');
    process.exit(1);
  }

  const rootDir = path.join(__dirname, '..');
  const buildDir = path.join(rootDir, 'build');
  const packagePath = path.join(rootDir, `extension-v${version}.zip`);

  console.log(`📦 Creating extension package v${version}...`);

  try {
    // Clean and create build directory
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true, force: true });
    }
    fs.mkdirSync(buildDir, { recursive: true });

    // Files and directories to include in the package
    const filesToInclude = [
      'manifest.json',
      'popup/',
      'content/',
      'background/',
      'images/',
      'data/'
    ];

    console.log('📋 Including files in package:');
    
    // Copy files to build directory
    for (const item of filesToInclude) {
      const sourcePath = path.join(rootDir, item);
      const destPath = path.join(buildDir, item);
      
      if (!fs.existsSync(sourcePath)) {
        console.warn(`⚠️  Warning: ${item} not found, skipping`);
        continue;
      }

      const stats = fs.statSync(sourcePath);
      
      if (stats.isDirectory()) {
        // Copy directory recursively
        copyDirectory(sourcePath, destPath);
        console.log(`   ✓ ${item} (directory)`);
      } else {
        // Copy file
        fs.copyFileSync(sourcePath, destPath);
        console.log(`   ✓ ${item} (file)`);
      }
    }

    // Validate manifest in build directory
    const buildManifestPath = path.join(buildDir, 'manifest.json');
    if (!fs.existsSync(buildManifestPath)) {
      console.error('❌ manifest.json missing in build directory');
      process.exit(1);
    }

    const manifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf8'));
    if (manifest.version !== version) {
      console.error(`❌ Manifest version mismatch: expected ${version}, got ${manifest.version}`);
      process.exit(1);
    }

    // Remove any unwanted files from build directory
    const unwantedPatterns = [
      '*.log',
      '*.tmp',
      '.DS_Store',
      'Thumbs.db',
      '*.bak',
      '*.backup'
    ];

    removeUnwantedFiles(buildDir, unwantedPatterns);

    // Create ZIP package
    console.log('🗜️  Creating ZIP package...');
    
    try {
      // Use native zip command if available, fallback to node implementation
      try {
        execSync(`cd "${buildDir}" && zip -r "../extension-v${version}.zip" .`, { 
          stdio: 'pipe' 
        });
      } catch (error) {
        // Fallback to node-based zip creation
        console.log('⚠️  System zip not available, using fallback method...');
        createZipFallback(buildDir, packagePath);
      }
    } catch (error) {
      console.error('❌ Failed to create ZIP package:', error.message);
      process.exit(1);
    }

    // Verify package was created
    if (!fs.existsSync(packagePath)) {
      console.error('❌ Package creation failed - ZIP file not found');
      process.exit(1);
    }

    // Calculate package size and checksum
    const stats = fs.statSync(packagePath);
    const packageSize = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`📊 Package size: ${packageSize} MB`);
    
    // Check if size is reasonable for Chrome Web Store (128MB limit)
    if (stats.size > 100 * 1024 * 1024) { // 100MB warning threshold
      console.warn('⚠️  Warning: Package size is large, approaching Chrome Web Store limit');
    }

    // Generate SHA256 checksum
    const hash = crypto.createHash('sha256');
    const packageData = fs.readFileSync(packagePath);
    hash.update(packageData);
    const checksum = hash.digest('hex');
    
    const checksumPath = `${packagePath}.sha256`;
    fs.writeFileSync(checksumPath, `${checksum}  extension-v${version}.zip\n`);
    
    console.log(`🔐 Checksum: ${checksum}`);
    console.log(`💾 Checksum saved to: extension-v${version}.zip.sha256`);

    // Validate package contents
    console.log('🔍 Validating package contents...');
    
    const requiredFiles = ['manifest.json'];
    const tempExtractDir = path.join(rootDir, 'temp-extract');
    
    try {
      if (fs.existsSync(tempExtractDir)) {
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
      }
      
      // Extract and validate (using unzip if available)
      try {
        execSync(`unzip -q "${packagePath}" -d "${tempExtractDir}"`, { stdio: 'pipe' });
        
        for (const requiredFile of requiredFiles) {
          const filePath = path.join(tempExtractDir, requiredFile);
          if (!fs.existsSync(filePath)) {
            throw new Error(`Required file missing from package: ${requiredFile}`);
          }
        }
        
        console.log('✅ Package validation passed');
      } catch (error) {
        console.warn('⚠️  Could not validate package contents (unzip not available)');
      }
      
      // Cleanup temp directory
      if (fs.existsSync(tempExtractDir)) {
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('⚠️  Package validation skipped:', error.message);
    }

    // Generate summary
    console.log('\n📋 Package Summary:');
    console.log(`   Version: ${version}`);
    console.log(`   File: extension-v${version}.zip`);
    console.log(`   Size: ${packageSize} MB`);
    console.log(`   Checksum: ${checksum.substring(0, 16)}...`);
    
    console.log('\n✅ Extension package created successfully!');
    console.log(`🚀 Ready for Chrome Web Store submission: extension-v${version}.zip`);

  } catch (error) {
    console.error('❌ Package creation failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup build directory
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true, force: true });
    }
  }
}

/**
 * Recursively copy a directory
 */
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const items = fs.readdirSync(src);
  
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stats = fs.statSync(srcPath);
    
    if (stats.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Remove unwanted files from directory
 */
function removeUnwantedFiles(dir, patterns) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const itemPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      removeUnwantedFiles(itemPath, patterns);
    } else {
      // Check if file matches any unwanted pattern
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        if (regex.test(item.name)) {
          fs.unlinkSync(itemPath);
          console.log(`   🗑️  Removed: ${item.name}`);
          break;
        }
      }
    }
  }
}

/**
 * Fallback ZIP creation using Node.js (basic implementation)
 */
function createZipFallback(sourceDir, outputPath) {
  console.log('ℹ️  Note: Using basic ZIP creation. For better compression, install system zip utility.');
  
  // This is a very basic implementation
  // In a production environment, you'd want to use a proper ZIP library like 'yazl' or 'archiver'
  const { execSync } = require('child_process');
  
  try {
    // Try using PowerShell on Windows as a fallback
    if (process.platform === 'win32') {
      execSync(`powershell -Command "Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${outputPath}' -Force"`, {
        stdio: 'pipe'
      });
    } else {
      throw new Error('No zip utility available');
    }
  } catch (error) {
    throw new Error('Failed to create ZIP package: No suitable zip utility found');
  }
}

// Run if called directly
if (require.main === module) {
  const version = process.argv[2];
  createExtensionPackage(version);
}

module.exports = { createExtensionPackage };