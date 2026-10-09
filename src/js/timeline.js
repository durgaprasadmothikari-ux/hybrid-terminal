// CYBERTERM SESSION TIME MACHINE (Searchable Terminal Timeline)

class SessionTimeMachine {
  constructor() {
    this.storageKey = 'cyberterm_timeline_v1';
    this.entries = this.load();
    this.activeEntryMap = new Map(); // sessionId -> activeEntry
  }

  load() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {}
    return [];
  }

  save() {
    try {
      // Retain max 300 recent events
      if (this.entries.length > 300) {
        this.entries = this.entries.slice(0, 300);
      }
      localStorage.setItem(this.storageKey, JSON.stringify(this.entries));
    } catch (e) {}
  }

  recordCommand(sessionId, command, shell, cwd) {
    if (!command || !command.trim()) return null;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const dateStr = now.toISOString().split('T')[0];

    const entry = {
      id: `ev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sessionId,
      time: timeStr,
      date: dateStr,
      timestamp: Date.now(),
      command: command.trim(),
      shell: shell || 'powershell',
      cwd: cwd || '~',
      status: 'RUNNING',
      exitCode: null,
      outputSnippet: ''
    };

    this.entries.unshift(entry);
    this.activeEntryMap.set(sessionId, entry);
    this.save();
    return entry;
  }

  recordOutput(sessionId, textChunk) {
    const entry = this.activeEntryMap.get(sessionId);
    if (!entry || !textChunk) return;
    const clean = textChunk.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
    if (entry.outputSnippet.length < 500) {
      entry.outputSnippet += clean.slice(0, 500 - entry.outputSnippet.length);
    }
  }

  finishCommand(sessionId, exitCode) {
    const entry = this.activeEntryMap.get(sessionId);
    if (!entry) return;
    entry.exitCode = exitCode;
    entry.status = exitCode === 0 ? 'SUCCESS' : (exitCode === null ? 'STOPPED' : 'ERROR');
    this.activeEntryMap.delete(sessionId);
    this.save();
  }

  search(query, shellFilter = 'ALL', errorOnly = false) {
    const q = (query || '').toLowerCase().trim();
    return this.entries.filter(e => {
      if (shellFilter !== 'ALL' && e.shell !== shellFilter.toLowerCase()) return false;
      if (errorOnly && e.status !== 'ERROR') return false;
      if (!q) return true;
      return e.command.toLowerCase().includes(q) || (e.outputSnippet && e.outputSnippet.toLowerCase().includes(q)) || e.cwd.toLowerCase().includes(q);
    });
  }

  clear() {
    this.entries = [];
    this.save();
  }
}

window.SessionTimeMachine = SessionTimeMachine;
