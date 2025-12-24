# UNDERLAY Browser

> **The Browser That Reveals Itself.**

Underlay is a research-grade experimental web browser designed to expose the internal state of the web engine ("System Introspection"). It breaks the black box model of modern browsers, visualizing Network, Memory, and Rendering pipelines in real-time.

![Underlay Screenshot](website/screenshot.png)

## 🏗 Architecture

Underlay is architected as a hybrid **Electron** application, leveraging a strictly typed IPC bridge to separate the Node.js/C++ "Engine" from the React/Framer Motion "Renderer".

### Process Model
*   **Main Process**: Orchestrates lifecycle, native windows, and OS integrations. Acts as the capabilities server.
*   **Renderer Process**: A React single-page application (SPA) acting as the "Chrome". It manages the `<webview>` guest processes.
*   **Guest Processes**: Isolated "Site Isolation" processes running the actual web content.

### The IPC Bridge
We enforce a strict **Context Isolation** (sandbox) model. The UI cannot access Node.js.
*   `window.electron.security`: TLS/Certificate data streams.
*   `window.electron.perfControl`: Low-level process throttling (CPU/Network).
*   `window.electron.onPerformanceUpdate`: 60Hz telemetry stream for graphs.

## 🚀 Performance Engineering (Adaptive Quality)

Underlay targets **60 FPS** on all hardware via an **Adaptive Quality Engine**:
1.  **Metric**: `useFPS` hook monitors the Rendering Thread loop.
2.  **Threshold**: If FPS < 30 for 2s, **Low Power Mode** engages.
3.  **Action**:
    *   Glassmorphism (`backdrop-filter`) is globally disabled.
    *   Translucent surfaes become opaque (`#0a0a0c`).
    *   Heavy particulate animations pause.
4.  **Recovery**: Manual toggle or restart required (hysteresis prevents flickering).

## 🛡 Security & Privacy

*   **Fingerprint Blocking**: Canvas and AudioContext APIs are proxied in the Preload script to detect and block fingerprinting vectors.
*   **Packet Inspection**: Real-time analysis of request headers (though simulated for this demo) to flag tracking pixels.
*   **Process Isolation**: Each tab is a separate OS process.

## ⌨️ Workflow

*   **Command Palette (`⌘K`)**: Fuzzy search for any action.
*   **Shortcuts**: `⌘T` (New Tab), `⌘W` (Close), `⌘L` (Focus URL), `⌥⌘I` (Introspection).

## 🛠 Development

```bash
# Install dependencies
npm install

# Run in Development Mode (HMR)
npm run dev

# Build for Production
npm run build
```

## 📂 Project Structure

*   `src/main`: Electron Node.js backend.
*   `src/preload`: Secure IPC bridge definitions.
*   `src/renderer`: React UI frontend.
    *   `src/renderer/src/components`: UI Atoms (Graphs, Bars).
    *   `src/renderer/src/context`: State Management (Reducer).
