const pty = require('node-pty');
const assert = require('assert');

console.log('Testing Interactive Python3 and Ctrl+C in WSL...');

const shellEnv = { ...process.env };
delete shellEnv.HOME;
delete shellEnv.USER;
delete shellEnv.SHELL;
shellEnv.LUCIFER_STARTED = '1';
shellEnv.WSLENV = 'LUCIFER_STARTED';
shellEnv.TERM = 'xterm-256color';
shellEnv.COLORTERM = 'truecolor';
shellEnv.LANG = 'en_US.UTF-8';

const proc = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
  name: 'xterm-256color',
  cols: 100,
  rows: 30,
  cwd: process.env.USERPROFILE || 'C:\\',
  env: shellEnv,
  useConpty: true
});

let buffer = '';
proc.onData((data) => {
  buffer += data;
});

async function testInteractive() {
  await new Promise(r => setTimeout(r, 1200));

  // 1. Launch interactive python3 REPL
  console.log('Step 1: Starting python3 REPL...');
  proc.write('python3\n');
  await new Promise(r => setTimeout(r, 1000));

  // 2. Execute Python statements
  console.log('Step 2: Executing Python commands...');
  proc.write('x = 50 + 50\n');
  await new Promise(r => setTimeout(r, 400));
  proc.write('print(f"PYTHON_CALC_RES={x}")\n');
  await new Promise(r => setTimeout(r, 600));

  // 3. Exit Python REPL
  console.log('Step 3: Exiting python3...');
  proc.write('exit()\n');
  await new Promise(r => setTimeout(r, 800));

  // 4. Test long running ping & Ctrl+C (\x03)
  console.log('Step 4: Testing ping & Ctrl+C...');
  proc.write('ping -c 10 127.0.0.1\n');
  await new Promise(r => setTimeout(r, 1500));

  console.log('Sending Ctrl+C (SIGINT)...');
  proc.write('\x03');
  await new Promise(r => setTimeout(r, 800));

  // 5. Verify shell is still alive and responsive after Ctrl+C
  console.log('Step 5: Verifying shell is still alive after Ctrl+C...');
  proc.write('echo "SHELL_STILL_ALIVE"\n');
  await new Promise(r => setTimeout(r, 800));

  proc.kill();

  console.log('\nVerifying Interactive and Signal results...');
  assert(buffer.includes('PYTHON_CALC_RES=100'), 'Interactive Python must execute expressions and print 100');
  assert(buffer.includes('64 bytes from 127.0.0.1'), 'Ping must output packets');
  assert(buffer.includes('SHELL_STILL_ALIVE'), 'Shell must remain alive and responsive after Ctrl+C interrupt');

  console.log('\nINTERACTIVE PYTHON AND CTRL+C TESTS PASSED! ✓✓✓');
  process.exit(0);
}

testInteractive().catch(err => {
  console.error('Interactive Test Failed:', err);
  process.exit(1);
});
