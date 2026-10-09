// CYBERTERM COMMAND PALETTE ENGINE (Ctrl+Shift+P / F1)

class CommandPalette {
  constructor() {
    this.overlay = document.getElementById('command-palette-overlay');
    this.input = document.getElementById('palette-input');
    this.list = document.getElementById('palette-list');
    this.isOpen = false;
    this.selectedIndex = 0;
    this.filteredCommands = [];

    this.commands = [
      { id: 'new-pwsh', title: 'New Terminal: Windows PowerShell', category: 'Terminal', icon: 'PS', action: () => window.terminalManager?.createTab('powershell') },
      { id: 'new-cmd', title: 'New Terminal: Windows Command Prompt (CMD)', category: 'Terminal', icon: 'CMD', action: () => window.terminalManager?.createTab('cmd') },
      { id: 'new-wsl', title: 'New Terminal: WSL 2 (Ubuntu Linux)', category: 'Terminal', icon: 'WSL', action: () => window.terminalManager?.createTab('wsl') },
      { id: 'new-gitbash', title: 'New Terminal: Git Bash (MINGW64)', category: 'Terminal', icon: 'GIT', action: () => window.terminalManager?.createTab('gitbash') },
      { id: 'split-term', title: 'Terminal: Split Current Tab (Side-by-Side)', category: 'Terminal', icon: '◫', action: () => window.terminalManager?.toggleSplit(window.terminalManager.activeTabId) },
      { id: 'close-tab', title: 'Terminal: Close Current Tab', category: 'Terminal', icon: '✕', action: () => window.terminalManager?.closeTab(window.terminalManager.activeTabId) },
      { id: 'clear-term', title: 'Terminal: Clear Terminal Buffer', category: 'Terminal', icon: '⌫', action: () => window.terminalManager?.clearActiveTerminal() },
      { id: 'restart-shell', title: 'Terminal: Restart Active Shell Session', category: 'Terminal', icon: '↻', action: () => window.terminalManager?.restartActiveShell() },
      
      // Cockpit Panels
      { id: 'cockpit-ai', title: 'Cockpit: Open Cyber AI Copilot', category: 'Cockpit', icon: '🤖', action: () => { window.cockpitController?.switchTab('ai'); } },
      { id: 'cockpit-radar', title: 'Cockpit: Open Process Radar', category: 'Cockpit', icon: '⚡', action: () => { window.cockpitController?.switchTab('radar'); } },
      { id: 'cockpit-git', title: 'Cockpit: Open Git Intelligence', category: 'Cockpit', icon: '⎇', action: () => { window.cockpitController?.switchTab('git'); } },
      { id: 'cockpit-files', title: 'Cockpit: Open Smart File Navigator', category: 'Cockpit', icon: '📁', action: () => { window.cockpitController?.switchTab('files'); } },
      { id: 'cockpit-timeline', title: 'Cockpit: Open Session Time Machine', category: 'Cockpit', icon: '⏳', action: () => { window.cockpitController?.switchTab('timeline'); } },
      { id: 'cockpit-monitor', title: 'Cockpit: Open System Hardware Monitor', category: 'Cockpit', icon: '📊', action: () => { window.cockpitController?.switchTab('monitor'); } },

      // Workspaces
      { id: 'ws-save', title: 'Workspaces: Save Current Environment Setup', category: 'Workspaces', icon: '💾', action: () => {
        const name = prompt('Enter workspace name:', window.workspaceManager?.activeWorkspaceName || 'Development');
        if (name) window.workspaceManager?.saveCurrent(name);
      }},
      { id: 'ws-switch', title: 'Workspaces: Manage / Switch Workspaces', category: 'Workspaces', icon: '🗂', action: () => {
        const list = window.workspaceManager?.list() || [];
        const names = list.map(w => w.name).join(', ');
        const chosen = prompt(`Available Workspaces: ${names}\nEnter workspace name to activate:`, list[0]?.name || 'Default');
        if (chosen) window.workspaceManager?.applyWorkspace(chosen);
      }},

      // Git Quick Actions
      { id: 'git-status-act', title: 'Git: Check Working Tree Status', category: 'Git', icon: '⎇', action: () => window.terminalManager?.safeRunCommand('git status') },
      { id: 'git-diff-act', title: 'Git: Show Uncommitted Diffs', category: 'Git', icon: '⎇', action: () => window.terminalManager?.safeRunCommand('git diff') },
      { id: 'git-log-act', title: 'Git: Show Compact Commit Log', category: 'Git', icon: '⎇', action: () => window.terminalManager?.safeRunCommand('git log -n 5 --oneline') },

      // Preferences & Settings
      { id: 'toggle-monitor', title: 'View: Toggle Cockpit Sidebar Panel', category: 'View', icon: '⚡', action: () => window.hudController?.toggleMonitor() },
      { id: 'open-settings', title: 'Preferences: Open CyberTerm Settings', category: 'Settings', icon: '⚙', action: () => window.terminalManager?.toggleSettingsModal() },
      { id: 'theme-blue', title: 'Theme: Switch to Cyber Blue (Default)', category: 'Appearance', icon: '◈', action: () => window.settingsManager?.set('theme', 'cyber-blue') },
      { id: 'theme-green', title: 'Theme: Switch to Matrix Green', category: 'Appearance', icon: '◈', action: () => window.settingsManager?.set('theme', 'matrix-green') },
      { id: 'theme-amber', title: 'Theme: Switch to Amber Terminal', category: 'Appearance', icon: '◈', action: () => window.settingsManager?.set('theme', 'amber-terminal') },
      { id: 'theme-purple', title: 'Theme: Switch to Midnight Purple', category: 'Appearance', icon: '◈', action: () => window.settingsManager?.set('theme', 'midnight-purple') },
      { id: 'theme-red', title: 'Theme: Switch to Red Alert', category: 'Appearance', icon: '◈', action: () => window.settingsManager?.set('theme', 'red-alert') },
      { id: 'theme-minimal', title: 'Theme: Switch to Minimal Dark', category: 'Appearance', icon: '◈', action: () => window.settingsManager?.set('theme', 'minimal-dark') },
      { id: 'font-increase', title: 'Font: Increase Terminal Font Size', category: 'Font', icon: 'A+', action: () => window.terminalManager?.getActiveSession()?.adjustFontSize(1) },
      { id: 'font-decrease', title: 'Font: Decrease Terminal Font Size', category: 'Font', icon: 'A-', action: () => window.terminalManager?.getActiveSession()?.adjustFontSize(-1) },
      { id: 'font-reset', title: 'Font: Reset Terminal Font Size (13px)', category: 'Font', icon: 'A=', action: () => window.terminalManager?.getActiveSession()?.resetFontSize() },
      { id: 'toggle-pin', title: 'Window: Toggle Always on Top (Pin)', category: 'Window', icon: '📌', action: () => window.hudController?.toggleAlwaysOnTop() },
      { id: 'toggle-scanlines', title: 'Display: Toggle CRT Scanlines Texture', category: 'Appearance', icon: '▦', action: () => {
        const cur = window.settingsManager?.get('scanlines');
        window.settingsManager?.set('scanlines', !cur);
      }},
      // Custom Commands
      { id: 'custom-pandasay', title: 'Custom Command: pandasay (WSL Panda Speech)', category: 'Custom Commands', icon: '🐼', action: () => {
        const tm = window.terminalManager;
        const activeTab = tm?.tabs.find(t => t.id === tm.activeTabId);
        if (activeTab && activeTab.shellType === 'wsl') {
          tm.executeInActiveSession('pandasay "CyberTerm is online"');
        } else {
          tm?.createTab('wsl').then(() => {
            setTimeout(() => {
              tm.executeInActiveSession('pandasay "CyberTerm is online"');
            }, 800);
          });
        }
      }}
    ];

    this.initEvents();
  }

