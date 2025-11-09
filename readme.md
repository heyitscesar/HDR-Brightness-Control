# Adaptive Monitor Brightness UI & Server

A modern, full-stack application to control and fine-tune an adaptive brightness service for multiple monitors. It consists of a responsive React/TypeScript frontend and a powerful Node.js backend with a robust DDC/CI control system.

## Features

-   **Robust DDC/CI Control:** The backend intelligently uses the best available tool to control monitor brightness. It prioritizes `Monitorian.exe` and automatically falls back to `ControlMyMonitor.exe` if needed.
-   **Multi-Monitor Support:** View and manage all connected displays from a single dashboard.
-   **UI-Based Device Mapping:** The settings UI lets you detect and select the correct device ID for whichever control tool is active, eliminating manual configuration.
-   **Real-Time Status:** A WebSocket connection pushes live data from the server, showing detected screen brightness and applied monitor brightness without delay.
-   **Graceful Fallback (Demo Mode):** If the backend server is not running, the UI loads with sample data, allowing you to explore its features.
-   **State Persistence:** All your settings are saved to a `server/config.json` file, so your configuration is preserved across restarts.
-   **Resilient Connectivity:** The application automatically handles port conflicts by trying a series of fallback ports (3001-3006).
-   **Clear Error Feedback:** If the backend fails to control a monitor, a clear error message is displayed directly on the UI.

## How It Works

This project is composed of a Node.js backend and a React frontend.

### Backend (Node.js)

The backend (`/server` directory) is the core of the operation.
1.  **DDC/CI Abstraction:** On startup, a dedicated module checks for `Monitorian.exe` in the system PATH. If not found, it checks for `ControlMyMonitor.exe` in the `/server` directory. All brightness control commands are routed through this module.
2.  **State Management:** It discovers monitors and creates/loads a `config.json` file to persist settings.
3.  **Real-Time Communication:** It runs an Express.js server for API calls and a WebSocket server for pushing live data to the UI.
4.  **Brightness Loop:** When active, a safe polling loop captures the screen, calculates apparent brightness, and calls the DDC/CI module to set the physical monitor's brightness.

### Frontend (React)

The frontend (`/src` directory) provides the user interface.
1.  It dynamically probes ports to find and connect to the active backend server.
2.  If no backend is found, it enters a read-only **"Demo Mode"** with sample data.
3.  The settings modal allows easy configuration, including a "Detect" button that gets a list of valid device IDs from the backend's active DDC/CI tool.

## Technology Stack

-   **Backend:** [Node.js](https://nodejs.org/), [Express.js](https://expressjs.com/), [ws (WebSockets)](https://www.npmjs.com/package/ws), [screenshot-desktop](https://www.npmjs.com/package/screenshot-desktop), [sharp](https://sharp.pixelplumbing.com/)
-   **Frontend:** [React](https://reactjs.org/)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **DDC/CI Tools:** `Monitorian.exe` (Primary), `ControlMyMonitor.exe` (Fallback)

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/en/) (v16+) installed.
-   **Windows Operating System**.
-   **DDC/CI Control Utilities:** You need at least one of the following:
    -   **Primary:** Download `Monitorian.exe` from its [GitHub page](https://github.com/emoacht/Monitorian/releases) and ensure it is in your system's PATH.
    -   **Fallback:** Download `ControlMyMonitor.exe` from [Nirsoft](https://www.nirsoft.net/utils/control_my_monitor.html) and place the `.exe` file inside the `/server` directory.

### Installation & Running

You will need to run two processes in separate terminals: the backend server and the frontend UI.

**1. Backend Server Setup**

```bash
# Navigate to the server directory
cd server

# Install dependencies
npm install

# Start the server
npm start
```
The server will start on `http://localhost:3001` or the next available port. Check the console logs to see which DDC/CI tool it detected.

**2. Frontend UI Setup**

The project is already configured. The frontend will automatically find and connect to the running backend server.

### Troubleshooting

**"Demo Mode" Banner is Showing**
This means the frontend could not connect to the backend.
-   Ensure the backend server is running in a separate terminal.
-   Check the server's terminal for any startup errors (e.g., "Neither Monitorian.exe nor ControlMyMonitor.exe could be found").

**Brightness Isn't Changing**
1.  Click the **Settings icon** on the monitor's card.
2.  Click the **"Detect"** button. This will use the backend's active tool to find all controllable monitors.
3.  Select the correct ID from the **"DDC/CI Device ID"** dropdown.
4.  Click **"Save Changes"**.
5.  Check the `server/cmd.readme.cmd` file for more details on the command-line tools.