// CYBERTERM SYSTEM HUD, HARDWARE TELEMETRY & MONITOR ENGINE

class HudController {
  constructor() {
    this.bootOverlay = document.getElementById('boot-overlay');
    this.operatorName = window.settingsManager ? window.settingsManager.get('operatorName') : 'MOTHIKARI DURGA PRASAD';
    this.events = [];
    this.bootSkipped = false;
    this.bootTimer = [];

    this.initOperator();
    this.initBootSequence();
    this.initWindowControls();
    this.initClock();
    this.initSegmentedBars();
    this.startTelemetryLoop();

    this.addEvent('System kernel linked');
    this.addEvent('ConPTY subsystem ready');
  }

  initOperator() {
    const bootOpElem = document.getElementById('boot-operator-name');
    const monOpElem = document.getElementById('mon-identity-name');
    if (bootOpElem) bootOpElem.textContent = this.operatorName;
    if (monOpElem) monOpElem.textContent = this.operatorName;
  }

  setOperatorName(newName) {
    if (!newName || !newName.trim()) return;
    this.operatorName = newName.trim();
    if (window.settingsManager) {
      window.settingsManager.set('operatorName', this.operatorName);
    }
    this.initOperator();
    this.addEvent(`Operator ID: ${this.operatorName}`);
  }

  initSegmentedBars() {
    const ramTrack = document.getElementById('ram-segments');
    const storageTrack = document.getElementById('storage-segments');

    if (ramTrack) {
      ramTrack.innerHTML = '';
      for (let i = 0; i < 16; i++) {
        const seg = document.createElement('div');
        seg.className = 'meter-segment';
        seg.id = `ram-seg-${i}`;
        ramTrack.appendChild(seg);
      }
    }

    if (storageTrack) {
      storageTrack.innerHTML = '';
      for (let i = 0; i < 16; i++) {
        const seg = document.createElement('div');
        seg.className = 'meter-segment';
        seg.id = `storage-seg-${i}`;
        storageTrack.appendChild(seg);
      }
    }
  }

  updateSegmentedMeter(prefix, percent, colorClass) {
    const totalSegs = 16;
    const activeCount = Math.round((percent / 100) * totalSegs);
    for (let i = 0; i < totalSegs; i++) {
      const el = document.getElementById(`${prefix}-seg-${i}`);
      if (el) {
        if (i < activeCount) {
          el.className = `meter-segment ${colorClass}`;
        } else {
          el.className = 'meter-segment';
        }
      }
    }
  }

