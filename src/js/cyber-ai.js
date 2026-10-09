// CYBER AI INTELLIGENCE ENGINE (Diagnostics, Risk Analyzer, Translator, Explainer, NL Builder)

class CyberAI {
  constructor() {
    this.history = [];
    this.riskRules = this.initRiskRules();
    this.translations = this.initTranslations();
    this.explanations = this.initExplanations();
    this.errorPatterns = this.initErrorPatterns();
  }

  // ==================================================
  // 1. COMMAND RISK ANALYZER
  // ==================================================
  initRiskRules() {
    return [
      {
        pattern: /\b(rm\s+-[rf]{1,2}\s+(\/|~|\*|\$HOME)|del\s+\/[sfq]\s+c:\\|format\s+[a-z]:|mkfs|dd\s+if=.*of=\/dev\/(sd[a-z]|nvme)|diskpart|reg\s+delete\s+hklm)/i,
        level: 'CRITICAL',
        reason: 'Permanent destructive system-level data deletion or disk destruction.'
      },
      {
        pattern: /\b(rm\s+-[rf]{1,2}|del\s+\/[sfq]|Remove-Item\s+.*-(Recurse|Force)|rd\s+\/s\s+\/q|rmdir\s+\/s\s+\/q|kill\s+-9\s+1\b|chmod\s+-R\s+777\s+\/)/i,
        level: 'HIGH',
        reason: 'Recursive deletion of files/directories or terminating essential system services.'
      },
      {
        pattern: /\b(git\s+reset\s+--hard|git\s+clean\s+-[xfd]{1,3}|pkill\s+-9|taskkill\s+\/f|DROP\s+DATABASE|DROP\s+TABLE|TRUNCATE\s+TABLE|npm\s+publish\s+--force)/i,
        level: 'MEDIUM',
        reason: 'Potentially irreversible loss of uncommitted work, database tables, or processes.'
      }
    ];
  }

  analyzeRisk(commandStr) {
    const cmd = (commandStr || '').trim();
    if (!cmd) return { level: 'LOW', reason: 'Safe command', target: '' };

    for (const rule of this.riskRules) {
      if (rule.pattern.test(cmd)) {
        // Extract potential target
        const parts = cmd.split(/\s+/);
        const target = parts.slice(2).join(' ') || parts[1] || '';
        return {
          level: rule.level,
          reason: rule.reason,
          target: target,
          command: cmd
        };
      }
    }

    return {
      level: 'LOW',
      reason: 'Standard command execution without elevated destructive flags.',
      target: '',
      command: cmd
    };
  }

