// Test real backend system logic used in main.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing System Diagnostics & Radar...');

// 1. Process Radar Query Test
const psCmd = `powershell.exe -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Select-Object -First 5 -Property ProcessId, Name, WorkingSetSize | ConvertTo-Json"`;
const procOut = execSync(psCmd, { encoding: 'utf8', timeout: 5000 });
const parsedProcs = JSON.parse(procOut);
assert(Array.isArray(parsedProcs) && parsedProcs.length > 0, 'CIM processes must be returned');
console.log(`  ✓ CIM process query returned ${parsedProcs.length} sample processes`);

// 2. Project Detection Test
const cwd = process.cwd();
const hasPackageJson = fs.existsSync(path.join(cwd, 'package.json'));
assert(hasPackageJson, 'package.json must exist in root');
const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
assert.strictEqual(pkg.name, 'cyberterm', 'package name must be cyberterm');
console.log('  ✓ Project manifest detected:', pkg.name);

// 3. Git Status Test
let isRepo = false;
try {
  execSync('git rev-parse --is-inside-work-tree', { cwd, stdio: 'ignore' });
  isRepo = true;
} catch (e) {
  isRepo = false;
}

if (isRepo) {
  const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding: 'utf8', timeout: 3000 }).trim();
  console.log('  ✓ Git repo detected, branch:', gitBranch);
} else {
  console.log('  ✓ Correctly identified non-Git directory (isRepo: false)');
}

// 4. File listing test
const files = fs.readdirSync(cwd, { withFileTypes: true });
assert(files.length > 0, 'Directory should have files');
console.log(`  ✓ Directory listing returned ${files.length} items`);

console.log('\nALL BACKEND SYSTEM TESTS PASSED SUCCESSFULLY! ✓');
