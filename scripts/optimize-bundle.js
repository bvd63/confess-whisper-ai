#!/usr/bin/env node

/**
 * Bundle Optimization Script
 * Analyzes bundle size and provides optimization recommendations
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUNDLE_SIZE_LIMIT = 200 * 1024; // 200KB in bytes
const LARGE_MODULE_THRESHOLD = 50 * 1024; // 50KB

async function analyzeBuildOutput() {
  const distPath = path.join(__dirname, '..', 'dist');
  
  try {
    const files = await fs.readdir(distPath, { recursive: true });
    const jsFiles = files.filter(f => f.endsWith('.js'));
    
    let totalSize = 0;
    const largeFiles = [];
    
    console.log('\n📊 Bundle Analysis Report\n');
    console.log('=' .repeat(60));
    
    for (const file of jsFiles) {
      const filePath = path.join(distPath, file);
      const stats = await fs.stat(filePath);
      totalSize += stats.size;
      
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`${file.padEnd(40)} ${sizeKB.padStart(10)} KB`);
      
      if (stats.size > LARGE_MODULE_THRESHOLD) {
        largeFiles.push({ file, size: stats.size });
      }
    }
    
    console.log('=' .repeat(60));
    const totalKB = (totalSize / 1024).toFixed(2);
    const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
    console.log(`Total Bundle Size: ${totalKB} KB (${totalMB} MB)\n`);
    
    // Check against budget
    if (totalSize > BUNDLE_SIZE_LIMIT) {
      console.log('⚠️  WARNING: Bundle size exceeds 200KB budget!');
      console.log(`   Over budget by: ${((totalSize - BUNDLE_SIZE_LIMIT) / 1024).toFixed(2)} KB\n`);
    } else {
      console.log('✅ Bundle size within budget\n');
    }
    
    // Report large modules
    if (largeFiles.length > 0) {
      console.log('\n🔍 Large Modules (> 50KB):\n');
      largeFiles
        .sort((a, b) => b.size - a.size)
        .forEach(({ file, size }) => {
          console.log(`   - ${file}: ${(size / 1024).toFixed(2)} KB`);
        });
      console.log('\n💡 Consider lazy loading these modules\n');
    }
    
    // Recommendations
    printRecommendations(largeFiles);
    
  } catch (error) {
    console.error('❌ Error analyzing bundle:', error.message);
    process.exit(1);
  }
}

function printRecommendations(largeFiles) {
  console.log('\n📝 Optimization Recommendations:\n');
  
  if (largeFiles.length > 0) {
    console.log('1. ⚡ Code Splitting:');
    console.log('   - Use dynamic imports for routes');
    console.log('   - Lazy load heavy components');
    console.log('   - Example: const Component = lazy(() => import("./Component"));\n');
  }
  
  console.log('2. 🌳 Tree Shaking:');
  console.log('   - Use named imports instead of default imports');
  console.log('   - Remove unused dependencies');
  console.log('   - Check for duplicate packages\n');
  
  console.log('3. 📦 Bundle Optimization:');
  console.log('   - Enable compression (gzip/brotli)');
  console.log('   - Use production builds');
  console.log('   - Minimize third-party libraries\n');
  
  console.log('4. 🎯 Performance Tips:');
  console.log('   - Preload critical resources');
  console.log('   - Use CDN for static assets');
  console.log('   - Implement route-based code splitting\n');
}

// Check for duplicate dependencies
async function checkDuplicates() {
  try {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    
    const duplicates = [];
    const seen = new Map();
    
    for (const [name, version] of Object.entries(allDeps)) {
      const baseName = name.replace(/^@[\w-]+\//, '');
      if (seen.has(baseName)) {
        duplicates.push({
          original: seen.get(baseName),
          duplicate: name,
        });
      } else {
        seen.set(baseName, name);
      }
    }
    
    if (duplicates.length > 0) {
      console.log('\n⚠️  Potential Duplicate Packages:\n');
      duplicates.forEach(({ original, duplicate }) => {
        console.log(`   - ${original} vs ${duplicate}`);
      });
      console.log('');
    }
  } catch (error) {
    console.warn('Could not check for duplicates:', error.message);
  }
}

// Main execution
async function main() {
  console.log('\n🚀 Running Bundle Optimization Analysis...\n');
  
  await analyzeBuildOutput();
  await checkDuplicates();
  
  console.log('\n✨ Analysis complete!\n');
}

main().catch(console.error);