  initBootSequence() {
    if (!this.bootOverlay) return;

    const enabled = window.settingsManager ? window.settingsManager.get('bootSeqEnabled') : true;
    if (!enabled) {
      this.bootOverlay.classList.add('hidden');
      if (window.terminalManager) {
        window.terminalManager.getActiveSession()?.focus();
      }
      return;
    }

    // Skip boot sequence on ESC, any key, or click
    const handleSkip = () => {
      if (this.bootSkipped) return;
      this.skipBootSequence();
    };

    window.addEventListener('keydown', handleSkip, { once: false });
    this.bootOverlay.addEventListener('click', handleSkip);

    const actLine = document.getElementById('boot-act-line');
    const sub1 = document.getElementById('boot-sub-1');
    const sub2 = document.getElementById('boot-sub-2');
    const sub3 = document.getElementById('boot-sub-3');
    const sub4 = document.getElementById('boot-sub-4');
    const sub5 = document.getElementById('boot-sub-5');
    const opBox = document.getElementById('boot-op-console');
    const fill = document.getElementById('boot-progress-fill');

    // Populate initial real telemetry into snapshot
    if (window.cyberAPI && window.cyberAPI.system) {
      window.cyberAPI.system.getTelemetry().then((stats) => {
        if (stats) {
          const sCpu = document.getElementById('boot-snap-cpu');
          const sRam = document.getElementById('boot-snap-ram');
          const sStorage = document.getElementById('boot-snap-storage');
          const sNet = document.getElementById('boot-snap-net');
          const sHost = document.getElementById('boot-host-label');

          if (sCpu) sCpu.textContent = `${stats.cpuPercent}%`;
          if (sRam) sRam.textContent = `${stats.usedMemGb} GB`;
          if (sStorage && stats.storage) sStorage.textContent = `${stats.storage.percent}% [${stats.storage.drive}]`;
          if (sNet && stats.network) sNet.textContent = stats.network.status;
          if (sHost && stats.hostname) sHost.textContent = stats.hostname;
        }
      }).catch(() => {});
    }

    // Sequential timing
    this.bootTimer = [
      setTimeout(() => { if (!this.bootSkipped && actLine) actLine.style.width = '100%'; }, 150),
      setTimeout(() => { if (!this.bootSkipped && sub1) sub1.classList.add('visible'); }, 350),
      setTimeout(() => { if (!this.bootSkipped && sub2) sub2.classList.add('visible'); }, 650),
      setTimeout(() => { if (!this.bootSkipped && sub3) sub3.classList.add('visible'); }, 950),
      setTimeout(() => { if (!this.bootSkipped && sub4) sub4.classList.add('visible'); }, 1250),
      setTimeout(() => { if (!this.bootSkipped && sub5) sub5.classList.add('visible'); }, 1550),
      setTimeout(() => {
        if (!this.bootSkipped) {
          if (opBox) opBox.classList.add('visible');
          if (fill) fill.style.width = '100%';
        }
      }, 1850),
      setTimeout(() => {
        if (!this.bootSkipped) {
          this.finishBoot();
        }
      }, 2600)
    ];
  }

  skipBootSequence() {
    this.bootSkipped = true;
    if (this.bootTimer) {
      this.bootTimer.forEach(t => clearTimeout(t));
    }
    const fill = document.getElementById('boot-progress-fill');
    if (fill) fill.style.width = '100%';
    this.finishBoot();
  }

  finishBoot() {
    if (this.bootOverlay) {
      this.bootOverlay.classList.add('hidden');
    }
    setTimeout(() => {
      if (window.terminalManager) {
        window.terminalManager.getActiveSession()?.focus();
      }
    }, 100);
  }

  initWindowControls() {
    const minBtn = document.getElementById('btn-win-min');
    const maxBtn = document.getElementById('btn-win-max');
    const closeBtn = document.getElementById('btn-win-close');
    const pinBtn = document.getElementById('btn-win-pin');

    if (minBtn) minBtn.addEventListener('click', () => window.cyberAPI?.window.minimize());
    if (maxBtn) maxBtn.addEventListener('click', () => window.cyberAPI?.window.maximize());
    if (closeBtn) closeBtn.addEventListener('click', () => window.cyberAPI?.window.close());

    if (pinBtn) {
      pinBtn.addEventListener('click', () => {
        this.toggleAlwaysOnTop();
      });
    }

    // Monitor Toggle Buttons
    const monToggleBtn = document.getElementById('btn-toggle-monitor');
    const monCollapseBtn = document.getElementById('btn-collapse-monitor');

    if (monToggleBtn) monToggleBtn.addEventListener('click', () => this.toggleMonitor());
    if (monCollapseBtn) monCollapseBtn.addEventListener('click', () => this.toggleMonitor());
  }

  toggleAlwaysOnTop() {
    const pinBtn = document.getElementById('btn-win-pin');
    if (window.cyberAPI && window.cyberAPI.window) {
      const isPinned = window.cyberAPI.window.toggleAlwaysOnTop();
      if (pinBtn) pinBtn.classList.toggle('active', isPinned);
      this.addEvent(`Window pin: ${isPinned ? 'ON' : 'OFF'}`);
    }
  }

