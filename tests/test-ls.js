const { execSync } = require('child_process');

console.log('=== LS in /mnt/c/Users/mothi ===');
try {
  const out1 = execSync('wsl.exe -d Ubuntu --cd "/mnt/c/Users/mothi" ls --color=always', { timeout: 4000 }).toString();
  console.log('Raw output with ANSI escapes:');
  console.log(JSON.stringify(out1.slice(0, 400)));
} catch (e) {
  console.error(e.message);
}

console.log('\n=== LS in ~ (/home/dpmothikari) ===');
try {
  const out2 = execSync('wsl.exe -d Ubuntu --cd ~ ls --color=always', { timeout: 4000 }).toString();
  console.log('Raw output with ANSI escapes:');
  console.log(JSON.stringify(out2.slice(0, 400)));
} catch (e) {
  console.error(e.message);
}

console.log('\n=== Check dircolors other-writable (ow) setting ===');
try {
  const dc = execSync('wsl.exe -d Ubuntu dircolors -p', { timeout: 4000 }).toString();
  const owLine = dc.split('\n').find(l => l.startsWith('OTHER_WRITABLE') || l.startsWith('STICKY_OTHER_WRITABLE'));
  console.log('Default dircolors setting for OTHER_WRITABLE:', owLine);
} catch (e) {
  console.error(e.message);
}
