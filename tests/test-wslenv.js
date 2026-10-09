const { execSync } = require('child_process');

const envWithWslEnv = {
  ...process.env,
  TEST_VAR: 'CYBERTERM_VAL',
  WSLENV: 'TEST_VAR'
};

const res = execSync('wsl.exe -d Ubuntu --cd ~ printenv TEST_VAR', { env: envWithWslEnv }).toString();
console.log('Result with WSLENV:', res.trim());
