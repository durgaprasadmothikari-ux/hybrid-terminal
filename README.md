# CYBERTERM // Production Terminal Workstation

A fast, reliable, and production-grade terminal workstation built for everyday use, combining the capabilities and workflows of **Windows PowerShell**, **Windows Command Prompt (CMD)**, **WSL 2 / Ubuntu Linux**, and **Git Bash** within a futuristic cyber-operations interface.

Powered by **Windows ConPTY** (`node-pty`) and **XTerm.js** with true VT100/VT220 ANSI rendering, multiple sessions/tabs, split views, a fast command palette, theme customization, and live hardware telemetry.

---

## ⚡ Key Features

- **Real ConPTY Backend Execution**:
  - Direct pseudo-terminal (ConPTY) communication on Windows.
  - Native support for interactive terminal CLI tools: `python`, `node`, `git`, `ssh`, `vim`, `nano`, `htop`, `top`, `powershell`, compilers, and package managers.
  - Full support for `stdin`, `stdout`, `stderr`, raw keystrokes, Tab completion, arrow keys, Backspace, Delete, Home, End, Page Up, and Page Down.
  - True `Ctrl+C` interrupt behavior (sends SIGINT to running processes, or copies when text is selected).
  - Clean process tree management — zero orphaned child processes or leaked shells on exit.

- **100% Compliant VT / ANSI Terminal Rendering**:
  - Driven by **XTerm.js 5+** with `@xterm/addon-fit` and `@xterm/addon-web-links`.
  - Zero corrupted characters or unparsed VT sequences. Full support for Unicode, UTF-8, box-drawing characters, emojis, and ANSI 256/24-bit truecolor.
  - Smooth 60fps scrolling across 10,000+ line logs without application freezing.
  - Dynamic viewport resizing synchronized directly with backend ConPTY cols/rows.

- **Multi-Session & Tab Management**:
  - Independent tabs with their own shell process, working directory, and scrollback.
  - Quick launcher for **PWSH**, **CMD**, **WSL (Ubuntu)**, and **Git Bash**.
  - **Split Terminal**: Side-by-side split view within any tab (`Ctrl+\` or `Ctrl+Shift+D`).
  - Tab rename on double-click, drag-free quick switching (`Ctrl+Tab`, `Ctrl+1..9`).

- **Command Palette (`Ctrl+Shift+P` / `F1`)**:
  - Instant searchable command overlay to create tabs, split terminals, switch themes, clear screens, restart shells, and adjust fonts with pure keyboard navigation.

- **System Telemetry & Live Hardware Monitor**:
  - Real-time CPU load with dynamic SVG waveform history.
  - Segmented 16-bar RAM and Storage [C:] meters.
  - Live network adapter status and local IPv4 address.
  - Collapsible/expandable asymmetrical monitor panel.

- **Cyber AI Copilot & Offline Diagnostics**:
  - Offline expert diagnostic engine detects errors in real time (missing packages, `EADDRINUSE`, git issues, missing executables) and offers verified one-click fixes.
  - Pluggable AI provider: switch between the fast offline engine, Google Gemini API, and local Ollama (`http://localhost:11434`).
  - Natural Language Command Builder: converts English intents into accurate shell commands.
  - Universal Command Translator: converts commands between Bash, PowerShell, CMD, and Git Bash.
  - Command Explainer: parses command flags and syntax into clear explanations.

- **Command Risk Shield**:
  - Proactively flags destructive commands (`rm -rf /`, `del /s /q c:\`, `Remove-Item -Recurse -Force`, `git reset --hard`).
  - Blocks execution until the user reviews the risk level and explicitly confirms in the shield modal.

- **Development Cockpit & Integrated Intelligence**:
  - **Process Radar**: Real Windows process table via CIM, tracking memory footprint, active terminal session trees, and one-click PID termination.
  - **Git Intelligence**: Live branch, ahead/behind status, modified/staged/untracked files, and recent commit history.
  - **Smart File Navigator**: Real-time directory tree browser with path navigation and click-to-copy.
  - **Session Time Machine**: Searchable timeline of historical commands, exit codes, and output across all shells with one-click re-run.
  - **Project Intelligence Banner**: Detects project roots (Node, Python, Rust, Go, C/C++) and provides contextual quick-action buttons.

- **Cyber Workspaces Engine**:
  - Save and restore entire multi-tab configurations, split panes, shell selections, working directories, and themes.

- **6 Professional Themes & Customization**:
  - **Cyber Blue**: Standard high-tech workstation aesthetic.
  - **Matrix Green**: Classic phosphor cyberpunk terminal.
  - **Amber Terminal**: Warm 1980s mainframe CRT.
  - **Midnight Purple**: Deep neon synthwave operations.
  - **Red Alert**: Crimson tactical defense operations.
  - **Minimal Dark**: Clean, high-contrast monochrome slate.
  - Dedicated Preferences modal (`Ctrl+,`) with persistent settings.

---

## 🚀 How to Run

### Option 1: Double-Click
Double-click `cyberterm.bat` in the project root.

### Option 2: Command Line
```powershell
npm start
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl + Shift + P` / `F1` | Open Command Palette |
| `Ctrl + T` | New Terminal Tab (Default Shell) |
| `Ctrl + W` | Close Active Terminal Tab |
| `Ctrl + Tab` / `Ctrl + Shift + Tab` | Next / Previous Tab |
| `Ctrl + 1` .. `Ctrl + 9` | Switch directly to Tab 1–9 |
| `Ctrl + \` / `Ctrl + Shift + D` | Split Current Tab Vertically |
| `Ctrl + ,` | Open Settings & Preferences |
| `Ctrl + C` | Send SIGINT (`^C`) to active process (or copy if text is selected) |
| `Ctrl + Shift + C` | Force Copy Selected Text |
| `Ctrl + V` / `Ctrl + Shift + V` | Paste from Clipboard |
| `Ctrl + L` | Clear Terminal Buffer |
| `Ctrl + +` / `Ctrl + =` | Increase Font Size |
| `Ctrl + -` | Decrease Font Size |
| `Ctrl + 0` | Reset Font Size to Default |
| `ESC` | Skip Boot Sequence or Close Modal |

---

## 🛠️ Architecture

```
CYBERTERM ARCHITECTURE
┌─────────────────────────────────────────────────────────────┐
│                    Electron Renderer (Chromium)             │
│  ┌─────────────────────────┐  ┌──────────────────────────┐  │
│  │ XTerm.js Viewports      │  │ System Monitor HUD       │  │
│  │ - Multi-tab tabs        │  │ - CPU waveform           │  │
│  │ - Split-pane terminals  │  │ - Segmented RAM & C:     │  │
│  │ - Command Palette       │  │ - Network detection      │  │
│  │ - Preferences dialog    │  │ - Event activity log     │  │
│  └────────────┬────────────┘  └─────────────┬────────────┘  │
└───────────────┼─────────────────────────────┼───────────────┘
                │ IPC (pty:write, pty:data)   │ IPC (system:*)
┌───────────────▼─────────────────────────────▼───────────────┐
│                    Electron Main Process                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ConPTY Session Manager (node-pty)                     │  │
│  │  ├── PowerShell.exe                                   │  │
│  │  ├── cmd.exe                                          │  │
│  │  ├── wsl.exe -d Ubuntu                                │  │
│  │  └── bash.exe (Git Bash)                              │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Hardware Telemetry Service (os.cpus, fs.statfs, net)  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```