  initEvents() {
    if (!this.overlay || !this.input) return;

    this.input.addEventListener('input', () => {
      this.filter(this.input.value);
    });

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigate(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigate(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.executeSelected();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    this.overlay.classList.add('visible');
    this.input.value = '';
    this.filter('');
    setTimeout(() => {
      this.input.focus();
    }, 30);
  }

  close() {
    this.isOpen = false;
    this.overlay.classList.remove('visible');
    if (window.terminalManager) {
      window.terminalManager.getActiveSession()?.focus();
    }
  }

  filter(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
      this.filteredCommands = [...this.commands];
    } else {
      this.filteredCommands = this.commands.filter(cmd => 
        cmd.title.toLowerCase().includes(q) || cmd.category.toLowerCase().includes(q)
      );
    }

    this.selectedIndex = 0;
    this.render();
  }

  navigate(delta) {
    if (this.filteredCommands.length === 0) return;
    this.selectedIndex += delta;
    if (this.selectedIndex < 0) this.selectedIndex = this.filteredCommands.length - 1;
    if (this.selectedIndex >= this.filteredCommands.length) this.selectedIndex = 0;
    this.render();
    this.scrollSelectedIntoView();
  }

  render() {
    if (!this.list) return;
    if (this.filteredCommands.length === 0) {
      this.list.innerHTML = `<div class="palette-empty">No matching commands found</div>`;
      return;
    }

    this.list.innerHTML = this.filteredCommands.map((cmd, idx) => `
      <div class="palette-item ${idx === this.selectedIndex ? 'selected' : ''}" data-index="${idx}">
        <span class="palette-icon">${cmd.icon}</span>
        <div class="palette-text-group">
          <span class="palette-title">${this.escapeHtml(cmd.title)}</span>
          <span class="palette-category">${cmd.category}</span>
        </div>
      </div>
    `).join('');

    this.list.querySelectorAll('.palette-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.getAttribute('data-index'), 10);
        this.selectedIndex = idx;
        this.executeSelected();
      });
    });
  }

  scrollSelectedIntoView() {
    const active = this.list?.querySelector('.palette-item.selected');
    if (active) {
      active.scrollIntoView({ block: 'nearest' });
    }
  }

  executeSelected() {
    const cmd = this.filteredCommands[this.selectedIndex];
    if (cmd && cmd.action) {
      this.close();
      try {
        cmd.action();
      } catch (e) {
        console.error('[CYBERTERM] Palette command execution error:', e);
      }
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

window.CommandPalette = CommandPalette;