  // ==================================================
  // 2. ERROR DIAGNOSTIC ENGINE
  // ==================================================
  initErrorPatterns() {
    return [
      {
        regex: /ModuleNotFoundError:\s*No module named ['"]([^'"]+)['"]/i,
        title: 'Python Missing Module',
        cause: (m) => `The Python module '${m[1]}' is not installed in the active environment.`,
        suggest: (m) => `pip install ${m[1]}`,
        explain: (m) => `Python encountered an import statement for '${m[1]}', but could not find the package in site-packages.`
      },
      {
        regex: /ImportError:\s*cannot import name ['"]([^'"]+)['"]/i,
        title: 'Python Circular or Invalid Import',
        cause: (m) => `Failed to import '${m[1]}'. This usually indicates a circular import or mismatched package version.`,
        suggest: (m) => `pip install --upgrade ${m[1]}`,
        explain: (m) => `The requested symbol '${m[1]}' does not exist in the imported module or there is a cyclic dependency.`
      },
      {
        regex: /EADDRINUSE.*:([0-9]{2,5})/i,
        title: 'Port Already In Use (EADDRINUSE)',
        cause: (m) => `Port ${m[1]} is already occupied by another running server or process.`,
        suggest: (m) => `Get-Process -Id (Get-NetTCPConnection -LocalPort ${m[1]}).OwningProcess | Stop-Process -Force`,
        explain: (m) => `A server attempted to bind to port ${m[1]}, but another program has already bound to it.`
      },
      {
        regex: /command not found:\s*([a-zA-Z0-9_-]+)/i,
        title: 'Executable Not Found',
        cause: (m) => `The command '${m[1]}' is not installed or not in system PATH.`,
        suggest: (m) => `where ${m[1]}`,
        explain: (m) => `The current shell cannot locate an executable named '${m[1]}' in any directory listed in the PATH environment variable.`
      },
      {
        regex: /'([^']+)' is not recognized as an internal or external command/i,
        title: 'Windows Executable Not Found',
        cause: (m) => `'${m[1]}' is not recognized in Windows PATH.`,
        suggest: (m) => `Get-Command ${m[1]} -ErrorAction SilentlyContinue`,
        explain: (m) => `Windows Command Prompt or PowerShell could not find '${m[1]}.exe', '.cmd', or '.bat' in your PATH environment.`
      },
      {
        regex: /fatal:\s*not a git repository/i,
        title: 'Not a Git Repository',
        cause: () => `The current working directory does not contain a .git directory.`,
        suggest: () => `git init`,
        explain: () => `Git commands require an initialized git repository in the current directory or a parent directory.`
      },
      {
        regex: /Permission denied/i,
        title: 'Access / Permission Denied',
        cause: () => `The current process lacks read/write/execute permissions on the target resource.`,
        suggest: () => `ls -la`,
        explain: () => `File system permissions prevented the operation. Check ownership or file modes.`
      },
      {
        regex: /npm ERR!\s*missing script:\s*([a-zA-Z0-9_-]+)/i,
        title: 'npm Script Not Defined',
        cause: (m) => `package.json does not contain a script named "${m[1]}".`,
        suggest: () => `cat package.json`,
        explain: (m) => `You ran 'npm run ${m[1]}', but scripts in package.json has no matching key.`
      }
    ];
  }

  diagnoseOutput(terminalText) {
    if (!terminalText) return null;
    const clean = terminalText.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');

    for (const item of this.errorPatterns) {
      const match = clean.match(item.regex);
      if (match) {
        return {
          title: item.title,
          cause: item.cause(match),
          solutionCmd: item.suggest(match),
          explanation: item.explain(match),
          rawMatch: match[0]
        };
      }
    }

    return null;
  }

  // ==================================================
  // 3. UNIVERSAL COMMAND TRANSLATOR
  // ==================================================
  initTranslations() {
    return [
      {
        name: 'List files and directories',
        bash: 'ls -la',
        powershell: 'Get-ChildItem -Force',
        cmd: 'dir /a',
        gitbash: 'ls -la'
      },
      {
        name: 'Print current working directory',
        bash: 'pwd',
        powershell: 'Get-Location',
        cmd: 'cd',
        gitbash: 'pwd'
      },
      {
        name: 'Create directory recursively',
        bash: 'mkdir -p my_folder/sub',
        powershell: 'New-Item -ItemType Directory -Path my_folder/sub -Force',
        cmd: 'mkdir my_folder\\sub',
        gitbash: 'mkdir -p my_folder/sub'
      },
      {
        name: 'Delete directory recursively',
        bash: 'rm -rf my_folder',
        powershell: 'Remove-Item -Recurse -Force my_folder',
        cmd: 'rmdir /s /q my_folder',
        gitbash: 'rm -rf my_folder'
      },
      {
        name: 'Copy directory recursively',
        bash: 'cp -r src_dir dest_dir',
        powershell: 'Copy-Item -Recurse -Force src_dir dest_dir',
        cmd: 'xcopy /e /i /y src_dir dest_dir',
        gitbash: 'cp -r src_dir dest_dir'
      },
      {
        name: 'Move / rename file or folder',
        bash: 'mv old_name new_name',
        powershell: 'Move-Item old_name new_name',
        cmd: 'move old_name new_name',
        gitbash: 'mv old_name new_name'
      },
      {
        name: 'Display file contents',
        bash: 'cat filename.txt',
        powershell: 'Get-Content filename.txt',
        cmd: 'type filename.txt',
        gitbash: 'cat filename.txt'
      },
      {
        name: 'Search text inside files (grep)',
        bash: 'grep -rn "search_term" .',
        powershell: 'Select-String -Pattern "search_term" -Path .\\* -SimpleMatch',
        cmd: 'findstr /s /i "search_term" *.*',
        gitbash: 'grep -rn "search_term" .'
      },
      {
        name: 'Find files by pattern',
        bash: 'find . -name "*.py"',
        powershell: 'Get-ChildItem -Recurse -Filter "*.py"',
        cmd: 'dir /s /b *.py',
        gitbash: 'find . -name "*.py"'
      },
      {
        name: 'List active processes',
        bash: 'ps aux',
        powershell: 'Get-Process',
        cmd: 'tasklist',
        gitbash: 'ps aux'
      },
      {
        name: 'Terminate process by PID',
        bash: 'kill -9 <PID>',
        powershell: 'Stop-Process -Id <PID> -Force',
        cmd: 'taskkill /f /pid <PID>',
        gitbash: 'kill -9 <PID>'
      },
      {
        name: 'System hardware and OS information',
        bash: 'uname -a',
        powershell: 'Get-ComputerInfo | Select-Object CsName, OsName, OsVersion',
        cmd: 'systeminfo',
        gitbash: 'uname -a'
      },
      {
        name: 'Show network adapter IP addresses',
        bash: 'ip a',
        powershell: 'Get-NetIPAddress -AddressFamily IPv4',
        cmd: 'ipconfig',
        gitbash: 'ip a'
      },
      {
        name: 'Ping network host 4 times',
        bash: 'ping -c 4 google.com',
        powershell: 'Test-Connection -TargetName google.com -Count 4',
        cmd: 'ping -n 4 google.com',
        gitbash: 'ping -c 4 google.com'
      },
      {
        name: 'Clear terminal screen',
        bash: 'clear',
        powershell: 'Clear-Host',
        cmd: 'cls',
        gitbash: 'clear'
      }
    ];
  }

  translateCommand(inputCmd, sourceShell = 'bash') {
    const trimmed = (inputCmd || '').trim();
    if (!trimmed) return null;

    // Direct match against known semantic dictionary
    for (const item of this.translations) {
      const match = [item.bash, item.powershell, item.cmd, item.gitbash].some(v => 
        v.toLowerCase().startsWith(trimmed.toLowerCase()) || trimmed.toLowerCase().startsWith(v.toLowerCase().split(' ')[0])
      );
      if (match) {
        return {
          concept: item.name,
          bash: item.bash,
          powershell: item.powershell,
          cmd: item.cmd,
          gitbash: item.gitbash
        };
      }
    }

    // Heuristic translation patterns
    if (/^ls\b/i.test(trimmed)) {
      return {
        concept: 'List directory',
        bash: trimmed,
        powershell: trimmed.replace(/^ls\b/i, 'Get-ChildItem'),
        cmd: 'dir',
        gitbash: trimmed
      };
    }
    if (/^cat\b/i.test(trimmed)) {
      const arg = trimmed.slice(4).trim();
      return {
        concept: 'Display content',
        bash: `cat ${arg}`,
        powershell: `Get-Content ${arg}`,
        cmd: `type ${arg}`,
        gitbash: `cat ${arg}`
      };
    }
    if (/^pwd\b/i.test(trimmed)) {
      return {
        concept: 'Current directory',
        bash: 'pwd',
        powershell: 'Get-Location',
        cmd: 'cd',
        gitbash: 'pwd'
      };
    }

    return null;
  }

  // ==================================================
  // 4. COMMAND EXPLAINER
  // ==================================================
  initExplanations() {
    return {
      'git': {
        name: 'Git Version Control System',
        subcommands: {
          'status': 'Shows the working tree status (staged, unstaged, untracked changes).',
          'diff': 'Displays differences between working directory and commit/stage.',
          'log': 'Shows the commit history log.',
          'add': 'Adds file contents to the staging area.',
          'commit': 'Records changes to the repository with a commit message.',
          'push': 'Updates remote references along with associated objects.',
          'pull': 'Fetches from and integrates with another repository or a local branch.',
          'checkout': 'Switches branches or restores working tree files.',
          'reset': 'Resets current HEAD to the specified state.'
        },
        flags: {
          '-m': 'Specifies the commit message inline.',
          '-a': 'Automatically stages all tracked, modified, and deleted files.',
          '-b': 'Creates and checks out a new branch.',
          '--hard': 'Resets the index and working tree. All uncommitted changes will be deleted!',
          '--soft': 'Resets HEAD only, keeping your changes staged in the index.',
          '--oneline': 'Displays commit logs in a concise one-line format with abbreviated hashes.'
        }
      },
      'npm': {
        name: 'Node Package Manager',
        subcommands: {
          'install': 'Installs dependencies defined in package.json or adds a package.',
          'run': 'Executes an arbitrary package script specified in package.json scripts.',
          'start': 'Runs the predefined start script.',
          'test': 'Runs the predefined test script.',
          'build': 'Runs the build script for production compilation.'
        },
        flags: {
          '-D': 'Saves package to devDependencies.',
          '--save-dev': 'Saves package to devDependencies.',
          '-g': 'Installs the package globally on your system.',
          '--force': 'Forces installation even if dependency conflicts exist.'
        }
      },
      'docker': {
        name: 'Docker Container Runtime',
        subcommands: {
          'ps': 'Lists containers (currently running).',
          'run': 'Runs a command in a new container.',
          'build': 'Builds an image from a Dockerfile.',
          'compose': 'Defines and runs multi-container Docker applications.',
          'stop': 'Stops one or more running containers.'
        },
        flags: {
          '-a': 'Shows all containers (default shows just running).',
          '-d': 'Runs container in background and prints container ID (detached mode).',
          '-p': 'Publishes container port(s) to the host.',
          '-v': 'Binds a volume mount.'
        }
      }
    };
  }

  explainCommand(cmdString) {
    const raw = (cmdString || '').trim();
    if (!raw) return null;

    const parts = raw.split(/\s+/);
    const exe = parts[0].toLowerCase();
    const sub = parts[1]?.toLowerCase();

    const info = this.explanations[exe];
    const breakdown = [];

    breakdown.push({ token: parts[0], role: 'Executable', desc: info ? info.name : `Command: ${parts[0]}` });

    if (info && sub && info.subcommands && info.subcommands[sub]) {
      breakdown.push({ token: parts[1], role: 'Subcommand', desc: info.subcommands[sub] });
    }

    for (let i = 1; i < parts.length; i++) {
      const token = parts[i];
      if (token.startsWith('-')) {
        let flagDesc = 'Flag / Option';
        if (info && info.flags && info.flags[token]) {
          flagDesc = info.flags[token];
        } else if (token === '-rf' || token === '-r') {
          flagDesc = 'Recursive operation across directories';
        } else if (token === '-v' || token === '--verbose') {
          flagDesc = 'Verbose mode: outputs detailed diagnostic steps';
        }
        breakdown.push({ token, role: 'Flag', desc: flagDesc });
      } else if (i > (info && sub && info.subcommands[sub] ? 1 : 0)) {
        breakdown.push({ token, role: 'Argument / Target', desc: `Target path, expression, or identifier` });
      }
    }

    return {
      command: raw,
      summary: info ? info.name : `Standard shell command`,
      breakdown
    };
  }

  // ==================================================
  // 5. NATURAL LANGUAGE COMMAND BUILDER
  // ==================================================
  buildFromNaturalLanguage(nlPrompt, targetShell = 'powershell') {
    const prompt = (nlPrompt || '').toLowerCase().trim();
    const isWin = targetShell === 'powershell' || targetShell === 'cmd';
    const isPwsh = targetShell === 'powershell';
    const isBash = targetShell === 'wsl' || targetShell === 'gitbash';

    // Find files
    if (prompt.includes('find') && (prompt.includes('python') || prompt.includes('.py'))) {
      if (isBash) return { cmd: 'find . -name "*.py"', intent: 'Find all Python files in current directory' };
      if (isPwsh) return { cmd: 'Get-ChildItem -Recurse -Filter "*.py"', intent: 'Recursively locate Python files' };
      return { cmd: 'dir /s /b *.py', intent: 'Find Python files' };
    }

    // Kill port
    const portMatch = prompt.match(/port\s*([0-9]{2,5})/i);
    if (prompt.includes('kill') && portMatch) {
      const p = portMatch[1];
      if (isBash) return { cmd: `fuser -k ${p}/tcp`, intent: `Kill process on port ${p}` };
      if (isPwsh) return { cmd: `Stop-Process -Id (Get-NetTCPConnection -LocalPort ${p}).OwningProcess -Force`, intent: `Kill process on port ${p}` };
      return { cmd: `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${p}') do taskkill /f /pid %a`, intent: `Kill process on port ${p}` };
    }

    // Git branch
    if (prompt.includes('branch') && (prompt.includes('create') || prompt.includes('new'))) {
      const parts = prompt.split(/\s+/);
      const branchName = parts[parts.length - 1] !== 'branch' ? parts[parts.length - 1] : 'feature-branch';
      return { cmd: `git checkout -b ${branchName}`, intent: `Create and checkout new Git branch '${branchName}'` };
    }

    // Disk space
    if (prompt.includes('disk') || prompt.includes('storage') || prompt.includes('space')) {
      if (isBash) return { cmd: 'df -h', intent: 'Display filesystem disk usage in human readable format' };
      if (isPwsh) return { cmd: 'Get-PSDrive -PSProvider FileSystem', intent: 'List filesystem drives and free space' };
      return { cmd: 'wmic logicaldisk get caption, freespace, size', intent: 'Get drive capacities' };
    }

    // Top memory processes
    if (prompt.includes('process') || prompt.includes('memory') || prompt.includes('cpu')) {
      if (isBash) return { cmd: 'ps aux --sort=-%mem | head -n 10', intent: 'List top 10 processes consuming memory' };
      if (isPwsh) return { cmd: 'Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10 Id, ProcessName, @{N="RAM (MB)";E={[math]::Round($_.WorkingSet64/1MB)}}', intent: 'List top 10 memory-heavy processes' };
      return { cmd: 'tasklist', intent: 'List running tasks' };
    }

    // Network IP
    if (prompt.includes('ip') || prompt.includes('network') || prompt.includes('adapter')) {
      if (isBash) return { cmd: 'ip a', intent: 'Show all network interface IP addresses' };
      if (isPwsh) return { cmd: 'Get-NetIPAddress -AddressFamily IPv4 | Select-Object IPAddress, InterfaceAlias', intent: 'Show local IPv4 addresses' };
      return { cmd: 'ipconfig', intent: 'Show IP configurations' };
    }

    // Default fallback
    return {
      cmd: isBash ? `echo "${prompt}"` : `Write-Output "${prompt}"`,
      intent: `Generated fallback expression for ${targetShell}`
    };
  }
}

window.CyberAI = CyberAI;
