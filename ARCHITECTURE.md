# Underlay Browser Architecture

## 1. High-Level Overview
**Underlay** is a research-grade web browser built on the **Electron** framework. It differentiates itself through "System Introspection"—exposing the internal state of the browser engine (Network, Memory, Compositor) to the user in real-time.

### Core Components
*   **Main Process (Node.js/C++)**: Controls the application lifecycle, creates browser windows, and manages native system resources (File System, OS Integrations). It acts as the "Server" in this architecture.
*   **Renderer Process (Chromium/React)**: The UI layer. It renders the browser chrome (Titlebar, Address Bar) and manages the `<webview>` tags that display web content.
*   **Webview (Isolated Guest)**: Each tab runs in a separate process (Site Isolation). The generic `<webview>` tag is used to embed these guest pages.

## 2. IPC Strategy (Inter-Process Communication)
We adhere to a strict **Context Isolation** model. The Renderer never accesses Node.js APIs directly. All communication happens via a typed IPC Bridge defined in `preload/index.ts`.

### Channels
1.  **Security (\`window.electron.security\`)**: Flows for certificate errors, security state changes, and blocking patterns.
2.  **Performance (\`window.electron.onPerformanceUpdate\`)**: A high-frequency stream of JSON data containing CPU/Memory usage per PID, sourced from standard Electron `app.getAppMetrics()` and CDP (Chrome DevTools Protocol).
3.  **Permissions**: Request/Response flow for geolocation, camera, etc.

## 3. State Management
The Renderer uses a **React Context + Reducer** pattern (`BrowserContext.tsx`).
*   **Single Source of Truth**: The `activeCommand`, `tabs`, and `history` are managed in a central store.
*   **Event-Driven**: The reducer listens to IPC events (via effects in `App.tsx`) and standard user actions.

## 4. Performance Engineering
To achieve a "Premium" feel (60 FPS):
*   **GPU Acceleration**: Crucial UI layers (`.gpu-layer`) use `will-change: transform`.
*   **Virtual DOM**: React handles the reconciliation of high-frequency data (like memory graphs).
*   **Adaptive Quality**: `useFPS` hook monitors the render loop. If FPS < 30, the app strictly degrades visual settings (removing `backdrop-filter`) to maintain responsiveness.

## 5. Security Model
*   **Sandboxing**: All renderer processes have Node.js integration disabled.
*   **Preload Scripts**: Only specific, safe APIs are exposed to the Renderer.
*   **Content Security Policy**: Applied to the UI to prevent XSS.

## 6. Directory Structure
*   `src/main`: Electron Main process logic.
*   `src/preload`: The secure bridge definitions.
*   `src/renderer`: The React application.
    *   `components`: Reusable UI atoms.
    *   `context`: Global state.
    *   `hooks`: Logic reuse (FPS, etc.).
