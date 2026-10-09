// CYBERTERM TERMINAL SESSION (XTerm.js + Windows ConPTY)

class TerminalSession {
  constructor({ sessionId, shellType, cwd, container, onTitleChange, onExit }) {
    this.sessionId = sessionId;
    this.shellType = shellType || 'powershell';
    this.cwd = cwd || '';
    this.container = container;
    this.onTitleChange = onTitleChange || (() => {});
    this.onExit = onExit || (() => {});
    this.title = this.getDefaultTitle();
    this.isAlive = true;

    this.init();
  }

  getDefaultTitle() {
    switch (this.shellType) {
      case 'powershell': return 'PowerShell';
      case 'cmd': return 'Command Prompt';
      case 'wsl': return 'WSL (Ubuntu)';
      case 'gitbash': return 'Git Bash';
      default: return 'Terminal';
    }
  }

  init() {
    const settings = window.settingsManager;
    const theme = settings ? settings.getTerminalTheme() : {};

    // Create wrapper element for this session
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'xterm-session-wrapper';
    this.wrapper.id = `session-wrapper-${this.sessionId}`;
    this.container.appendChild(this.wrapper);

    // Initialize XTerm.js
    const TerminalClass = window.Terminal?.Terminal || window.Terminal;
    this.term = new TerminalClass({
      cursorBlink: settings ? settings.get('cursorBlink') : true,
      cursorStyle: settings ? settings.get('cursorStyle') : 'block',
      fontFamily: settings ? settings.get('fontFamily') : 'Cascadia Code, JetBrains Mono, Consolas, monospace',
      fontSize: settings ? settings.get('fontSize') : 13,
      lineHeight: settings ? settings.get('lineHeight') : 1.25,
      scrollback: settings ? settings.get('scrollback') : 10000,
      theme: theme,
      allowTransparency: true,
      macOptionIsMeta: true,
      rightClickSelectsWord: true,
      windowsMode: true
    });

    // Load Addons
    const FitClass = window.FitAddon?.FitAddon || window.FitAddon;
    if (FitClass) {
      this.fitAddon = new FitClass();
      this.term.loadAddon(this.fitAddon);
    }

    const WebLinksClass = window.WebLinksAddon?.WebLinksAddon || window.WebLinksAddon;
    if (WebLinksClass) {
      this.webLinksAddon = new WebLinksClass();
      this.term.loadAddon(this.webLinksAddon);
    }

    // Open XTerm inside wrapper
    this.term.open(this.wrapper);

    // Bind PTY data out
    this.term.onData((data) => {
      if (this.isAlive && window.cyberAPI && window.cyberAPI.pty) {
        window.cyberAPI.pty.write(this.sessionId, data);
      }
    });

    // Handle Title Change from shell VT sequences
    this.term.onTitleChange((newTitle) => {
      if (newTitle && newTitle.trim()) {
        this.title = newTitle.trim();
        this.onTitleChange(this.sessionId, this.title);
      }
    });

    // Custom Key Event Handling
    this.term.attachCustomKeyEventHandler((e) => {
      if (e.type !== 'keydown') return true;

      // Ctrl+Shift+C: Always Copy
      if (e.ctrlKey && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        this.copySelection();
        return false;
      }

      // Ctrl+Shift+V: Always Paste
      if (e.ctrlKey && e.shiftKey && (e.key === 'v' || e.key === 'V')) {
        this.pasteClipboard();
        return false;
      }

      // Ctrl+C: If there is a selection, copy it; otherwise allow SIGINT (\x03) to pass to shell
      if (e.ctrlKey && !e.shiftKey && !e.altKey && (e.key === 'c' || e.key === 'C')) {
        if (this.term.hasSelection()) {
          this.copySelection();
          return false;
        }
        return true;
      }

      // Ctrl+V: Paste from clipboard
      if (e.ctrlKey && !e.shiftKey && !e.altKey && (e.key === 'v' || e.key === 'V')) {
        this.pasteClipboard();
        return false;
      }

      // Ctrl+L: Clear terminal screen
      if (e.ctrlKey && !e.shiftKey && !e.altKey && (e.key === 'l' || e.key === 'L')) {
        this.term.clear();
        return false;
      }

      // Ctrl+Plus or Ctrl+=: Increase font size
      if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
        this.adjustFontSize(1);
        return false;
      }

      // Ctrl+Minus: Decrease font size
      if (e.ctrlKey && (e.key === '-' || e.key === '_')) {
        this.adjustFontSize(-1);
        return false;
      }

      // Ctrl+0: Reset font size
      if (e.ctrlKey && e.key === '0') {
        this.resetFontSize();
        return false;
      }

      return true;
    });

