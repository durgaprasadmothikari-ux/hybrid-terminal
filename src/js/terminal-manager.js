// CYBERTERM MULTI-TAB & SPLIT TERMINAL MANAGER

class TerminalManager {
  constructor() {
    this.tabsContainer = document.getElementById('terminal-tabs-strip');
    this.panesContainer = document.getElementById('terminal-panes-container');
    this.tabs = []; // Array of Tab objects
    this.activeTabId = null;
    this.sessionMap = new Map(); // sessionId -> TerminalSession

    this.init();
  }

  async init() {
    this.setupGlobalIPC();
    this.setupGlobalShortcuts();
    this.setupUIButtons();
    this.setupResizeObserver();

    // Create the default initial tab
    const defaultShell = window.settingsManager ? window.settingsManager.get('defaultShell') : 'powershell';
    const defaultCwd = window.settingsManager ? window.settingsManager.get('defaultCwd') : '';
    await this.createTab(defaultShell, defaultCwd);
  }

  setupGlobalIPC() {
    if (!window.cyberAPI || !window.cyberAPI.pty) return;

    // Stream stdout/stderr from backend ConPTY directly to matching XTerm session
    window.cyberAPI.pty.onData((sessionId, data) => {
      const session = this.sessionMap.get(sessionId);
      if (session) {
        session.write(data);

        // Feed to Session Time Machine snippet
        if (window.sessionTimeMachine) {
          window.sessionTimeMachine.recordOutput(sessionId, data);
        }

        // Automatic Error Diagnostic Check
        if (window.cyberAI && window.cockpitController) {
          const diag = window.cyberAI.diagnoseOutput(data);
          if (diag) {
            window.cockpitController.displayDiagnostic(diag);
          }
        }
      }
    });

    // Handle PTY exit event
    window.cyberAPI.pty.onExit((sessionId, exitCode, signal) => {
      const session = this.sessionMap.get(sessionId);
      if (session) {
        session.write(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m\r\n`);
        session.isAlive = false;
        if (window.sessionTimeMachine) {
          window.sessionTimeMachine.finishCommand(sessionId, exitCode);
        }
        if (window.hudController) {
          window.hudController.addEvent(`Exit code ${exitCode} (${session.shellType})`);
        }
        const activeTab = this.tabs.find(t => t.id === this.activeTabId);
        if (activeTab && (activeTab.primarySession === session || activeTab.splitSession === session)) {
          this.updateShellHeaderUI(activeTab.shellType);
        }
      }
    });
  }

  setupGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't intercept if inside input or settings modal unless it's palette/settings
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

      // Ctrl+Shift+P or F1: Command Palette
      if ((e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) || e.key === 'F1') {
        e.preventDefault();
        if (window.commandPalette) window.commandPalette.toggle();
        return;
      }

      // Ctrl+, : Settings
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        this.toggleSettingsModal();
        return;
      }

      if (isInput) return;

      // Ctrl+T or Ctrl+Shift+T: New Tab
      if (e.ctrlKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        const defaultShell = window.settingsManager ? window.settingsManager.get('defaultShell') : 'powershell';
        this.createTab(defaultShell);
        return;
      }

      // Ctrl+W: Close Tab
      if (e.ctrlKey && !e.shiftKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        if (this.activeTabId) {
          this.closeTab(this.activeTabId);
        }
        return;
      }

      // Ctrl+Tab / Ctrl+Shift+Tab: Switch Tab
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        this.navigateTabs(e.shiftKey ? -1 : 1);
        return;
      }

      // Ctrl+1 through Ctrl+9: Switch directly to Tab N
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key, 10) - 1;
        if (this.tabs[index]) {
          e.preventDefault();
          this.switchTab(this.tabs[index].id);
        }
        return;
      }

      // Ctrl+\ or Ctrl+Shift+D: Split active tab
      if ((e.ctrlKey && e.key === '\\') || (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd'))) {
        e.preventDefault();
        if (this.activeTabId) {
          this.toggleSplit(this.activeTabId);
        }
        return;
      }
    });
  }

  setupUIButtons() {
    // New tab button (+)
    const btnNewTab = document.getElementById('btn-new-tab');
    if (btnNewTab) {
      btnNewTab.addEventListener('click', () => {
        const defaultShell = window.settingsManager ? window.settingsManager.get('defaultShell') : 'powershell';
        this.createTab(defaultShell);
      });
    }

    // Split button in toolbar
    const btnSplit = document.getElementById('btn-split-term');
    if (btnSplit) {
      btnSplit.addEventListener('click', () => {
        if (this.activeTabId) this.toggleSplit(this.activeTabId);
      });
    }

    // Settings button in toolbar
    const btnSettings = document.getElementById('btn-open-settings');
    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        this.toggleSettingsModal();
      });
    }

    // Subsystem buttons in titlebar & header
    document.querySelectorAll('[data-shell]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetShell = btn.getAttribute('data-shell');
        if (!targetShell) return;
        this.handleSubsystemButtonClick(targetShell);
      });
    });

    // Close Context Menu on click outside
    window.addEventListener('click', (e) => {
      const menu = document.getElementById('terminal-context-menu');
      if (menu && menu.classList.contains('visible')) {
        menu.classList.remove('visible');
      }
    });

    // Context Menu Actions
    const ctxCopy = document.getElementById('ctx-copy');
    const ctxPaste = document.getElementById('ctx-paste');
    const ctxClear = document.getElementById('ctx-clear');
    const ctxSplit = document.getElementById('ctx-split');
    const ctxRestart = document.getElementById('ctx-restart');

    if (ctxCopy) ctxCopy.addEventListener('click', () => {
      if (window.activeContextMenuSession) window.activeContextMenuSession.copySelection();
    });
    if (ctxPaste) ctxPaste.addEventListener('click', () => {
      if (window.activeContextMenuSession) window.activeContextMenuSession.pasteClipboard();
    });
    if (ctxClear) ctxClear.addEventListener('click', () => {
      if (window.activeContextMenuSession) window.activeContextMenuSession.clear();
    });
    if (ctxSplit) ctxSplit.addEventListener('click', () => {
      if (this.activeTabId) this.toggleSplit(this.activeTabId);
    });
    if (ctxRestart) ctxRestart.addEventListener('click', () => {
      if (this.activeTabId) this.restartActiveShell();
    });
  }

  setupResizeObserver() {
    let resizeTimeout = null;
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.fitActiveSessions();
      }, 50);
    };

    window.addEventListener('resize', handleResize);

    const vp = document.getElementById('main-workspace');
    if (vp && window.ResizeObserver) {
      const ro = new ResizeObserver(handleResize);
      ro.observe(vp);
    }
  }

  async createTab(shellType = 'powershell', customCwd = '', distro = '') {
    const tabId = `tab-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const sessionId = `sess-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const normShell = (shellType || 'powershell').toLowerCase();

    // Tab Pane Container
    const tabPane = document.createElement('div');
    tabPane.className = 'tab-pane';
    tabPane.id = `pane-${tabId}`;
    this.panesContainer.appendChild(tabPane);

    // Primary Pane Container
    const primaryPane = document.createElement('div');
    primaryPane.className = 'pane-terminal primary-pane';
    primaryPane.id = `primary-${tabId}`;
    tabPane.appendChild(primaryPane);

    const initialTitle = normShell === 'wsl' ? (distro ? `WSL (${distro})` : 'WSL (Ubuntu)') : this.getShellLabel(normShell);

    // Tab Object
    const tabObj = {
      id: tabId,
      shellType: normShell,
      distro: distro || '',
      title: initialTitle,
      primarySession: null,
      splitSession: null,
      activeSessionId: sessionId,
      isSplit: false
    };

    this.tabs.push(tabObj);

    // Tab Button in Header Strip
    const tabBtn = document.createElement('div');
    tabBtn.className = 'cyber-tab-btn';
    tabBtn.id = `tab-btn-${tabId}`;
    tabBtn.title = `Switch to ${tabObj.title} (Double-click to rename)`;
    tabBtn.innerHTML = `
      <span class="tab-shell-badge ${normShell}">${this.getShellBadge(normShell)}</span>
      <span class="tab-title-text" id="tab-title-${tabId}">${this.escapeHtml(tabObj.title)}</span>
      <button class="tab-close-btn" title="Close Tab">✕</button>
    `;

    // Tab button click & close
    tabBtn.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-close-btn')) {
        e.stopPropagation();
        this.closeTab(tabId);
        return;
      }
      this.switchTab(tabId);
    });

    // Double click to rename
    tabBtn.addEventListener('dblclick', (e) => {
      if (e.target.classList.contains('tab-close-btn')) return;
      this.promptRenameTab(tabId);
    });

    this.tabsContainer.appendChild(tabBtn);

    // Create Terminal Session
    const session = new TerminalSession({
      sessionId,
      shellType: normShell,
      cwd: customCwd,
      container: primaryPane,
      onTitleChange: (sid, title) => {
        this.updateTabTitle(tabId, title);
      },
      onExit: (sid) => {
        // Handled in global IPC
      }
    });

    tabObj.primarySession = session;
    this.sessionMap.set(sessionId, session);

    // Start Backend PTY process
    if (window.cyberAPI && window.cyberAPI.pty) {
      const cols = session.term.cols || 80;
      const rows = session.term.rows || 24;
      const res = await window.cyberAPI.pty.createSession({
        sessionId,
        shellType: normShell,
        cwd: customCwd,
        distro,
        cols,
        rows
      });

      if (!res.success) {
        session.write(`\r\n\x1b[31m[ERROR] Failed to spawn ${normShell}: ${res.error}\x1b[0m\r\n`);
      }
    }

    // Switch to new tab
    this.switchTab(tabId);

    if (window.hudController) {
      window.hudController.addEvent(`New Tab: ${this.getShellLabel(normShell)}`);
    }

    return tabObj;
  }

  async toggleSplit(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    const tabPane = document.getElementById(`pane-${tabId}`);
    if (!tabPane) return;

    if (tab.isSplit) {
      // Unsplit: destroy secondary session
      if (tab.splitSession) {
        this.sessionMap.delete(tab.splitSession.sessionId);
        tab.splitSession.destroy();
        tab.splitSession = null;
      }
      const secondaryPane = document.getElementById(`secondary-${tabId}`);
      if (secondaryPane) secondaryPane.remove();

      tabPane.classList.remove('split-vertical');
      tab.isSplit = false;
      tab.activeSessionId = tab.primarySession.sessionId;
      this.fitActiveSessions();
      if (tab.primarySession) tab.primarySession.focus();
    } else {
      // Split: create secondary session
      tabPane.classList.add('split-vertical');
      const secondaryPane = document.createElement('div');
      secondaryPane.className = 'pane-terminal secondary-pane';
      secondaryPane.id = `secondary-${tabId}`;
      tabPane.appendChild(secondaryPane);

      const splitSessionId = `sess-split-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const splitSession = new TerminalSession({
        sessionId: splitSessionId,
        shellType: tab.shellType,
        cwd: tab.primarySession ? tab.primarySession.cwd : '',
        container: secondaryPane,
        onTitleChange: () => {},
        onExit: () => {}
      });

      tab.splitSession = splitSession;
      this.sessionMap.set(splitSessionId, splitSession);
      tab.isSplit = true;
      tab.activeSessionId = splitSessionId;

      // Start Backend PTY process for split session
      if (window.cyberAPI && window.cyberAPI.pty) {
        setTimeout(async () => {
          splitSession.fit();
          const cols = splitSession.term.cols || 80;
          const rows = splitSession.term.rows || 24;
          await window.cyberAPI.pty.createSession({
            sessionId: splitSessionId,
            shellType: tab.shellType,
            cwd: tab.primarySession ? tab.primarySession.cwd : '',
            cols,
            rows
          });
          this.fitActiveSessions();
          splitSession.focus();
        }, 50);
      }
    }
  }

  switchTab(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    this.activeTabId = tabId;

    // Update active tab buttons
    document.querySelectorAll('.cyber-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.id === `tab-btn-${tabId}`);
    });

    // Update active panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `pane-${tabId}`);
    });

    // Sync shell segmented controls in titlebar/header
    this.updateShellHeaderUI(tab.shellType);

    // Focus & fit active session
    setTimeout(() => {
      this.fitActiveSessions();
      const activeSession = this.getActiveSession();
      if (activeSession) {
        activeSession.focus();
      }

      // Update Project Intelligence and Git
      if (tab.primarySession && window.cockpitController) {
        window.cockpitController.updateProjectBanner(tab.primarySession.cwd);
        if (window.cockpitController.activeTab === 'git') {
          window.cockpitController.refreshGit();
        }
        if (window.cockpitController.activeTab === 'files') {
          window.cockpitController.refreshFiles();
        }
      }
    }, 20);
  }

  closeTab(tabId) {
    const tabIndex = this.tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;

    const tab = this.tabs[tabIndex];

    // Destroy primary session
    if (tab.primarySession) {
      this.sessionMap.delete(tab.primarySession.sessionId);
      tab.primarySession.destroy();
    }

    // Destroy split session if any
    if (tab.splitSession) {
      this.sessionMap.delete(tab.splitSession.sessionId);
      tab.splitSession.destroy();
    }

    // Remove DOM elements
    const tabBtn = document.getElementById(`tab-btn-${tabId}`);
    if (tabBtn) tabBtn.remove();

    const pane = document.getElementById(`pane-${tabId}`);
    if (pane) pane.remove();

    this.tabs.splice(tabIndex, 1);

    // If no tabs remain, open a new default tab
    if (this.tabs.length === 0) {
      const defaultShell = window.settingsManager ? window.settingsManager.get('defaultShell') : 'powershell';
      this.createTab(defaultShell);
    } else {
      // Activate nearest tab
      const nextIndex = Math.min(tabIndex, this.tabs.length - 1);
      this.switchTab(this.tabs[nextIndex].id);
    }
  }

  navigateTabs(delta) {
    if (this.tabs.length <= 1) return;
    const currentIndex = this.tabs.findIndex(t => t.id === this.activeTabId);
    let nextIndex = currentIndex + delta;
    if (nextIndex < 0) nextIndex = this.tabs.length - 1;
    if (nextIndex >= this.tabs.length) nextIndex = 0;
    this.switchTab(this.tabs[nextIndex].id);
  }

  promptRenameTab(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    const currentTitle = tab.title;
    const newTitle = prompt('Enter new tab name:', currentTitle);
    if (newTitle && newTitle.trim()) {
      this.updateTabTitle(tabId, newTitle.trim());
    }
  }

  updateTabTitle(tabId, title) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;
    tab.title = title;

    const titleElem = document.getElementById(`tab-title-${tabId}`);
    if (titleElem) {
      titleElem.textContent = title;
    }
  }

  handleSubsystemButtonClick(targetShell) {
    const norm = targetShell.toLowerCase();
    const activeTab = this.tabs.find(t => t.id === this.activeTabId);

    // If active tab has the same shell, do nothing
    if (activeTab && activeTab.shellType === norm) {
      this.getActiveSession()?.focus();
      return;
    }

    // Create a new tab for the requested subsystem
    this.createTab(norm);
  }

  async restartActiveShell() {
    const activeTab = this.tabs.find(t => t.id === this.activeTabId);
    if (!activeTab || !activeTab.primarySession) return;

    const session = activeTab.primarySession;
    session.write('\r\n\x1b[33m[Restarting Subsystem...]\x1b[0m\r\n');

    if (window.cyberAPI && window.cyberAPI.pty) {
      await window.cyberAPI.pty.killSession(session.sessionId);
      const cols = session.term.cols || 80;
      const rows = session.term.rows || 24;
      await window.cyberAPI.pty.createSession({
        sessionId: session.sessionId,
        shellType: activeTab.shellType,
        cwd: session.cwd,
        cols,
        rows
      });
      session.isAlive = true;
      session.clear();
      session.focus();
    }
  }

  clearActiveTerminal() {
    const activeSession = this.getActiveSession();
    if (activeSession) {
      activeSession.clear();
    }
  }

  safeRunCommand(cmdString) {
    const cmd = (cmdString || '').trim();
    if (!cmd) return;

    const risk = window.cyberAI ? window.cyberAI.analyzeRisk(cmd) : { level: 'LOW' };

    if (risk.level === 'HIGH' || risk.level === 'CRITICAL') {
      this.promptRiskConfirmation(cmd, risk, () => {
        this.executeInActiveSession(cmd);
      });
    } else {
      this.executeInActiveSession(cmd);
    }
  }

  promptRiskConfirmation(cmd, risk, onConfirm) {
    const modal = document.getElementById('risk-confirm-modal');
    if (!modal) {
      if (confirm(`COMMAND RISK: [${risk.level}]\n${risk.reason}\nTarget: ${risk.target || 'System'}\n\nExecute command: ${cmd}?`)) {
        onConfirm();
      }
      return;
    }

    const cmdCode = document.getElementById('risk-modal-cmd');
    const levelBadge = document.getElementById('risk-modal-level');
    const reasonText = document.getElementById('risk-modal-reason');
    const targetText = document.getElementById('risk-modal-target');
    const executeBtn = document.getElementById('risk-modal-execute');
    const cancelBtn = document.getElementById('risk-modal-cancel');

    if (cmdCode) cmdCode.textContent = cmd;
    if (levelBadge) {
      levelBadge.textContent = risk.level;
      levelBadge.className = `risk-badge risk-${risk.level.toLowerCase()}`;
    }
    if (reasonText) reasonText.textContent = risk.reason;
    if (targetText) targetText.textContent = risk.target || 'Filesystem / Active Processes';

    modal.classList.remove('hidden');

    const handleConfirm = () => {
      modal.classList.add('hidden');
      executeBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      onConfirm();
    };

    const handleCancel = () => {
      modal.classList.add('hidden');
      executeBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      this.getActiveSession()?.focus();
    };

    executeBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
  }

  executeInActiveSession(cmd) {
    const active = this.getActiveSession();
    if (!active) return;

    // Record in Session Time Machine
    if (window.sessionTimeMachine) {
      window.sessionTimeMachine.recordCommand(active.sessionId, cmd, active.shellType, active.cwd);
    }

    if (window.cyberAPI && window.cyberAPI.pty) {
      window.cyberAPI.pty.write(active.sessionId, cmd + '\r');
      active.focus();
    }
  }

  getActiveSession() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (!tab) return null;
    if (tab.isSplit && tab.activeSessionId === tab.splitSession?.sessionId) {
      return tab.splitSession;
    }
    return tab.primarySession;
  }

