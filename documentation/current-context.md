# Current Project Context

This document provides a technical snapshot of the Adaptive Brightness Control application as of the latest version.

## Architecture Overview

The system is a full-stack application now packaged within an **Electron** wrapper, composed of three primary parts: the Electron Main Process, a Node.js backend, and a React frontend.

### 1. Application Wrapper (Electron)

-   **Main Process (`main.js`):** This is the entry point of the desktop application. Its responsibilities include:
    -   Creating and managing the native application window (`BrowserWindow`).
    -   Starting the Node.js backend server as a `child_process` when the app launches.
    -   Ensuring the backend server is terminated gracefully when the app quits.
    -   Loading the React frontend into the application window.
-   **Packaging:** The project is configured with `electron-builder` to bundle all necessary files (`server`, `src`, etc.) into a single distributable executable.

### 2. Node.js Backend (`/server`)

-   **Core Engine:** Serves as the central logic processor. It handles screen capturing, brightness calculation, and physical monitor control. It now runs as a background process managed by Electron.
-   **Error Handling:** The server is hardened with global `process.on('uncaughtException')` and `process.on('unhandledRejection')` handlers to prevent crashes from unexpected errors. API endpoints include basic input validation.
-   **State Management:** On first launch, it discovers all connected monitors and generates a `server/config.json` file. This file persists all user settings.
-   **Communication Protocol:**
    -   **REST API:** An Express.js server exposes endpoints for state-changing commands and configuration.
    -   **WebSockets:** A `ws` server runs in parallel to push real-time data to the frontend.
-   **Resilience:** The server automatically tries a series of fallback ports (3001-3006) to prevent `EADDRINUSE` conflicts.

### 3. React Frontend (`/src`)

-   **User Interface:** A single-page application built with React, TypeScript, and Tailwind CSS that functions as the control panel, running in Electron's renderer process.
-   **Resilience & Connectivity:**
    -   **Resilient API:** The service layer that communicates with the backend includes a retry mechanism.
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
    -   **Framework:** React `^19.2.0` (via AI Studio CDN)
    -   **Language:** TypeScript
    -   **Styling:** Tailwind CSS (via CDN)