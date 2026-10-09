const pty = require('node-pty');
const assert = require('assert');

console.log('Spawning WSL in ConPTY via node-pty...');

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

function runCmd(cmd, delay = 600) {
  return new Promise((resolve) => {
    setTimeout(() => {
      proc.write(cmd + '\n');
      setTimeout(resolve, delay);
    }, 200);
  });
}

async function runTests() {
  // Wait for initial prompt
  await new Promise(r => setTimeout(r, 1200));

  console.log('Testing 1: pwd (initial directory)...');
  await runCmd('pwd');

  console.log('Testing 2: whoami & ids...');
  await runCmd('whoami; id -u; echo HOME=$HOME; echo SHELL=$SHELL');

  console.log('Testing 3: Persistence & env...');
  await runCmd('export CYBERTERM_TEST=12345; echo VAL=$CYBERTERM_TEST');
  await runCmd('cd /tmp; pwd; echo VAL=$CYBERTERM_TEST; cd ~; pwd');

  console.log('Testing 4: Exit codes...');
  await runCmd('true; echo EXIT_TRUE=$?; false; echo EXIT_FALSE=$?');

  console.log('Testing 5: Stdout & Stderr...');
  await runCmd('echo "STDOUT_OK"; echo "STDERR_OK" >&2');

  console.log('Testing 6: ANSI Colors & Unicode...');
  await runCmd("printf '\\033[31mRED_COLOR\\033[0m\\n'; echo 'Hello 世界'; echo 'CyberTerm 🚀'");
  await runCmd("printf '┌──────────────┐\\n│    UBUNTU    │\\n└──────────────┘\\n'");

  console.log('Testing 7: Python & Git...');
  await runCmd('python3 -c \'print("PYTHON3_OK")\'; git --version');

  console.log('Testing 8: Filesystem write/read/remove...');
  await runCmd('mkdir -p ~/cyberterm-test && cd ~/cyberterm-test && echo "CyberTerm WSL test" > test.txt && cat test.txt && rm test.txt && cd ~ && rmdir ~/cyberterm-test && echo "FS_TEST_OK"');

  console.log('Testing 9: Windows mount /mnt/c...');
  await runCmd('ls -d /mnt/c/Users');

  await new Promise(r => setTimeout(r, 1000));
  proc.kill();

  console.log('\n================ OUTPUT VERIFICATION ================');
  assert(buffer.includes('/home/dpmothikari'), 'Must be in /home/dpmothikari by default');
  assert(buffer.includes('dpmothikari'), 'Username must be dpmothikari');
  assert(buffer.includes('HOME=/home/dpmothikari'), 'HOME must be /home/dpmothikari');
  assert(buffer.includes('SHELL=/bin/bash'), 'SHELL must be /bin/bash');
  assert(buffer.includes('VAL=12345'), 'Shell environment variable must persist');
  assert(buffer.includes('/tmp'), 'cd /tmp must work');
  assert(buffer.includes('EXIT_TRUE=0'), 'Exit code 0 for true must work');
  assert(buffer.includes('EXIT_FALSE=1'), 'Exit code 1 for false must work');
  assert(buffer.includes('STDOUT_OK'), 'Stdout must work');
  assert(buffer.includes('STDERR_OK'), 'Stderr must work');
  assert(buffer.includes('RED_COLOR'), 'ANSI color must work');
  assert(buffer.includes('Hello 世界'), 'Unicode must work');
  assert(buffer.includes('CyberTerm 🚀'), 'Emoji must work');
  assert(buffer.includes('UBUNTU'), 'Box drawing must work');
  assert(buffer.includes('PYTHON3_OK'), 'Python3 in WSL must work');
  assert(buffer.includes('FS_TEST_OK'), 'Linux filesystem operations must succeed');
  assert(buffer.includes('/mnt/c/Users'), 'Windows mount /mnt/c must work');

  console.log('\nALL CONPTY WSL TESTS PASSED CLEANLY! ✓✓✓');
  process.exit(0);
}

runTests().catch(err => {
  console.log('BUFFER RECEIVED:\n', JSON.stringify(buffer));
  console.error('Test Failed:', err);
  process.exit(1);
});
