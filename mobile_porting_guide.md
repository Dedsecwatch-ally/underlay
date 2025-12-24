# Mobile Porting Guide (iOS)

## Overview
Your current application is built with **Electron**, which relies on **Node.js** and **Chromium** to run on desktop (macOS/Windows/Linux). These technologies are **not available on iOS**.

However, since your UI is built with **React**, you can port the *interface* to iOS using **Capacitor**.

## Capabilities & Limitations
- **✅ Supported (UI):** Your settings, New Tab Page, animations, and React components will work on iOS.
- **❌ Unsupported (Engine):** The core browser features (multi-tab management via `<webview>`, Node.js `fs` access, `ipcRenderer`) will **NOT** work and must be rewritten using native mobile plugins.

## Steps to Port UI to iOS

### 1. Install Capacitor
Run these commands in your project root:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init Underlay com.underlay.mobile
```

### 2. Configure Vite for Mobile
Capacitor expects a static web build. Maintain your current `vite.config.ts`, but ensure your `build` script produces a standard web bundle.

### 3. Build & Sync
```bash
npm run build
npx cap add ios
npx cap sync
```

### 4. Open in Xcode
```bash
npx cap open ios
```
This will open Xcode where you can run your app on a Simulator or iPhone.

## Adapting the Browser Engine
To make a functional *browser* on iOS, you cannot use Electron's `<webview>`. You must substitute it with the **InAppBrowser** plugin or a custom **Capacitor Plugin** that wraps `WKWebView`.

Example:
```bash
npm install @capacitor/browser
```

You would need to conditionally render:
- **Desktop:** `<webview src="..." />`
- **Mobile:** Use `@capacitor/browser` APIs to open URLs.

### 5. App Icon Generation
I have placed your logo at `build/icon.png`. To generate the iOS app icons:

1.  Install the assets tool:
    ```bash
    npm install @capacitor/assets --save-dev
    ```
2.  Create an assets directory and copy the logo:
    ```bash
    mkdir -p assets
    cp build/icon.png assets/logo.png
    cp build/icon.png assets/icon.png
    ```
3.  Generate the icons:
    ```bash
    npx capacitor-assets generate --ios
    ```