    // Copy on selection if enabled
    this.term.onSelectionChange(() => {
      if (settings && settings.get('copyOnSelect')) {
        const sel = this.term.getSelection();
        if (sel && sel.length > 0) {
          if (window.cyberAPI && window.cyberAPI.system) {
            window.cyberAPI.system.copyText(sel);
          }
        }
      }
    });

    // Setup Context Menu
    this.setupContextMenu();

    // Initial Fit
    setTimeout(() => {
      this.fit();
    }, 50);
  }

  async copySelection() {
    const sel = this.term.getSelection();
    if (sel && window.cyberAPI && window.cyberAPI.system) {
      await window.cyberAPI.system.copyText(sel);
    }
  }

  async pasteClipboard() {
    try {
      if (window.cyberAPI && window.cyberAPI.system) {
        const text = await window.cyberAPI.system.readText();
        if (text) {
          this.term.paste(text);
        }
      }
    } catch (e) {}
  }

  adjustFontSize(delta) {
    const current = this.term.options.fontSize || 13;
    const next = Math.min(Math.max(current + delta, 9), 28);
    this.term.options.fontSize = next;
    if (window.settingsManager) {
      window.settingsManager.set('fontSize', next);
    }
    this.fit();
  }

  resetFontSize() {
    this.term.options.fontSize = 13;
    if (window.settingsManager) {
      window.settingsManager.set('fontSize', 13);
    }
    this.fit();
  }

  write(data) {
    if (this.term) {
      this.term.write(data);
    }
  }

  fit() {
    if (!this.fitAddon || !this.wrapper || this.wrapper.offsetParent === null) return;
    try {
      this.fitAddon.fit();
      if (this.isAlive && window.cyberAPI && window.cyberAPI.pty) {
        const cols = this.term.cols;
        const rows = this.term.rows;
        if (cols > 0 && rows > 0) {
          window.cyberAPI.pty.resize(this.sessionId, cols, rows);
        }
      }
    } catch (e) {}
  }

  focus() {
    if (this.term) {
      this.term.focus();
    }
  }

  clear() {
    if (this.term) {
      this.term.clear();
    }
  }

  updateOptions() {
    const settings = window.settingsManager;
    if (!settings || !this.term) return;

    this.term.options.cursorBlink = settings.get('cursorBlink');
    this.term.options.cursorStyle = settings.get('cursorStyle');
    this.term.options.fontFamily = settings.get('fontFamily');
    this.term.options.fontSize = settings.get('fontSize');
    this.term.options.lineHeight = settings.get('lineHeight');
    this.term.options.scrollback = settings.get('scrollback');
    this.fit();
  }

  updateTheme() {
    const settings = window.settingsManager;
    if (!settings || !this.term) return;
    this.term.options.theme = settings.getTerminalTheme();
  }

  setupContextMenu() {
    this.wrapper.addEventListener('contextmenu', async (e) => {
      e.preventDefault();
      const menu = document.getElementById('terminal-context-menu');
      if (!menu) return;

      menu.style.top = `${e.clientY}px`;
      menu.style.left = `${e.clientX}px`;
      menu.classList.add('visible');

      // Set active session context
      window.activeContextMenuSession = this;
    });
  }

  destroy() {
    this.isAlive = false;
    if (window.cyberAPI && window.cyberAPI.pty) {
      window.cyberAPI.pty.killSession(this.sessionId);
    }
    if (this.term) {
      try {
        this.term.dispose();
      } catch (e) {}
    }
    if (this.wrapper && this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
  }
}

window.TerminalSession = TerminalSession;
