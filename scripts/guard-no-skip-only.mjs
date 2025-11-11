#!/usr/bin/env node
/**
 * Guard script to prevent skip/only in tests
 * Fails if any .skip( or .only( is found in test files
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const TEST_DIRS = ['tests', 'src/tests'];
const PATTERNS = [/\.skip\(/g, /\.only\(/g];

function scanDirectory(dir, found = []) {
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (entry !== 'node_modules' && entry !== 'dist' && entry !== 'coverage') {
          scanDirectory(fullPath, found);
        }
      } else if (stat.isFile() && EXTENSIONS.some(ext => entry.endsWith(ext))) {
        const content = readFileSync(fullPath, 'utf-8');
        
        for (const pattern of PATTERNS) {
          const matches = content.match(pattern);
          if (matches) {
            found.push({
              file: fullPath,
              pattern: pattern.source,
              count: matches.length
            });
          }
        }
      }
    }
  } catch (error) {
    // Ignore permission errors
  }
  
  return found;
}

const violations = [];
for (const dir of TEST_DIRS) {
  scanDirectory(dir, violations);
}

if (violations.length > 0) {
  console.error('❌ Found .skip() or .only() in test files:');
  console.error('');
  violations.forEach(({ file, pattern, count }) => {
    console.error(`  ${file}: ${count}× ${pattern}`);
  });
  console.error('');
  console.error('Please remove all .skip() and .only() calls before running tests.');
  process.exit(1);
}

console.log('✅ No .skip() or .only() found in test files');
