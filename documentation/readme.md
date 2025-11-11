# Adaptive Monitor Brightness UI & Server

A modern, full-stack application to control and fine-tune an adaptive brightness service for multiple monitors. It consists of a responsive React/TypeScript frontend and a powerful Node.js backend, packaged as a desktop application with Electron.

## Features

-   **Robust DDC/CI Control:** The backend intelligently uses the best available tool to control monitor brightness. It prioritizes `Monitorian.exe` and automatically falls back to `ControlMyMonitor.exe` if needed.
-   **Multi-Monitor Support:** View and manage all connected displays from a single dashboard.
-   **UI-Based Device Mapping:** The settings UI lets you detect and select the correct device ID for whichever control tool is active, eliminating manual configuration.
-   **Reliable Connection Handshake:** The application uses Electron's IPC to securely establish a connection between the frontend and backend, eliminating race conditions.
-   **Resilient Real-Time Updates:** The UI automatically attempts to reconnect its WebSocket if the server connection is lost, using an exponential backoff strategy.
-   **Graceful Fallback (Demo Mode):** If the backend server is not running or fails to connect, the UI loads with sample data, allowing you to explore its features.
-   **State Persistence:** All your settings are saved to a `server/config.json` file, so your configuration is preserved across restarts.

## How It Works

This project is composed of a Node.js backend and a React frontend, wrapped in an **Electron** desktop application shell.

### Backend (Node.js)

The backend (`/server` directory) is the core of the operation. It is launched automatically as a background process by the main Electron application.
1.  **DDC/CI Abstraction:** On startup, a dedicated module checks for `Monitorian.exe` in the system PATH. If not found, it checks for `ControlMyMonitor.exe` in the `/server` directory. All brightness control commands are routed through this module.
2.  **State Management:** It discovers monitors and creates/loads a `config.json` file to persist settings.
3.  **Real-Time Communication:** It runs an Express.js server for API calls and a WebSocket server for pushing live data to the UI.
4.  **Brightness Loop:** When active, a safe polling loop captures the screen, calculates apparent brightness, and calls the DDC/CI module to set the physical monitor's brightness.

### Frontend (React)

The frontend (`/src` directory) is a modern React/TypeScript application built with **Vite**. It runs inside the Electron window (the renderer process).
1.  **Build System:** Vite provides a fast development server with Hot Module Replacement (HMR) for instant UI updates and creates a highly optimized build for the production application.
2.  **Backend Communication:** The frontend no longer scans for ports. Instead, it waits for a secure message from the Electron main process (via IPC), which provides the exact port the backend server is running on. This creates a fast and reliable connection handshake.
3.  **Resilience:** If no backend can be found, it enters a read-only **"Demo Mode"** with sample data.
4.  The settings modal allows easy configuration, including a "Detect" button that gets a list of valid device IDs from the backend's active DDC/CI tool.

## Project Structure

The project is a unified Electron application.

```
/
├── server/                 # Node.js backend server (runs as a child process)
├── src/                    # React frontend source (runs in the renderer process)
├── main.js                 # Electron main process entrypoint
├── preload.js              # Electron preload script
├── package.json            # Root package file for the Electron app
├── vite.config.ts
└── index.html
```

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/en/) (v16+) installed.
-   **Windows Operating System**.
-   **DDC/CI Control Utilities:** You need at least one of the following:
    -   **Primary:** Download `Monitorian.exe` from its [GitHub page](https://github.com/emoacht/Monitorian/releases) and ensure it is in your system's PATH.
    -   **Fallback:** Download `ControlMyMonitor.exe` from [Nirsoft](https://www.nirsoft.net/utils/control_my_monitor.html) and place the `.exe` file inside the `/server` directory.

### Installation

First, install the dependencies for the backend server, then install the dependencies for the root Electron/Vite application.

```bash
# 1. Navigate to the server directory and install its dependencies
cd server
npm install

# 2. Go back to the root and install Electron & Vite dependencies
cd ..
npm install
```

### Running the Application

There are two ways to run the app:

**1. For Development (Recommended)**

This command starts the backend server with hot-reloading (`nodemon`), the Vite development server for the frontend, and launches the Electron app. Changes to server or UI code will automatically be reflected.

```bash
# From the project root
npm run dev
```

**2. For Production-like Testing**

This command starts the Electron application just as it would run from the packaged `.exe`. It manages the backend server as a background process and uses the built frontend code.

```bash
# From the project root
npm start
```

### Troubleshooting

**"Demo Mode" Banner is Showing**
This means the frontend could not connect to the backend.
-   Ensure you are in the project's root directory when running `npm start` or `npm run dev`.
-   Check the terminal for any error messages from the server or Vite.
-   If the connection status is "Disconnected", the UI will automatically try to reconnect. If you restart the server, the UI should connect within a few seconds.

**Brightness Isn't Changing**
1.  Click the **Settings icon** on the monitor's card.
2.  Click the **"Detect"** button. This will use the backend's active tool to find all controllable monitors.
3.  Select the correct ID from the **"DDC/CI Device ID"** dropdown.
4.  Click **"Save Changes"**.
5.  Check the server's console for any DDC/CI error messages related to that monitor.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.
