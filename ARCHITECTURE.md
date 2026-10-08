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
The renderer keeps browser state in a **Zustand** store (`store/browserStore.ts`).
*   **Stable dispatch**: `dispatch` in `context/BrowserContext.tsx` is a module-level function; components that only issue actions never re-render.
*   **Selectors**: long-lived components subscribe with `useBrowserState(selector)` so they only re-render when their slice changes. Panels call `useBrowser(isOpen)` to stop subscribing while closed.
*   **Persistence**: writes to `localStorage` are debounced and serialised lazily; transient tab data (reader articles, blocked-request logs) is never persisted, and restored tabs load lazily when first selected.
*   **Commands**: keyboard shortcuts and menu items are resolved in the main process (`before-input-event` + application menu) and delivered as `ui:command`, so they work even while a web page has focus.

## 4. Performance Engineering
*   **Memoized tabs**: each tab renders through a memoized `TabView`; webview events dispatch straight to the store, with an O(1) registry (`utils/webviews.ts`) mapping tabs ↔ webviews ↔ webContents ids.
*   **Memory saver**: background tabs are put to sleep after inactivity (5 min in Low Power Mode, 15 min on battery, 60 min otherwise); tabs playing audio are spared.
*   **Batched IPC**: blocked-request reports are batched once per second and applied once per tab.
*   **Background throttling** is left on, so hidden tabs don't burn CPU.

## 5. Security & Privacy Model
*   **Locked-down web content**: every `<webview>` is forced to `sandbox`, `contextIsolation`, no Node and no preload in `will-attach-webview`, regardless of the attributes the UI asked for. Navigation is limited to `http(s)`, `about:blank` and `blob:`.
*   **Trusted IPC only**: every IPC handler verifies the sender is the browser UI loaded from its own origin. Web pages have no bridge at all.
*   **Permissions** (`main/permissions.ts`): camera, microphone, location, notifications, etc. are prompted per site and remembered (in memory only for private tabs); unknown permissions are denied.
*   **Passwords** (`main/vault.ts`): encrypted with the OS keychain via `safeStorage`; plaintext never reaches the renderer, and copied passwords are cleared from the clipboard after 30 s.
*   **Google account** (`main/account.ts`): derived from the browsing session's auth cookies and Google's `ListAccounts` endpoint; signing out removes Google cookies from the session.
*   **Network privacy**: tracker/ad blocking (cached filter engine, hostname allowlist, never blocks top-level navigations), HTTPS upgrades with automatic fallback, Global Privacy Control, DNS-over-HTTPS, and a real-version reduced user agent.
*   **Private tabs**: separate in-memory partition, wiped (cookies, cache, permissions) when the last private tab closes; no history or suggestions.
*   **CSP**: the UI ships with a strict Content Security Policy (no inline scripts in production), injected at build time by `vite.config.ts`.

## 6. Directory Structure
*   `src/main`: Electron Main process logic.
*   `src/preload`: The secure bridge definitions.
*   `src/renderer`: The React application.
    *   `components`: Reusable UI atoms.
    *   `context`: Global state.
    *   `hooks`: Logic reuse (FPS, etc.).
