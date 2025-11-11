# Current Project Context

This document provides a technical snapshot of the Adaptive Brightness Control application as of the latest version.

## Architecture Overview

The system is a full-stack application composed of a Node.js backend and a React frontend, designed for real-time communication and persistent configuration.

### 1. Node.js Backend (`/server`)

-   **Core Engine:** Serves as the central logic processor. It handles screen capturing, brightness calculation, and physical monitor control.
-   **State Management:** On first launch, it discovers all connected monitors and generates a `server/config.json` file. This file persists all user settings (active state, algorithm parameters, monitor mappings) across sessions.
-   **Communication Protocol:**
    -   **REST API:** An Express.js server exposes endpoints for state-changing commands and configuration, including an endpoint to fetch valid device IDs from the active DDC/CI tool.
    -   **WebSockets:** A `ws` server runs in parallel to push real-time data to the frontend, including brightness updates, status changes, and operational errors.
-   **Polling Mechanism:** The core adaptive brightness loop uses a robust **recursive `setTimeout` pattern**, which prevents overlapping executions and ensures stable performance.
-   **Resilience:** The server automatically tries a series of fallback ports (3001-3006) to prevent `EADDRINUSE` conflicts.
-   **Dependencies:** `express`, `cors`, `ws`, `screenshot-desktop`, `sharp`.

### 2. React Frontend (`/src`)

-   **User Interface:** A single-page application built with React, TypeScript, and Tailwind CSS that functions as the control panel.
-   **Component Structure:**
    -   **Core Components (`src/components/core`):** High-level components that compose the main UI, such as `Header`, `MonitorCard`, and `SettingsModal`.
    -   **UI Components (`src/components/ui`):** Generic, reusable building blocks like `Slider` and `Toggle`.
    -   **Icons (`src/components/icons`):** A collection of SVG icons used throughout the application.
-   **Graceful Degradation (Demo Mode):** If the frontend cannot connect to the backend on any of the specified ports, it automatically enters a "Demo Mode". It displays a clear banner and loads a static set of sample monitors, allowing the UI to be explored even without a live backend connection.
-   **Real-Time Data:** When connected to a live backend, it establishes a persistent WebSocket connection. All data displayed on the monitor cards is pushed from the server in real-time.
-   **Advanced Configuration:** The settings modal includes a UI for monitor mapping. Users can automatically detect valid device IDs from the backend and select the correct one from a dropdown.
-   **Internationalization (i18n) Ready:** All user-facing strings are managed in a central JSON file (`src/translations/en.json`) and accessed via a custom `useI18n` hook, preparing the app for future language support.
-   **Dynamic Discovery:** The frontend probes a list of fallback ports to find and connect to the active backend server's API and WebSocket.

---

## Technology Stack

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

---

## Known Issues & Limitations

The most critical usability and stability issues have been resolved. The primary remaining limitation is the application's distribution method.

1.  **Application Distribution:**
    -   **Issue:** The application is not a standalone product.
    -   **Impact:** It requires a developer-centric setup process: installing Node.js, running `npm install`, and managing two separate terminal processes. This makes it inaccessible to the average non-technical user. The next logical step, as outlined in the roadmap, is to package the application using a framework like **Electron**.
