// CYBERTERM DEVELOPMENT COCKPIT (AI Copilot, Radar, Git, Files, Timeline, Monitor)

class CockpitController {
  constructor() {
    this.panel = document.getElementById('system-monitor-panel');
    this.activeTab = 'ai'; // 'ai' | 'radar' | 'git' | 'files' | 'timeline' | 'monitor'
    this.radarInterval = null;
    this.activeProject = null;

    this.initTabs();
    this.initAIEvents();
    this.initTimelineEvents();
    this.initFileNavEvents();
  }

  initTabs() {
    const tabButtons = document.querySelectorAll('.cockpit-nav-tab');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        if (target) this.switchTab(target);
      });
    });
  }

  switchTab(tabName) {
    this.activeTab = tabName;

    // Update active nav button
    document.querySelectorAll('.cockpit-nav-tab').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    // Update active section
    document.querySelectorAll('.cockpit-section').forEach(sec => {
      sec.classList.toggle('active', sec.id === `cockpit-sec-${tabName}`);
    });

    // Refresh context based on active tab
    if (tabName === 'radar') {
      this.refreshRadar();
      this.startRadarPolling();
    } else {
      this.stopRadarPolling();
    }

    if (tabName === 'git') {
      this.refreshGit();
    }

    if (tabName === 'files') {
      this.refreshFiles();
    }

    if (tabName === 'timeline') {
      this.refreshTimeline();
    }
  }

  // ==================================================
  // AI COPILOT
  // ==================================================
  initAIEvents() {
    // Natural language command builder
    const nlInput = document.getElementById('ai-nl-input');
    const nlBtn = document.getElementById('ai-nl-btn');
    if (nlBtn && nlInput) {
      nlBtn.addEventListener('click', () => {
        const text = nlInput.value.trim();
        if (!text) return;
        const activeShell = window.terminalManager?.getActiveSession()?.shellType || 'powershell';
        const res = window.cyberAI?.buildFromNaturalLanguage(text, activeShell);
        if (res) {
          this.displayGeneratedCommand(res.cmd, res.intent);
        }
      });
      nlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') nlBtn.click();
      });
    }

    // Command Translator
    const transInput = document.getElementById('ai-trans-input');
    const transBtn = document.getElementById('ai-trans-btn');
    if (transBtn && transInput) {
      transBtn.addEventListener('click', () => {
        const text = transInput.value.trim();
        if (!text) return;
        const res = window.cyberAI?.translateCommand(text);
        if (res) {
          this.displayTranslation(res);
        } else {
          this.displayTranslation({
            concept: 'Command Translation',
            bash: text,
            powershell: text,
            cmd: text,
            gitbash: text
          });
        }
      });
      transInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') transBtn.click();
      });
    }

    // Command Explainer
    const expInput = document.getElementById('ai-exp-input');
    const expBtn = document.getElementById('ai-exp-btn');
    if (expBtn && expInput) {
      expBtn.addEventListener('click', () => {
        const text = expInput.value.trim();
        if (!text) return;
        const res = window.cyberAI?.explainCommand(text);
        if (res) {
          this.displayExplanation(res);
        }
      });
      expInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') expBtn.click();
      });
    }
  }

  displayDiagnostic(diag) {
    const card = document.getElementById('ai-diagnostic-card');
    if (!card) return;

    card.innerHTML = `
      <div class="ai-diag-header">
        <span class="ai-badge-error">DIAGNOSTIC DETECTED</span>
        <span class="ai-diag-title">${this.escapeHtml(diag.title)}</span>
      </div>
      <div class="ai-diag-body">
        <div class="ai-diag-row"><b>Cause:</b> ${this.escapeHtml(diag.cause)}</div>
        <div class="ai-diag-row"><b>Explanation:</b> ${this.escapeHtml(diag.explanation)}</div>
        <div class="ai-solution-box">
          <code>${this.escapeHtml(diag.solutionCmd)}</code>
          <div class="ai-actions-row">
            <button class="ai-action-btn" onclick="navigator.clipboard.writeText('${diag.solutionCmd.replace(/'/g, "\\'")}')">COPY</button>
            <button class="ai-action-btn run-btn" onclick="window.terminalManager.safeRunCommand('${diag.solutionCmd.replace(/'/g, "\\'")}')">RUN WITH APPROVAL</button>
          </div>
        </div>
      </div>
    `;
    card.style.display = 'block';

    // Auto-switch to AI tab if user is on monitor
    if (this.activeTab === 'monitor') {
      this.switchTab('ai');
    }
  }

  displayGeneratedCommand(cmd, intent) {
    const resBox = document.getElementById('ai-nl-results');
    if (!resBox) return;

    resBox.innerHTML = `
      <div class="ai-result-card">
        <div class="ai-result-intent"><b>Intent:</b> ${this.escapeHtml(intent)}</div>
        <div class="ai-solution-box">
          <code>${this.escapeHtml(cmd)}</code>
          <div class="ai-actions-row">
            <button class="ai-action-btn" onclick="navigator.clipboard.writeText('${cmd.replace(/'/g, "\\'")}')">COPY</button>
            <button class="ai-action-btn run-btn" onclick="window.terminalManager.safeRunCommand('${cmd.replace(/'/g, "\\'")}')">RUN IN SHELL</button>
          </div>
        </div>
      </div>
    `;
  }

  displayTranslation(res) {
    const resBox = document.getElementById('ai-trans-results');
    if (!resBox) return;

    resBox.innerHTML = `
      <div class="ai-result-card">
        <div class="ai-result-intent"><b>Operation:</b> ${this.escapeHtml(res.concept)}</div>
        <div class="trans-grid">
          <div class="trans-row">
            <span class="trans-label">Linux / Bash:</span>
            <code>${this.escapeHtml(res.bash)}</code>
            <button class="ai-action-btn" onclick="navigator.clipboard.writeText('${res.bash.replace(/'/g, "\\'")}')">COPY</button>
          </div>
          <div class="trans-row">
            <span class="trans-label">PowerShell:</span>
            <code>${this.escapeHtml(res.powershell)}</code>
            <button class="ai-action-btn" onclick="navigator.clipboard.writeText('${res.powershell.replace(/'/g, "\\'")}')">COPY</button>
          </div>
          <div class="trans-row">
            <span class="trans-label">CMD:</span>
            <code>${this.escapeHtml(res.cmd)}</code>
            <button class="ai-action-btn" onclick="navigator.clipboard.writeText('${res.cmd.replace(/'/g, "\\'")}')">COPY</button>
          </div>
          <div class="trans-row">
            <span class="trans-label">Git Bash:</span>
            <code>${this.escapeHtml(res.gitbash)}</code>
            <button class="ai-action-btn" onclick="navigator.clipboard.writeText('${res.gitbash.replace(/'/g, "\\'")}')">COPY</button>
          </div>
        </div>
      </div>
    `;
  }

  displayExplanation(res) {
    const resBox = document.getElementById('ai-exp-results');
    if (!resBox) return;

    resBox.innerHTML = `
      <div class="ai-result-card">
        <div class="ai-result-intent"><b>Command:</b> <code>${this.escapeHtml(res.command)}</code></div>
        <div class="exp-tokens-list">
          ${res.breakdown.map(t => `
            <div class="exp-token-row">
              <span class="token-code">${this.escapeHtml(t.token)}</span>
              <span class="token-role">[${this.escapeHtml(t.role)}]</span>
              <span class="token-desc">${this.escapeHtml(t.desc)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ==================================================
  // PROCESS RADAR
  // ==================================================
  startRadarPolling() {
    this.stopRadarPolling();
    this.radarInterval = setInterval(() => {
      this.refreshRadar();
    }, 3500);
  }

  stopRadarPolling() {
    if (this.radarInterval) {
      clearInterval(this.radarInterval);
      this.radarInterval = null;
    }
  }

  async refreshRadar() {
    if (!window.cyberAPI || !window.cyberAPI.radar) return;
    try {
      const data = await window.cyberAPI.radar.getProcesses();
      if (!data) return;

      const termBox = document.getElementById('radar-terminal-list');
      const sysBox = document.getElementById('radar-system-list');

      if (termBox) {
        if (data.terminalProcesses.length === 0) {
          termBox.innerHTML = `<div class="radar-empty">No active terminal processes</div>`;
        } else {
          termBox.innerHTML = data.terminalProcesses.map(p => `
            <div class="radar-proc-row terminal-proc">
              <span class="proc-shell-tag ${p.shellType}">${p.shellType.toUpperCase()}</span>
              <span class="proc-title">${this.escapeHtml(p.title)}</span>
              <span class="proc-pid">PID ${p.pid}</span>
              <span class="proc-status">RUNNING</span>
            </div>
          `).join('');
        }
      }

      if (sysBox) {
        if (data.systemProcesses.length === 0) {
          sysBox.innerHTML = `<div class="radar-empty">Reading system processes...</div>`;
        } else {
          sysBox.innerHTML = data.systemProcesses.map(p => `
            <div class="radar-proc-row ${p.isTerminal ? 'terminal-proc' : ''}">
              <span class="proc-name">${this.escapeHtml(p.name)}</span>
              <span class="proc-pid">PID ${p.pid}</span>
              <span class="proc-ram">${p.ramMb} MB</span>
              <button class="proc-kill-btn" title="Kill Process" onclick="window.cockpitController.killProcess(${p.pid})">✕</button>
            </div>
          `).join('');
        }
      }
    } catch (e) {}
  }

  async killProcess(pid) {
    if (confirm(`Are you sure you want to terminate PID ${pid}?`)) {
      if (window.cyberAPI && window.cyberAPI.radar) {
        const res = await window.cyberAPI.radar.killPid(pid);
        if (res.success) {
          this.refreshRadar();
          if (window.hudController) window.hudController.addEvent(`Process killed: PID ${pid}`);
        } else {
          alert(`Failed to kill process: ${res.error}`);
        }
      }
    }
  }

  // ==================================================
  // GIT INTELLIGENCE
  // ==================================================
  async refreshGit() {
    const cwd = window.terminalManager?.getActiveSession()?.cwd || '';
    if (!window.cyberAPI || !window.cyberAPI.git) return;

    const data = await window.cyberAPI.git.getStatus(cwd);
    const box = document.getElementById('git-status-content');
    if (!box) return;

    if (!data.isRepo) {
      box.innerHTML = `
        <div class="git-empty-card">
          <span>● Current directory is not a Git repository.</span>
          <button class="ai-action-btn" onclick="window.terminalManager.safeRunCommand('git init')">git init</button>
        </div>
      `;
      return;
    }

    box.innerHTML = `
      <div class="git-repo-card">
        <div class="git-branch-line">
          <span>BRANCH:</span>
          <span class="git-branch-badge">${this.escapeHtml(data.branch)}</span>
          <span class="git-sync-info">Ahead: ${data.ahead} | Behind: ${data.behind}</span>
        </div>
        <div class="git-counts-line">
          <span style="color:var(--color-warning)">Modified: ${data.modified.length}</span>
          <span style="color:var(--color-success)">Staged: ${data.staged.length}</span>
          <span style="color:var(--text-ghost)">Untracked: ${data.untracked.length}</span>
        </div>
        <div class="git-files-box">
          ${data.modified.map(f => `<div class="git-file-row mod">M ${this.escapeHtml(f)}</div>`).join('')}
          ${data.staged.map(f => `<div class="git-file-row staged">A ${this.escapeHtml(f)}</div>`).join('')}
          ${data.untracked.map(f => `<div class="git-file-row untracked">? ${this.escapeHtml(f)}</div>`).join('')}
          ${data.modified.length === 0 && data.staged.length === 0 && data.untracked.length === 0 ? '<div class="git-clean-msg">Working tree clean</div>' : ''}
        </div>
        <div class="git-log-section">
          <span class="git-sec-header">RECENT COMMITS</span>
          ${data.commits.map(c => `<div class="git-commit-row">${this.escapeHtml(c)}</div>`).join('')}
        </div>
        <div class="git-quick-actions">
          <button class="ai-action-btn" onclick="window.terminalManager.safeRunCommand('git status')">STATUS</button>
          <button class="ai-action-btn" onclick="window.terminalManager.safeRunCommand('git diff')">DIFF</button>
          <button class="ai-action-btn" onclick="window.terminalManager.safeRunCommand('git log -n 5 --oneline')">LOG</button>
        </div>
      </div>
    `;
  }

  // ==================================================
  // SMART FILE NAVIGATOR
  // ==================================================
  initFileNavEvents() {
    const upBtn = document.getElementById('files-up-btn');
    if (upBtn) {
      upBtn.addEventListener('click', () => {
        if (this.currentParentDir) {
          this.refreshFiles(this.currentParentDir);
        }
      });
    }
  }

  async refreshFiles(targetDir) {
    const cwd = targetDir || window.terminalManager?.getActiveSession()?.cwd || '';
    if (!window.cyberAPI || !window.cyberAPI.fs) return;

    const res = await window.cyberAPI.fs.listDir(cwd);
    const box = document.getElementById('files-list-content');
    const pathElem = document.getElementById('files-cwd-label');
    if (!box) return;

    this.currentParentDir = res.parentDir;
    if (pathElem) pathElem.textContent = res.currentDir;

    if (!res.items || res.items.length === 0) {
      box.innerHTML = `<div class="radar-empty">Empty directory</div>`;
      return;
    }

    box.innerHTML = res.items.map(f => `
      <div class="file-entry-row ${f.isDirectory ? 'is-dir' : 'is-file'}" 
           data-name="${this.escapeHtml(f.name)}" 
           data-isdir="${f.isDirectory}"
           onclick="window.cockpitController.handleFileClick('${this.escapeHtml(f.name).replace(/'/g, "\\'")}', ${f.isDirectory})">
        <span class="file-icon">${f.isDirectory ? '📁' : '📄'}</span>
        <span class="file-name">${this.escapeHtml(f.name)}</span>
        <span class="file-size">${f.isDirectory ? '<DIR>' : this.formatSize(f.size)}</span>
      </div>
    `).join('');
  }

  handleFileClick(name, isDir) {
    const activeCwd = document.getElementById('files-cwd-label')?.textContent || '';
    const fullPath = `${activeCwd}\\${name}`;

    if (isDir) {
      this.refreshFiles(fullPath);
    } else {
      // Copy path or provide action
      navigator.clipboard.writeText(fullPath);
      if (window.hudController) window.hudController.addEvent(`Copied: ${name}`);
    }
  }

  // ==================================================
  // SESSION TIME MACHINE
  // ==================================================
  initTimelineEvents() {
    const searchInput = document.getElementById('timeline-search-input');
    const filterSelect = document.getElementById('timeline-shell-filter');
    const errCheck = document.getElementById('timeline-errors-only');

    const update = () => {
      const q = searchInput ? searchInput.value : '';
      const sh = filterSelect ? filterSelect.value : 'ALL';
      const errOnly = errCheck ? errCheck.checked : false;
      this.refreshTimeline(q, sh, errOnly);
    };

    if (searchInput) searchInput.addEventListener('input', update);
    if (filterSelect) filterSelect.addEventListener('change', update);
    if (errCheck) errCheck.addEventListener('change', update);
  }

  refreshTimeline(query = '', shellFilter = 'ALL', errorOnly = false) {
    const box = document.getElementById('timeline-list-content');
    if (!box || !window.sessionTimeMachine) return;

    const entries = window.sessionTimeMachine.search(query, shellFilter, errorOnly);
    if (entries.length === 0) {
      box.innerHTML = `<div class="radar-empty">No timeline events match your criteria</div>`;
      return;
    }

    box.innerHTML = entries.map(e => `
      <div class="timeline-event-row status-${(e.status || 'running').toLowerCase()}">
        <div class="tl-meta-line">
          <span class="tl-time">${e.time}</span>
          <span class="tl-shell-badge ${e.shell}">${e.shell.toUpperCase()}</span>
          <span class="tl-status-tag ${e.status.toLowerCase()}">${e.status}</span>
        </div>
        <div class="tl-cmd-line">
          <code>${this.escapeHtml(e.command)}</code>
          <button class="tl-rerun-btn" title="Re-run in terminal" onclick="window.terminalManager.safeRunCommand('${e.command.replace(/'/g, "\\'")}')">RUN</button>
        </div>
        ${e.outputSnippet ? `<div class="tl-snippet-box">${this.escapeHtml(e.outputSnippet.slice(0, 180))}</div>` : ''}
      </div>
    `).join('');
  }

  // ==================================================
  // PROJECT INTELLIGENCE
  // ==================================================
  async updateProjectBanner(cwd) {
    if (!window.cyberAPI || !window.cyberAPI.project) return;
    try {
      const project = await window.cyberAPI.project.detect(cwd);
      this.activeProject = project;

      const banner = document.getElementById('project-detect-banner');
      if (!banner) return;

      if (!project.isProject) {
        banner.style.display = 'none';
        return;
      }

      banner.innerHTML = `
        <div class="proj-banner-left">
          <span class="proj-badge">PROJECT:</span>
          <span class="proj-name">${this.escapeHtml(project.name)}</span>
          <div class="proj-types-tags">
            ${project.types.map(t => `<span class="proj-type-tag">${t}</span>`).join('')}
          </div>
        </div>
        <div class="proj-banner-actions">
          ${project.quickActions.slice(0, 3).map(a => `
            <button class="proj-act-btn" onclick="window.terminalManager.safeRunCommand('${a.cmd.replace(/'/g, "\\'")}')">${a.label}</button>
          `).join('')}
        </div>
      `;
      banner.style.display = 'flex';
    } catch (e) {}
  }

  formatSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

window.CockpitController = CockpitController;
