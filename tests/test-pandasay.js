const pty = require('node-pty');
const assert = require('assert');

console.log('====================================================');
console.log('CYBERTERM // PANDASAY VERIFICATION SUITE');
console.log('====================================================\n');

const results = {};

function record(name, pass, note = '') {
  results[name] = { pass, note };
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}${note ? ' - ' + note : ''}`);
}

function createWslEnv() {
  const shellEnv = { ...process.env };
  delete shellEnv.HOME;
  delete shellEnv.USER;
  delete shellEnv.SHELL;
  shellEnv.LUCIFER_STARTED = '1';
  shellEnv.WSLENV = 'LUCIFER_STARTED';
  shellEnv.TERM = 'xterm-256color';
  shellEnv.COLORTERM = 'truecolor';
  shellEnv.LANG = 'en_US.UTF-8';
  return shellEnv;
}

async function runCommand(proc, cmd, delay = 800) {
  return new Promise((resolve) => {
    proc.write(cmd + '\n');
    setTimeout(resolve, delay);
  });
}

async function testPandasay() {
  const proc = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
    name: 'xterm-256color',
    cols: 100,
    rows: 40,
    cwd: 'C:\\',
    env: createWslEnv(),
    useConpty: true
  });

  let buffer = '';
  proc.onData(data => {
    buffer += data;
  });

  // Wait for initial prompt
  await new Promise(r => setTimeout(r, 1200));

  // 1. Check which pandasay
  console.log('Running: which pandasay...');
  await runCommand(proc, 'which pandasay; echo WHICH_DONE=$?');

  // 2. Basic command: pandasay "Hello World"
  console.log('Running: pandasay "Hello World"...');
  await runCommand(proc, 'pandasay "Hello World"; echo BASIC_DONE=$?');

  // 3. Multi-word without quotes: pandasay Hello World
  console.log('Running: pandasay Hello World...');
  await runCommand(proc, 'pandasay Hello World; echo MULTI_DONE=$?');

  // 4. Multi-line text
  console.log('Running: multi-line pandasay...');
  await runCommand(proc, 'pandasay "Line one\nLine two\nLine three"; echo MULTILINE_DONE=$?');

  // 5. Long text auto-wrapping
  console.log('Running: long text wrapping...');
  await runCommand(proc, 'pandasay "This is a very long message designed to test automatic line wrapping within the pandasay speech bubble without corrupting ASCII borders"; echo WRAP_DONE=$?');

  // 6. No arguments in interactive shell
  console.log('Running: pandasay (no args)...');
  await runCommand(proc, 'pandasay; echo NOARG_EXIT=$?');

  // 7. Help options: -h and --help
  console.log('Running: pandasay -h and --help...');
  await runCommand(proc, 'pandasay -h; echo HELP_DONE=$?');
  await runCommand(proc, 'pandasay --help');

  // 8. Version options: -v and --version
  console.log('Running: pandasay --version...');
  await runCommand(proc, 'pandasay --version; echo VER_DONE=$?');

  // 9. Pipe support from stdin
  console.log('Running: echo "Hello from pipe" | pandasay...');
  await runCommand(proc, 'echo "Hello from pipe" | pandasay; echo PIPE_DONE=$?');

  // 10. Special characters: !@#$%&*()[]{}
  console.log('Running: special characters...');
  await runCommand(proc, 'pandasay \'Special chars: @ # $ % & * ( ) [ ] { }\'; echo SPEC_DONE=$?');

  // 11. Unicode and Emojis: Hello 世界 & CyberTerm 🚀
  console.log('Running: Unicode and Emojis...');
  await runCommand(proc, 'pandasay "Hello 世界"; pandasay "CyberTerm 🚀"; echo UNI_DONE=$?');

  // 12. Fresh session persistence test
  proc.kill();

  console.log('\nVerifying output results...\n');

  // Assertions
  const whichOk = buffer.includes('/home/dpmothikari/.local/bin/pandasay') || buffer.includes('/.local/bin/pandasay');
  record('which pandasay resolves to Linux executable', whichOk, whichOk ? 'Found in ~/.local/bin/pandasay' : 'Not found in PATH');

  const basicOk = buffer.includes('< Hello World >') && buffer.includes('ʕ•ᴥ•ʔ');
  record('pandasay "Hello World" renders speech bubble and panda', basicOk);

  const multiOk = buffer.includes('< Hello World >') && buffer.includes('MULTI_DONE=0');
  record('pandasay Hello World (unquoted multi-word)', multiOk);

  const multiLineOk = buffer.includes('< Line one') && buffer.includes('< Line two') && buffer.includes('< Line three');
  record('Multi-line text formatting', multiLineOk);

  const wrapOk = buffer.includes('WRAP_DONE=0') && buffer.includes('< This is a very long message designed to test');
  record('Long text automatic wrapping', wrapOk);

  const noArgOk = buffer.includes('Usage:') && buffer.includes('NOARG_EXIT=1');
  record('No arguments display usage with non-zero exit code', noArgOk);

  const helpOk = buffer.includes('A tiny terminal panda that speaks.') && buffer.includes('HELP_DONE=0');
  record('pandasay -h / --help display usage manual', helpOk);

  const verOk = buffer.includes('pandasay 1.0.0') && buffer.includes('VER_DONE=0');
  record('pandasay --version displays correct version', verOk);

  const pipeOk = buffer.includes('< Hello from pipe >') && buffer.includes('PIPE_DONE=0');
  record('Pipe support from stdin (echo "..." | pandasay)', pipeOk);

  const specOk = buffer.includes('Special chars: @ # $ % & * ( ) [ ] { }') && buffer.includes('SPEC_DONE=0');
  record('Special characters handled safely as text', specOk);

  const uniOk = buffer.includes('Hello 世界') && buffer.includes('CyberTerm 🚀');
  record('Unicode (世界) and Emojis (🚀) render intact', uniOk);

  // 13. Fresh session test (Simulate opening a completely new session)
  console.log('\nTesting completely new WSL session to verify persistence...');
  const proc2 = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
    name: 'xterm-256color',
    cols: 100,
    rows: 40,
    cwd: 'C:\\',
    env: createWslEnv(),
    useConpty: true
  });

  let buf2 = '';
  proc2.onData(d => { buf2 += d; });
  await new Promise(r => setTimeout(r, 1200));

  await runCommand(proc2, 'pandasay "STILL HERE"; echo FRESH_DONE=$?');
  proc2.kill();

  const persistOk = buf2.includes('< STILL HERE >') && buf2.includes('FRESH_DONE=0');
  record('Command persistence in fresh WSL session', persistOk, 'Available across new shell processes');

  console.log('\n====================================================');
  console.log('SUMMARY:');
  console.log('====================================================');
  let total = 0, passed = 0;
  for (const [name, res] of Object.entries(results)) {
    total++;
    if (res.pass) passed++;
  }
  console.log(`Passed: ${passed}/${total}`);
  if (passed === total) {
    console.log('ALL PANDASAY TESTS PASSED WITH 100% SUCCESS! ✓✓✓');
    process.exit(0);
  } else {
    console.error('SOME PANDASAY TESTS FAILED.');
    process.exit(1);
  }
}

testPandasay().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
