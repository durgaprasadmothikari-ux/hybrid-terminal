// Unit tests for CyberTerm Phase 2 Intelligence Engines
const assert = require('assert');

// Mock localStorage for headless testing
global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; }
};

global.window = global;

// Load CyberAI
require('../src/js/cyber-ai.js');
const cyberAI = new global.CyberAI();

console.log('Testing CyberAI...');

// 1. Diagnostic Engine
const pythonErr = cyberAI.diagnoseOutput("ModuleNotFoundError: No module named 'numpy'");
assert(pythonErr, 'Python error should be diagnosed');
assert(pythonErr.solutionCmd.includes('pip install numpy'), 'Solution should install numpy');
console.log('  ✓ Python module diagnostic passed');

const portErr = cyberAI.diagnoseOutput("Error: listen EADDRINUSE: address already in use :::3000");
assert(portErr, 'Port error should be diagnosed');
assert(portErr.solutionCmd.includes('3000'), 'Solution should target port 3000');
console.log('  ✓ Port collision diagnostic passed');

const gitErr = cyberAI.diagnoseOutput("fatal: not a git repository (or any of the parent directories): .git");
assert(gitErr, 'Git error should be diagnosed');
assert(gitErr.solutionCmd.includes('git init'), 'Solution should recommend git init');
console.log('  ✓ Git repo diagnostic passed');

// 2. Command Risk Analyzer
const critRisk = cyberAI.analyzeRisk('rm -rf /');
assert.strictEqual(critRisk.level, 'CRITICAL', 'rm -rf / must be CRITICAL');
console.log('  ✓ rm -rf / risk level passed');

const psRisk = cyberAI.analyzeRisk('Remove-Item -Recurse -Force C:\\Windows');
assert.strictEqual(psRisk.level, 'HIGH', 'Remove-Item C:\\Windows must be HIGH');
console.log('  ✓ PowerShell recursive deletion risk level passed');

const gitResetRisk = cyberAI.analyzeRisk('git reset --hard HEAD~1');
assert.strictEqual(gitResetRisk.level, 'MEDIUM', 'git reset --hard must be MEDIUM');
console.log('  ✓ Git reset --hard risk level passed');

const safeCmd = cyberAI.analyzeRisk('git status');
assert.strictEqual(safeCmd.level, 'LOW', 'git status must be LOW');
console.log('  ✓ Safe command low risk passed');

// 3. Command Translator
const transLs = cyberAI.translateCommand('ls -la');
assert(transLs, 'ls -la translation should exist');
assert.strictEqual(transLs.cmd, 'dir /a');
assert.strictEqual(transLs.powershell, 'Get-ChildItem -Force');
console.log('  ✓ Command translation passed');

// 4. Command Explainer
const expGit = cyberAI.explainCommand('git commit -m "feat: new terminal"');
assert(expGit, 'Command explanation should exist');
assert(expGit.breakdown.length > 0, 'Breakdown should have tokens');
console.log('  ✓ Command explainer passed');

// 5. Natural Language Command Builder
const nlRes = cyberAI.buildFromNaturalLanguage('kill port 8080', 'powershell');
assert(nlRes, 'NL builder should handle kill port');
assert(nlRes.cmd.includes('8080'), 'NL cmd should include port 8080');
console.log('  ✓ Natural Language Command Builder passed');

// Test Session Time Machine
console.log('\nTesting SessionTimeMachine...');
require('../src/js/timeline.js');
const timeMachine = new global.SessionTimeMachine();

const entry = timeMachine.recordCommand('session-1', 'npm test', 'powershell', 'c:\\Users\\mothi\\my terminal');
assert(entry, 'Event entry must be returned');
timeMachine.recordOutput('session-1', 'All 15 tests passed cleanly.');
timeMachine.finishCommand('session-1', 0);

const results = timeMachine.search('npm test');
assert.strictEqual(results.length, 1, 'Should find 1 recorded event');
assert.strictEqual(results[0].status, 'SUCCESS', 'Status should be SUCCESS');
console.log('  ✓ SessionTimeMachine record & search passed');

// Test Workspace Manager
console.log('\nTesting WorkspaceManager...');
require('../src/js/workspaces.js');
const wsManager = new global.WorkspaceManager();
assert(wsManager.list().length >= 1, 'Default workspace must exist');

const defWs = wsManager.get('Default');
assert(defWs, 'Default workspace object exists');
assert.strictEqual(defWs.name, 'Default');
console.log('  ✓ WorkspaceManager list & get passed');

console.log('\nALL UNIT TESTS PASSED SUCCESSFULLY! ✓');
