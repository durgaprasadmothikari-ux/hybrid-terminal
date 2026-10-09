const { execSync } = require('child_process');

try {
  const kernel = execSync('wsl.exe -d Ubuntu --cd ~ uname -r').toString().trim();
  const osRel = execSync('wsl.exe -d Ubuntu --cd ~ cat /etc/os-release').toString();
  const m = osRel.match(/PRETTY_NAME="?([^\n"]+)/);
  const distroName = m ? m[1] : 'Ubuntu';
  const user = execSync('wsl.exe -d Ubuntu --cd ~ printenv USER').toString().trim();
  const home = execSync('wsl.exe -d Ubuntu --cd ~ printenv HOME').toString().trim();
  const shell = execSync('wsl.exe -d Ubuntu --cd ~ printenv SHELL').toString().trim();

  console.log({
    kernel,
    distroName,
    user,
    home,
    shell
  });
} catch (e) {
  console.error(e.message);
}
