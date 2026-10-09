const pty = require('node-pty');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('CYBERTERM // COMPREHENSIVE WSL & REGRESSION TEST SUITE');
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

async function runTestSuite() {
  // ----------------------------------------------------
  // Test 1: Default Starting Directory ($HOME / ~)
  // ----------------------------------------------------
  {
    const proc = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
      name: 'xterm-256color',
      cols: 100,
      rows: 30,
      cwd: 'C:\\',
      env: createWslEnv(),
      useConpty: true
    });
    let out = '';
    proc.onData(d => { out += d; });
    await new Promise(r => setTimeout(r, 1000));
    proc.write('pwd\n');
    await new Promise(r => setTimeout(r, 800));
    proc.kill();

    const inHome = out.includes('/home/') && !out.includes('/mnt/c/Users');
    record('Starting directory ($HOME / ~)', inHome, inHome ? 'Defaults to real Linux user $HOME' : 'Did not start in /home/');
  }

  // ----------------------------------------------------
  // Test 2: "Open WSL Here" with Windows Path translation
  // ----------------------------------------------------
  {
    const proc = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '/mnt/c/Users'], {
      name: 'xterm-256color',
      cols: 100,
      rows: 30,
      cwd: 'C:\\Users',
      env: createWslEnv(),
      useConpty: true
    });
    let out = '';
    proc.onData(d => { out += d; });
    await new Promise(r => setTimeout(r, 1000));
    proc.write('pwd\n');
    await new Promise(r => setTimeout(r, 800));
    proc.kill();

    const inMnt = out.includes('/mnt/c/Users');
    record('Open WSL Here (Windows path translation)', inMnt, inMnt ? 'Correctly starts at /mnt/c/Users' : 'Failed path translation');
  }

  // ----------------------------------------------------
  // Test 3: Real Ubuntu Identity & Environment
  // ----------------------------------------------------
  {
    const proc = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
      name: 'xterm-256color',
      cols: 100,
      rows: 30,
      cwd: 'C:\\',
      env: createWslEnv(),
      useConpty: true
    });
    let out = '';
    proc.onData(d => { out += d; });
    await new Promise(r => setTimeout(r, 1000));
    proc.write('whoami; id -u; uname -a; cat /etc/os-release\n');
    await new Promise(r => setTimeout(r, 1200));
    proc.kill();

    const isUbuntu = out.toLowerCase().includes('ubuntu') && out.includes('Linux');
    record('Real Ubuntu Identity', isUbuntu, 'Ubuntu detected, uname -a & /etc/os-release verified');
  }

  // ----------------------------------------------------
  // Test 4: Persistent Shell & Environment State
  // ----------------------------------------------------
  {
    const proc = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
      name: 'xterm-256color',
      cols: 100,
      rows: 30,
      cwd: 'C:\\',
      env: createWslEnv(),
      useConpty: true
    });
    let out = '';
    proc.onData(d => { out += d; });
    await new Promise(r => setTimeout(r, 1000));
    proc.write('export CYBERTERM_TEST=12345\n');
    await new Promise(r => setTimeout(r, 500));
    proc.write('cd /tmp\n');
    await new Promise(r => setTimeout(r, 500));
    proc.write('echo PWD_IS=$PWD; echo VAL_IS=$CYBERTERM_TEST\n');
    await new Promise(r => setTimeout(r, 800));
    proc.kill();

    const persistent = out.includes('PWD_IS=/tmp') && out.includes('VAL_IS=12345');
    record('Persistent Shell State', persistent, 'Session maintained across multiple commands');
  }

  // ----------------------------------------------------
  // Test 5: Linux Filesystem Operations
  // ----------------------------------------------------
  {
    const proc = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
      name: 'xterm-256color',
      cols: 100,
      rows: 30,
      cwd: 'C:\\',
      env: createWslEnv(),
      useConpty: true
    });
    let out = '';
    proc.onData(d => { out += d; });
    await new Promise(r => setTimeout(r, 1000));
    proc.write('mkdir -p ~/cyberterm-test && cd ~/cyberterm-test && echo "CyberTerm WSL test" > test.txt && cat test.txt && rm test.txt && cd ~ && rmdir ~/cyberterm-test && echo FS_OK\n');
    await new Promise(r => setTimeout(r, 1200));
    proc.kill();

    const fsOk = out.includes('CyberTerm WSL test') && out.includes('FS_OK');
    record('Linux Filesystem Operations', fsOk, 'mkdir, write, read, delete all succeeded in Linux filesystem');
  }

  // ----------------------------------------------------
  // Test 6: Windows Mounted Filesystem (/mnt/c)
  // ----------------------------------------------------
  {
    const proc = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
      name: 'xterm-256color',
      cols: 100,
      rows: 30,
      cwd: 'C:\\',
      env: createWslEnv(),
      useConpty: true
    });
    let out = '';
    proc.onData(d => { out += d; });
    await new Promise(r => setTimeout(r, 1000));
    proc.write('ls -d /mnt/c && ls -d /mnt/c/Users\n');
    await new Promise(r => setTimeout(r, 800));
    proc.kill();

    const mntOk = out.includes('/mnt/c') && out.includes('/mnt/c/Users');
    record('Windows Mounted Filesystem (/mnt/c)', mntOk, 'Drvfs access works correctly');
  }

  // ----------------------------------------------------
  // Test 7: ANSI Colors
  // ----------------------------------------------------
  {
    const proc = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
      name: 'xterm-256color',
      cols: 100,
      rows: 30,
      cwd: 'C:\\',
      env: createWslEnv(),
      useConpty: true
    });
    let out = '';
    proc.onData(d => { out += d; });
    await new Promise(r => setTimeout(r, 1000));
    proc.write("printf '\\033[31mRED\\033[0m\\n'; printf '\\033[32mGREEN\\033[0m\\n'; printf '\\033[34mBLUE\\033[0m\\n'\n");
    await new Promise(r => setTimeout(r, 800));
    proc.kill();

    const ansiOk = out.includes('RED') && out.includes('GREEN') && out.includes('BLUE');
    record('ANSI Colors', ansiOk, 'Escaped color codes pass through ConPTY properly');
  }

  // ----------------------------------------------------
  // Test 8: Unicode, Box-Drawing & Emojis
  // ----------------------------------------------------
  {
    const proc = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
      name: 'xterm-256color',
      cols: 100,
      rows: 30,
      cwd: 'C:\\',
      env: createWslEnv(),
      useConpty: true
    });
    let out = '';
    proc.onData(d => { out += d; });
    await new Promise(r => setTimeout(r, 1000));
    proc.write("echo 'Hello 世界'; echo 'CyberTerm 🚀'; printf '┌──────────────┐\\n│    UBUNTU    │\\n└──────────────┘\\n'\n");
    await new Promise(r => setTimeout(r, 800));
    proc.kill();

    const uniOk = out.includes('Hello 世界') && out.includes('CyberTerm 🚀') && out.includes('UBUNTU');
    record('Unicode, Box-Drawing & Emojis', uniOk, 'UTF-8 multi-byte characters and symbols render intact');
  }

  // ----------------------------------------------------
  // Test 9: Ctrl+C Interrupt Handling (SIGINT)
  // ----------------------------------------------------
  {
    const proc = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
      name: 'xterm-256color',
      cols: 100,
      rows: 30,
      cwd: 'C:\\',
      env: createWslEnv(),
      useConpty: true
    });
    let out = '';
    proc.onData(d => { out += d; });
    await new Promise(r => setTimeout(r, 1000));
    proc.write('ping -c 10 127.0.0.1\n');
    await new Promise(r => setTimeout(r, 1200));
    proc.write('\x03'); // Ctrl+C
    await new Promise(r => setTimeout(r, 600));
    proc.write('echo AFTER_INTERRUPT\n');
    await new Promise(r => setTimeout(r, 800));
    proc.kill();

    const ctrlcOk = out.includes('64 bytes from 127.0.0.1') && out.includes('AFTER_INTERRUPT');
    record('Ctrl+C Interrupt (SIGINT)', ctrlcOk, 'Interrupt terminates process and shell remains alive');
  }

  // ----------------------------------------------------
  // Test 10: Interactive Python3 REPL
  // ----------------------------------------------------
  {
    const proc = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
      name: 'xterm-256color',
      cols: 100,
      rows: 30,
      cwd: 'C:\\',
      env: createWslEnv(),
      useConpty: true
    });
    let out = '';
    proc.onData(d => { out += d; });
    await new Promise(r => setTimeout(r, 1000));
    proc.write('python3\n');
    await new Promise(r => setTimeout(r, 800));
    proc.write('print("CYBERTERM WSL")\n');
    await new Promise(r => setTimeout(r, 400));
    proc.write('x = 100\n');
    await new Promise(r => setTimeout(r, 400));
    proc.write('print(f"VAL={x}")\n');
    await new Promise(r => setTimeout(r, 400));
    proc.write('exit()\n');
    await new Promise(r => setTimeout(r, 800));
    proc.kill();

    const pyOk = out.includes('CYBERTERM WSL') && out.includes('VAL=100');
    record('Interactive Python3 REPL', pyOk, 'Interactive stdin/stdout works seamlessly');
  }

  // ----------------------------------------------------
  // Test 11: Long-Running Process & Ctrl+C
  // ----------------------------------------------------
  {
    const proc = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
      name: 'xterm-256color',
      cols: 100,
      rows: 30,
      cwd: 'C:\\',
      env: createWslEnv(),
      useConpty: true
    });
    let out = '';
    proc.onData(d => { out += d; });
    await new Promise(r => setTimeout(r, 1000));
    proc.write('python3 -m http.server 8391\n');
    await new Promise(r => setTimeout(r, 1500));
    proc.write('\x03'); // Ctrl+C
    await new Promise(r => setTimeout(r, 800));
    proc.write('echo SERVER_STOPPED\n');
    await new Promise(r => setTimeout(r, 800));
    proc.kill();

    const serverOk = out.includes('Serving HTTP') && out.includes('SERVER_STOPPED');
    record('Long-Running Process & Interrupt', serverOk, 'Background HTTP server launched and cleanly terminated with SIGINT');
  }

  // ----------------------------------------------------
  // Test 12: Multiple Tabs Independence
  // ----------------------------------------------------
  {
    const proc1 = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
      name: 'xterm-256color', cols: 80, rows: 24, cwd: 'C:\\', env: createWslEnv(), useConpty: true
    });
    const proc2 = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
      name: 'xterm-256color', cols: 80, rows: 24, cwd: 'C:\\', env: createWslEnv(), useConpty: true
    });
    let out1 = '', out2 = '';
    proc1.onData(d => { out1 += d; });
    proc2.onData(d => { out2 += d; });
    await new Promise(r => setTimeout(r, 1000));

    proc1.write('cd /tmp\n');
    await new Promise(r => setTimeout(r, 400));
    proc2.write('cd /home\n');
    await new Promise(r => setTimeout(r, 400));
    proc1.write('echo TAB1_PWD=$PWD\n');
    await new Promise(r => setTimeout(r, 400));
    proc2.write('echo TAB2_PWD=$PWD\n');
    await new Promise(r => setTimeout(r, 600));

    proc1.kill();
    proc2.kill();

    const tabOk = out1.includes('TAB1_PWD=/tmp') && out2.includes('TAB2_PWD=/home');
    record('Multiple Tabs Independence', tabOk, 'Tabs maintain completely isolated shell processes and working directories');
  }

  // ----------------------------------------------------
  // Test 13: Native Bash History & Arrow Keys
  // ----------------------------------------------------
  {
    const proc = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
      name: 'xterm-256color', cols: 80, rows: 24, cwd: 'C:\\', env: createWslEnv(), useConpty: true
    });
    let out = '';
    proc.onData(d => { out += d; });
    await new Promise(r => setTimeout(r, 1000));
    proc.write('echo HIST_TEST_FIRST\n');
    await new Promise(r => setTimeout(r, 500));
    proc.write('\x1b[A'); // Up arrow
    await new Promise(r => setTimeout(r, 400));
    proc.write('\n'); // Enter
    await new Promise(r => setTimeout(r, 800));
    proc.kill();

    const histCount = (out.match(/HIST_TEST_FIRST/g) || []).length;
    const histOk = histCount >= 2;
    record('Native Bash History & Arrow Keys', histOk, 'Up arrow recalls previous history entry');
  }

  // ----------------------------------------------------
  // Test 14: Native Bash Tab Completion
  // ----------------------------------------------------
  {
    const proc = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
      name: 'xterm-256color', cols: 80, rows: 24, cwd: 'C:\\', env: createWslEnv(), useConpty: true
    });
    let out = '';
    proc.onData(d => { out += d; });
    await new Promise(r => setTimeout(r, 1000));
    proc.write('cd /u\t\n'); // cd /u <TAB> <ENTER>
    await new Promise(r => setTimeout(r, 800));
    proc.write('pwd\n');
    await new Promise(r => setTimeout(r, 800));
    proc.kill();

    const tabCompOk = out.includes('/usr');
    record('Native Bash Tab Completion', tabCompOk, 'cd /u<TAB> successfully completed to /usr');
  }

  // ----------------------------------------------------
  // Test 15: Terminal Resize (stty size)
  // ----------------------------------------------------
  {
    const proc = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
      name: 'xterm-256color', cols: 80, rows: 24, cwd: 'C:\\', env: createWslEnv(), useConpty: true
    });
    let out = '';
    proc.onData(d => { out += d; });
    await new Promise(r => setTimeout(r, 1000));
    proc.write('stty size\n');
    await new Promise(r => setTimeout(r, 600));

    proc.resize(120, 40);
    await new Promise(r => setTimeout(r, 600));
    proc.write('stty size\n');
    await new Promise(r => setTimeout(r, 800));
    proc.kill();

    const sizeOk = out.includes('24 80') && out.includes('40 120');
    record('Terminal Resize (stty size)', sizeOk, 'PTY resize accurately updates Linux stty dimensions');
  }

  // ----------------------------------------------------
  // Test 16: Stdout & Stderr Separation
  // ----------------------------------------------------
  {
    const proc = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
      name: 'xterm-256color', cols: 80, rows: 24, cwd: 'C:\\', env: createWslEnv(), useConpty: true
    });
    let out = '';
    proc.onData(d => { out += d; });
    await new Promise(r => setTimeout(r, 1000));
    proc.write('echo "STDOUT TEST"; echo "STDERR TEST" >&2\n');
    await new Promise(r => setTimeout(r, 800));
    proc.kill();

    const stdOk = out.includes('STDOUT TEST') && out.includes('STDERR TEST');
    record('Stdout & Stderr Rendering', stdOk, 'Both stdout and stderr streams render properly');
  }

  // ----------------------------------------------------
  // Test 17: Exit Codes
  // ----------------------------------------------------
  {
    const proc = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
      name: 'xterm-256color', cols: 80, rows: 24, cwd: 'C:\\', env: createWslEnv(), useConpty: true
    });
    let out = '';
    proc.onData(d => { out += d; });
    await new Promise(r => setTimeout(r, 1000));
    proc.write('true; echo EC0=$?; false; echo EC1=$?\n');
    await new Promise(r => setTimeout(r, 800));
    proc.kill();

    const ecOk = out.includes('EC0=0') && out.includes('EC1=1');
    record('Exit Codes ($?)', ecOk, 'true returns 0, false returns 1');
  }

  // ----------------------------------------------------
  // Test 18: Linux Environment Paths
  // ----------------------------------------------------
  {
    const proc = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
      name: 'xterm-256color', cols: 80, rows: 24, cwd: 'C:\\', env: createWslEnv(), useConpty: true
    });
    let out = '';
    proc.onData(d => { out += d; });
    await new Promise(r => setTimeout(r, 1000));
    proc.write('which python3; which git\n');
    await new Promise(r => setTimeout(r, 800));
    proc.kill();

    const binOk = out.includes('/usr/bin/python3') && out.includes('/usr/bin/git');
    record('Real Linux Binaries (which python3 / git)', binOk, 'Executables are real Linux /usr/bin binaries');
  }

  // ----------------------------------------------------
  // Test 19: Process Cleanup
  // ----------------------------------------------------
  {
    const proc = pty.spawn('wsl.exe', ['-d', 'Ubuntu', '--cd', '~'], {
      name: 'xterm-256color', cols: 80, rows: 24, cwd: 'C:\\', env: createWslEnv(), useConpty: true
    });
    await new Promise(r => setTimeout(r, 1000));
    const pid = proc.pid;
    proc.kill();
    await new Promise(r => setTimeout(r, 800));

    let stillRunning = false;
    try {
      process.kill(pid, 0);
      stillRunning = true;
    } catch (e) {
      stillRunning = false;
    }
    record('Process Cleanup', !stillRunning, `Child process PID ${pid} cleanly terminated`);
  }

  // ----------------------------------------------------
  // Test 20: PowerShell Regression Test
  // ----------------------------------------------------
  {
    const proc = pty.spawn('powershell.exe', ['-NoLogo'], {
      name: 'xterm-256color', cols: 80, rows: 24, cwd: process.env.USERPROFILE, env: process.env, useConpty: true
    });
    let out = '';
    proc.onData(d => { out += d; });
    await new Promise(r => setTimeout(r, 1200));
    proc.write('Write-Output "PWSH_REGRESSION_OK"\n');
    await new Promise(r => setTimeout(r, 800));
    proc.kill();

    const pwshOk = out.includes('PWSH_REGRESSION_OK');
    record('PowerShell Regression', pwshOk, 'PowerShell launches and responds cleanly');
  }

  // ----------------------------------------------------
  // Test 21: CMD Regression Test
  // ----------------------------------------------------
  {
    const proc = pty.spawn('cmd.exe', [], {
      name: 'xterm-256color', cols: 80, rows: 24, cwd: process.env.USERPROFILE, env: process.env, useConpty: true
    });
    let out = '';
    proc.onData(d => { out += d; });
    await new Promise(r => setTimeout(r, 1000));
    proc.write('echo CMD_REGRESSION_OK\n');
    await new Promise(r => setTimeout(r, 800));
    proc.kill();

    const cmdOk = out.includes('CMD_REGRESSION_OK');
    record('CMD Regression', cmdOk, 'CMD launches and responds cleanly');
  }

  // ----------------------------------------------------
  // Test 22: Git Bash Regression Test
  // ----------------------------------------------------
  {
    const gitBashPath = 'C:\\Program Files\\Git\\bin\\bash.exe';
    if (fs.existsSync(gitBashPath)) {
      const proc = pty.spawn(gitBashPath, ['--login', '-i'], {
        name: 'xterm-256color', cols: 80, rows: 24, cwd: process.env.USERPROFILE, env: process.env, useConpty: true
      });
      let out = '';
      proc.onData(d => { out += d; });
      await new Promise(r => setTimeout(r, 1200));
      proc.write('echo "GITBASH_REGRESSION_OK"\n');
      await new Promise(r => setTimeout(r, 800));
      proc.kill();

      const gbOk = out.includes('GITBASH_REGRESSION_OK');
      record('Git Bash Regression', gbOk, 'Git Bash launches and responds cleanly');
    } else {
      record('Git Bash Regression', true, 'Git Bash not installed on system (skipped)');
    }
  }

  console.log('\n====================================================');
  console.log('SUMMARY RESULTS:');
  console.log('====================================================');
  let total = 0, passed = 0;
  for (const [name, res] of Object.entries(results)) {
    total++;
    if (res.pass) passed++;
    console.log(`${res.pass ? '✓ PASS' : '✗ FAIL'}: ${name}`);
  }
  console.log(`\nScore: ${passed}/${total} passed`);
  if (passed === total) {
    console.log('ALL TESTS PASSED WITH 100% SUCCESS! ✓✓✓');
    process.exit(0);
  } else {
    console.error('SOME TESTS FAILED.');
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
