const { execSync } = require('child_process');

console.log('--- TEST 1: With process.env (as before) ---');
try {
  const out1 = execSync('wsl.exe -d Ubuntu --cd ~ bash -c "echo HOME=$HOME; echo USER=$USER; echo SHELL=$SHELL"', {
    env: process.env
  }).toString();
  console.log(out1);
} catch (e) {
  console.error(e);
}

console.log('--- TEST 2: With Windows HOME/USER/SHELL removed ---');
const cleanEnv = { ...process.env };
delete cleanEnv.HOME;
delete cleanEnv.USER;
delete cleanEnv.SHELL;
cleanEnv.WSLENV = ''; // prevent leakage of Windows variables

try {
  const out2 = execSync('wsl.exe -d Ubuntu --cd ~ bash -c "echo HOME=$HOME; echo USER=$USER; echo SHELL=$SHELL"', {
    env: cleanEnv
  }).toString();
  console.log(out2);
} catch (e) {
  console.error(e);
}