  fitActiveSessions() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (!tab) return;
    if (tab.primarySession) tab.primarySession.fit();
    if (tab.splitSession) tab.splitSession.fit();
  }

  updateTerminalOptions() {
    this.sessionMap.forEach(session => {
      session.updateOptions();
    });
  }

  updateThemeColors() {
    this.sessionMap.forEach(session => {
      session.updateTheme();
    });
  }

  async updateShellHeaderUI(shellName) {
    const norm = (shellName || 'powershell').toLowerCase();

    // Update active class on all matching shell buttons in titlebar & header
    document.querySelectorAll('[data-shell]').forEach(btn => {
      const bShell = btn.getAttribute('data-shell');
      btn.classList.toggle('active', bShell === norm);
    });

    const termHeaderShell = document.getElementById('term-header-shell');
    const termHeaderEnv = document.getElementById('term-header-env');
    const termStatusBadge = document.getElementById('term-status-badge');

    const activeSession = this.getActiveSession();
    const isAlive = activeSession ? activeSession.isAlive : true;

    let displayName = 'POWERSHELL';
    let envLabel = 'WIN64 // PWSH';
    let shellColor = 'var(--accent-cyan)';
    let statusText = isAlive ? 'CONPTY ACTIVE' : 'CONPTY DISCONNECTED';

    if (norm === 'cmd') {
      displayName = 'COMMAND PROMPT';
      envLabel = 'WIN32/64 // CMD';
      shellColor = 'var(--text-white)';
      statusText = isAlive ? 'CONPTY ACTIVE' : 'CONPTY DISCONNECTED';
    } else if (norm === 'wsl') {
      displayName = 'WSL 2 (UBUNTU LINUX)';
      envLabel = 'LINUX 6.x // BASH';
      shellColor = '#10b981';
      statusText = isAlive ? 'WSL 2 ● CONNECTED' : 'WSL 2 ● DISCONNECTED';

      // Query real WSL metadata dynamically
      if (window.cyberAPI && window.cyberAPI.wsl) {
        try {
          const wslInfo = await window.cyberAPI.wsl.getStatus();
          if (wslInfo && wslInfo.metadata) {
            const distroName = wslInfo.metadata.distroName || wslInfo.activeDistro || 'Ubuntu';
            displayName = `WSL 2 // ${distroName.toUpperCase()}`;
            const kernel = wslInfo.metadata.kernel || 'Linux 6.x';
            const shell = (wslInfo.metadata.shell || 'Bash').toUpperCase();
            const user = wslInfo.metadata.user ? `@${wslInfo.metadata.user}` : '';
            envLabel = `${kernel} // ${shell}${user ? ' ' + user : ''}`;
          }
        } catch (e) {}
      }
    } else if (norm === 'gitbash') {
      displayName = 'GIT BASH';
      envLabel = 'MINGW64 // BASH';
      shellColor = 'var(--accent-amber)';
      statusText = isAlive ? 'CONPTY ACTIVE' : 'CONPTY DISCONNECTED';
    }

    if (termHeaderShell) {
      termHeaderShell.textContent = displayName;
      termHeaderShell.style.color = shellColor;
    }
    if (termHeaderEnv) {
      termHeaderEnv.textContent = envLabel;
    }
    if (termStatusBadge) {
      termStatusBadge.textContent = statusText;
    }
  }

  toggleSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    const isHidden = modal.classList.toggle('hidden');
    if (!isHidden) {
      this.populateSettingsForm();
    } else {
      this.getActiveSession()?.focus();
    }
  }

  populateSettingsForm() {
    const settings = window.settingsManager;
    if (!settings) return;

    const themeSelect = document.getElementById('setting-theme');
    const shellSelect = document.getElementById('setting-default-shell');
    const fontSizeInput = document.getElementById('setting-font-size');
    const cursorStyleSelect = document.getElementById('setting-cursor-style');
    const cursorBlinkCheck = document.getElementById('setting-cursor-blink');
    const scrollbackInput = document.getElementById('setting-scrollback');
    const opacityInput = document.getElementById('setting-opacity');
    const scanlinesCheck = document.getElementById('setting-scanlines');
    const bootSeqCheck = document.getElementById('setting-boot-seq');

    if (themeSelect) themeSelect.value = settings.get('theme');
    if (shellSelect) shellSelect.value = settings.get('defaultShell');
    if (fontSizeInput) fontSizeInput.value = settings.get('fontSize');
    if (cursorStyleSelect) cursorStyleSelect.value = settings.get('cursorStyle');
    if (cursorBlinkCheck) cursorBlinkCheck.checked = settings.get('cursorBlink');
    if (scrollbackInput) scrollbackInput.value = settings.get('scrollback');
    if (opacityInput) opacityInput.value = settings.get('windowOpacity');
    if (scanlinesCheck) scanlinesCheck.checked = settings.get('scanlines');
    if (bootSeqCheck) bootSeqCheck.checked = settings.get('bootSeqEnabled');
  }

  getShellBadge(shell) {
    switch (shell) {
      case 'powershell': return 'PS';
      case 'cmd': return 'CMD';
      case 'wsl': return 'WSL';
      case 'gitbash': return 'GIT';
      default: return 'SH';
    }
  }

  getShellLabel(shell) {
    switch (shell) {
      case 'powershell': return 'PowerShell';
      case 'cmd': return 'Command Prompt';
      case 'wsl': return 'WSL (Ubuntu)';
      case 'gitbash': return 'Git Bash';
      default: return 'Terminal';
    }
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

window.TerminalManager = TerminalManager;
