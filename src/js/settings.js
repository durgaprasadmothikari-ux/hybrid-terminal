// CYBERTERM SETTINGS & CONFIGURATION ENGINE

class SettingsManager {
  constructor() {
    this.storageKey = 'cyberterm_config_v2';
    this.defaults = {
      theme: 'cyber-blue',
      fontFamily: 'Cascadia Code, JetBrains Mono, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.25,
      cursorStyle: 'block', // 'block' | 'underline' | 'bar'
      cursorBlink: true,
      scrollback: 10000,
      defaultShell: 'powershell',
      defaultCwd: '',
      windowOpacity: 1.0,
      scanlines: false,
      bootSeqEnabled: true,
      copyOnSelect: true,
      operatorName: 'MOTHIKARI DURGA PRASAD',
      aiProvider: 'offline', // 'offline' | 'gemini' | 'ollama'
      aiApiKey: '',
      aiEndpoint: 'http://localhost:11434',
      aiModel: 'gemini-1.5-flash',
      riskWarnings: true
    };

    this.settings = this.loadSettings();
    this.applyAll();
  }

  loadSettings() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return { ...this.defaults, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('[CYBERTERM] Failed to parse stored settings:', e);
    }
    return { ...this.defaults };
  }

  saveSettings() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('[CYBERTERM] Failed to save settings:', e);
    }
  }

  get(key) {
    return this.settings[key] !== undefined ? this.settings[key] : this.defaults[key];
  }

  set(key, value) {
    this.settings[key] = value;
    this.saveSettings();
    this.applyKey(key, value);
  }

  applyAll() {
    this.applyTheme(this.settings.theme);
    this.applyOpacity(this.settings.windowOpacity);
    this.applyScanlines(this.settings.scanlines);
  }

  applyKey(key, value) {
    if (key === 'theme') this.applyTheme(value);
    else if (key === 'windowOpacity') this.applyOpacity(value);
    else if (key === 'scanlines') this.applyScanlines(value);
    else if (key === 'fontSize' || key === 'fontFamily' || key === 'cursorStyle' || key === 'cursorBlink' || key === 'scrollback') {
      if (window.terminalManager) {
        window.terminalManager.updateTerminalOptions();
      }
    }
  }

  applyTheme(themeName) {
    const root = document.documentElement;
    root.setAttribute('data-theme', themeName || 'cyber-blue');
    if (window.terminalManager) {
      window.terminalManager.updateThemeColors();
    }
  }

  applyOpacity(opacityVal) {
    const val = Math.min(Math.max(parseFloat(opacityVal) || 1.0, 0.4), 1.0);
    if (window.cyberAPI && window.cyberAPI.window) {
      window.cyberAPI.window.setOpacity(val);
    }
  }

  applyScanlines(enabled) {
    const app = document.getElementById('cyber-app');
    if (app) {
      if (enabled) {
        app.classList.add('crt-scanlines');
      } else {
        app.classList.remove('crt-scanlines');
      }
    }
  }

  getTerminalTheme() {
    const cs = getComputedStyle(document.documentElement);
    return {
      background: cs.getPropertyValue('--term-bg').trim() || '#030508',
      foreground: cs.getPropertyValue('--term-fg').trim() || '#e2e8f0',
      cursor: cs.getPropertyValue('--term-cursor').trim() || '#38bdf8',
      cursorAccent: cs.getPropertyValue('--bg-void').trim() || '#030508',
      selectionBackground: cs.getPropertyValue('--term-selection').trim() || 'rgba(37, 99, 235, 0.35)',
      black: '#0a0e14',
      red: '#ef4444',
      green: '#10b981',
      yellow: '#f59e0b',
      blue: '#3b82f6',
      magenta: '#a855f7',
      cyan: '#06b6d4',
      white: '#f1f5f9',
      brightBlack: '#475569',
      brightRed: '#f87171',
      brightGreen: '#34d399',
      brightYellow: '#fbbf24',
      brightBlue: '#60a5fa',
      brightMagenta: '#c084fc',
      brightCyan: '#38bdf8',
      brightWhite: '#ffffff'
    };
  }
}

window.SettingsManager = SettingsManager;
