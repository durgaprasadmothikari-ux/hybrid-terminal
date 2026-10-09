// CYBERTERM WORKSPACES ENGINE (Multi-Environment State Restoration)

class WorkspaceManager {
  constructor() {
    this.storageKey = 'cyberterm_workspaces_v1';
    this.activeWorkspaceName = localStorage.getItem('cyberterm_active_workspace') || 'Default';
    this.workspaces = this.load();

    // Ensure default workspace exists
    if (!this.workspaces['Default']) {
      this.workspaces['Default'] = {
        name: 'Default',
        theme: 'cyber-blue',
        tabs: [{ shellType: 'powershell', cwd: '' }],
        cockpitPanel: 'ai',
        updatedAt: Date.now()
      };
      this.save();
    }
  }

  load() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return {};
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.workspaces));
      localStorage.setItem('cyberterm_active_workspace', this.activeWorkspaceName);
    } catch (e) {}
  }

  list() {
    return Object.values(this.workspaces);
  }

  get(name) {
    return this.workspaces[name];
  }

  async saveCurrent(name) {
    const wsName = (name || this.activeWorkspaceName || 'Custom').trim();
    if (!wsName) return;

    const tm = window.terminalManager;
    if (!tm) return;

    const tabsData = tm.tabs.map(t => ({
      shellType: t.shellType,
      cwd: t.primarySession ? t.primarySession.cwd : '',
      title: t.title,
      isSplit: t.isSplit
    }));

    const currentTheme = window.settingsManager ? window.settingsManager.get('theme') : 'cyber-blue';
    const activeCockpit = window.cockpitController ? window.cockpitController.activeTab : 'ai';

    this.workspaces[wsName] = {
      name: wsName,
      theme: currentTheme,
      tabs: tabsData.length > 0 ? tabsData : [{ shellType: 'powershell', cwd: '' }],
      cockpitPanel: activeCockpit,
      updatedAt: Date.now()
    };

    this.activeWorkspaceName = wsName;
    this.save();

    if (window.hudController) {
      window.hudController.addEvent(`Workspace saved: ${wsName}`);
    }

    this.updateUI();
  }

  async applyWorkspace(name) {
    const ws = this.workspaces[name];
    if (!ws) return false;

    this.activeWorkspaceName = name;
    this.save();

    const tm = window.terminalManager;
    if (!tm) return false;

    // Apply theme
    if (ws.theme && window.settingsManager) {
      window.settingsManager.set('theme', ws.theme);
    }

    // Apply Cockpit panel
    if (ws.cockpitPanel && window.cockpitController) {
      window.cockpitController.switchTab(ws.cockpitPanel);
    }

    // Cleanly close existing tabs and restore workspace tabs
    const existingTabIds = tm.tabs.map(t => t.id);
    for (const t of ws.tabs) {
      const tabObj = await tm.createTab(t.shellType, t.cwd);
      if (t.isSplit) {
        await tm.toggleSplit(tabObj.id);
      }
    }

    // Close old tabs
    existingTabIds.forEach(id => tm.closeTab(id));

    if (window.hudController) {
      window.hudController.addEvent(`Switched workspace: ${name}`);
    }

    this.updateUI();
    return true;
  }

  delete(name) {
    if (name === 'Default') return;
    delete this.workspaces[name];
    if (this.activeWorkspaceName === name) {
      this.activeWorkspaceName = 'Default';
    }
    this.save();
    this.updateUI();
  }

  updateUI() {
    const label = document.getElementById('top-workspace-label');
    if (label) {
      label.textContent = this.activeWorkspaceName.toUpperCase();
    }
    const select = document.getElementById('workspace-dropdown-select');
    if (select) {
      select.innerHTML = this.list().map(w => `
        <option value="${w.name}" ${w.name === this.activeWorkspaceName ? 'selected' : ''}>${w.name}</option>
      `).join('');
    }
  }
}

window.WorkspaceManager = WorkspaceManager;