  toggleMonitor() {
    const monPanel = document.getElementById('system-monitor-panel');
    const monToggleBtn = document.getElementById('btn-toggle-monitor');
    const monCollapseBtn = document.getElementById('btn-collapse-monitor');
    if (!monPanel) return;

    const isCollapsed = monPanel.classList.toggle('collapsed');
    if (monToggleBtn) monToggleBtn.classList.toggle('active', !isCollapsed);
    if (monCollapseBtn) monCollapseBtn.textContent = isCollapsed ? '[ < ]' : '[ > ]';
    this.addEvent(`Monitor: ${isCollapsed ? 'COLLAPSED' : 'EXPANDED'}`);

    // Trigger auto-fit on active terminals after transition
    setTimeout(() => {
      if (window.terminalManager) {
        window.terminalManager.fitActiveSessions();
        window.terminalManager.getActiveSession()?.focus();
      }
    }, 280);
  }

  initClock() {
    const clockElem = document.getElementById('status-clock');
    const dateElem = document.getElementById('status-date');

    const tick = () => {
      const now = new Date();
      if (clockElem) {
        clockElem.textContent = now.toTimeString().split(' ')[0];
      }
      if (dateElem) {
        const day = String(now.getDate()).padStart(2, '0');
        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const month = monthNames[now.getMonth()];
        const year = now.getFullYear();
        dateElem.textContent = `${day} ${month} ${year}`;
      }
    };

    tick();
    setInterval(tick, 1000);
  }

  formatUptime(sec) {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (d > 0) return `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  addEvent(text) {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    this.events.unshift({ time: timeStr, text });
    if (this.events.length > 8) this.events.pop();

    const list = document.getElementById('events-list');
    if (list) {
      list.innerHTML = this.events.map(ev => `
        <div class="event-entry">
          <span class="event-entry-time">${ev.time}</span>
          <span class="event-entry-text">${ev.text}</span>
        </div>
      `).join('');
    }
  }

  updateCpuWaveform(history) {
    if (!history || history.length === 0) return;
    const poly = document.getElementById('cpu-polyline');
    const area = document.getElementById('cpu-polygon');
    if (!poly || !area) return;

    const width = 260;
    const height = 44;
    const step = width / (history.length - 1);

    const points = history.map((val, idx) => {
      const x = Math.round(idx * step);
      const y = Math.round(height - (val / 100) * (height - 6) - 3);
      return `${x},${y}`;
    });

    poly.setAttribute('points', points.join(' '));
    area.setAttribute('points', `0,${height} ${points.join(' ')} ${width},${height}`);
  }

  startTelemetryLoop() {
    const stripCpu = document.getElementById('strip-cpu');
    const stripCpuCores = document.getElementById('strip-cpu-cores');
    const stripRam = document.getElementById('strip-ram');
    const stripRamPercent = document.getElementById('strip-ram-percent');
    const stripStorage = document.getElementById('strip-storage');
    const stripStoragePercent = document.getElementById('strip-storage-percent');
    const stripUptime = document.getElementById('strip-uptime');
    const stripNet = document.getElementById('strip-net');
    const stripNetIp = document.getElementById('strip-net-ip');

    const monCpuPercent = document.getElementById('mon-cpu-percent');
    const monCpuLoad = document.getElementById('mon-cpu-load-tag');
    const monCpuCores = document.getElementById('mon-cpu-cores-label');

    const monRamPercent = document.getElementById('mon-ram-percent');
    const monRamUsed = document.getElementById('mon-ram-used');
    const monRamTotal = document.getElementById('mon-ram-total');

    const monStoragePercent = document.getElementById('mon-storage-percent');
    const monStorageUsed = document.getElementById('mon-storage-used');
    const monStorageTotal = document.getElementById('mon-storage-total');

    const monNetIp = document.getElementById('mon-net-ip');
    const monNetIface = document.getElementById('mon-net-iface');
    const monIdentityHost = document.getElementById('mon-identity-host');
    const topHostLabel = document.getElementById('top-host-label');

    const statusCpu = document.getElementById('status-cpu-val');
    const statusRam = document.getElementById('status-ram-val');
    const statusDir = document.getElementById('status-dir-display');

    const update = async () => {
      try {
        if (!window.cyberAPI || !window.cyberAPI.system) return;
        const stats = await window.cyberAPI.system.getTelemetry();
        if (!stats) return;

        // Strip Telemetry
        if (stripCpu) stripCpu.textContent = `${stats.cpuPercent}%`;
        if (stripCpuCores) stripCpuCores.textContent = `[${stats.cpuCores || 16} CORES]`;
        if (stripRam) stripRam.textContent = `${stats.usedMemGb} / ${stats.totalMemGb} GB`;
        if (stripRamPercent) stripRamPercent.textContent = `[${stats.memPercent}%]`;

        if (stripStorage && stats.storage) {
          stripStorage.textContent = `${stats.storage.usedGb} / ${stats.storage.totalGb} GB [${stats.storage.drive}]`;
          if (stripStoragePercent) stripStoragePercent.textContent = `[${stats.storage.percent}%]`;
        }
        if (stripUptime) stripUptime.textContent = this.formatUptime(stats.uptimeSeconds);
        if (stripNet && stats.network) {
          stripNet.textContent = stats.network.status;
          if (stripNetIp) stripNetIp.textContent = `[${stats.network.ip}]`;
        }

        // Monitor CPU
        if (monCpuPercent) monCpuPercent.textContent = `${stats.cpuPercent}%`;
        if (monCpuLoad) {
          monCpuLoad.textContent = stats.cpuPercent >= 70 ? 'ELEVATED' : 'NORMAL';
          monCpuLoad.style.color = stats.cpuPercent >= 70 ? 'var(--color-warning)' : 'var(--color-success)';
        }
        if (monCpuCores && stats.cpuModel) {
          monCpuCores.textContent = `${stats.cpuCores} CORES // ${stats.cpuModel.slice(0, 22)}`;
        }
        if (stats.cpuHistory) {
          this.updateCpuWaveform(stats.cpuHistory);
        }

