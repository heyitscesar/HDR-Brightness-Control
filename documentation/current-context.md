# Current Project Context

This document provides a technical snapshot of the Adaptive Brightness Control application as of the latest version.

## Architecture Overview

The system is a full-stack application now packaged within an **Electron** wrapper, composed of three primary parts: the Electron Main Process, a Node.js backend, and a React frontend.

### 1. Application Wrapper (Electron)

-   **Main Process (`main.js`):** This is the entry point of the desktop application. Its responsibilities include:
    -   Creating and managing the native application window (`BrowserWindow`).
    -   Starting the Node.js backend server as a `child_process` in production.
    -   Ensuring the backend server is terminated gracefully when the app quits.
    -   Loading the React frontend into the application window (from the Vite dev server in development, or from the built `dist` folder in production).

### 2. Node.js Backend (`/server`)

-   **Core Engine:** Serves as the central logic processor. It handles screen capturing, brightness calculation, and physical monitor control.
-   **DDC/CI Abstraction:** On startup, a dedicated module first checks for `ControlMyMonitor.exe` in the local `/server` directory. If it's not found, it checks for `Monitorian.exe` in the system's PATH as a fallback.
-   **Error Handling:** The server is hardened with global `process.on('uncaughtException')` and `process.on('unhandledRejection')` handlers to prevent crashes from unexpected errors. API endpoints include basic input validation.
-   **State Management:** On first launch, it discovers all connected monitors and generates a `server/config.json` file. This file persists all user settings.
-   **Communication Protocol:**
    -   **REST API:** An Express.js server exposes endpoints for state-changing commands and configuration.
    -   **WebSockets:** A `ws` server runs in parallel to push real-time data to the frontend.

### 3. React Frontend (`/src`)

-   **User Interface:** A single-page application built with React, TypeScript, and Tailwind CSS that functions as the control panel, running in Electron's renderer process.
-   **Build System:** The frontend is built and served using **Vite**, which provides a fast development server with Hot Module Replacement and creates an optimized production bundle.
-   **Resilience & Connectivity:**
    -   **Backend Handshake:** The frontend uses Electron's IPC (Inter-Process Communication) to receive the backend server's port directly from the main process, ensuring a reliable connection without port scanning.
    -   **Automatic Reconnection:** The WebSocket client implements an exponential backoff strategy, automatically attempting to reconnect if the connection is dropped.
    -   **Graceful Degradation (Demo Mode):** If the frontend cannot connect to the backend, it enters a "Demo Mode" with a clear banner and static sample data.

---

## Technology Stack

-   **Application Shell:** Electron `^29.1.0`
-   **Backend:**
    -   **Runtime:** Node.js (v16+)
    -   **Framework:** Express.js `^4.19.2`
    -   **WebSockets:** `ws` `^8.17.0`
    -   **Image Processing:** `sharp` `^0.33.4`
    -   **Screen Capture:** `screenshot-desktop` `^1.15.0`
-   **Frontend:**
    -   **Framework:** React
    -   **Language:** TypeScript
    -   **Styling:** Tailwind CSS
    -   **Build Tool:** Vite `^5.3.1`