        // Monitor RAM (Segmented)
        if (monRamPercent) monRamPercent.textContent = `${stats.memPercent}%`;
        if (monRamUsed) monRamUsed.textContent = `${stats.usedMemGb} GB`;
        if (monRamTotal) monRamTotal.textContent = `of ${stats.totalMemGb} GB`;
        this.updateSegmentedMeter('ram', stats.memPercent, 'active-blue');

        // Monitor Storage (Segmented)
        if (stats.storage) {
          if (monStoragePercent) monStoragePercent.textContent = `${stats.storage.percent}%`;
          if (monStorageUsed) monStorageUsed.textContent = `${stats.storage.usedGb} GB`;
          if (monStorageTotal) monStorageTotal.textContent = `of ${stats.storage.totalGb} GB`;
          this.updateSegmentedMeter('storage', stats.storage.percent, 'active-cyan');
        }

        // Monitor Network
        if (stats.network) {
          if (monNetIp) monNetIp.textContent = stats.network.ip;
          if (monNetIface) monNetIface.textContent = `${stats.network.name} (${stats.network.status})`;
        }

        // Host labels
        if (monIdentityHost && stats.hostname) monIdentityHost.textContent = stats.hostname;
        if (topHostLabel && stats.hostname) topHostLabel.textContent = stats.hostname;

        // Bottom status
        if (statusCpu) statusCpu.textContent = `${stats.cpuPercent}%`;
        if (statusRam) statusRam.textContent = `${stats.usedMemGb} GB`;
        if (statusDir && stats.cwd) statusDir.textContent = stats.cwd;

      } catch (e) {}
    };

    update();
    setInterval(update, 2000);
  }
}

window.HudController = HudController;
