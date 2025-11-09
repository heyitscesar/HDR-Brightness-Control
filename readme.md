# Adaptive Monitor Brightness UI & Server

A modern, full-stack application to control and fine-tune an adaptive brightness service for multiple monitors. It consists of a responsive React/TypeScript frontend and a powerful Node.js backend.

## Features

- **Multi-Monitor Support:** View and manage all connected displays from a single dashboard.
- **Real-Time Status:** A WebSocket connection pushes live data from the server, showing the currently detected screen brightness and the applied monitor brightness without delay.
- **State Persistence:** All your settings are saved to a `server/config.json` file, so your configuration is preserved even after restarting the application.
- **Resilient Connectivity:** The application automatically handles port conflicts. If the default port (3001) is in use, it will automatically try fallback ports (3002-3006) until a connection is established.
- **Individual Control:** Enable or disable the auto-brightness service for each monitor independently.
- **Fine-Tuning Settings:** A detailed modal allows you to adjust advanced parameters for the brightness-detection algorithm.
- **Clear Error Feedback:** If the backend fails to control a monitor, a clear error message is displayed directly on the UI.
- **Full-Stack Architecture:** A decoupled frontend and backend for better maintainability and performance.

## How It Works

This project is composed of two main parts: a Node.js backend and a React frontend.

### Backend (Node.js)

The backend (`/server` directory) is the core of the operation.
1.  On first run, it uses `screenshot-desktop` to discover all connected monitors and creates a `config.json` file. On subsequent runs, it loads its configuration from this file.
2.  It runs an Express.js server for API calls (like toggling the service) and a **WebSocket server** for pushing real-time data to the UI.
3.  When "Auto-Brightness" is enabled for a monitor, it starts a dedicated polling loop.
4.  In the loop, it captures the screen, uses `sharp` to calculate brightness, and executes `Monitorian.exe` to set the physical monitor's brightness.
5.  All state changes (brightness updates, errors, status) are immediately broadcast to the frontend via WebSockets.

### Frontend (React)

The frontend (`/src` directory) provides the user interface.
1.  It discovers the active backend server by checking a list of potential ports.
2.  It establishes a persistent WebSocket connection to the server to listen for live updates.
3.  The UI is updated in real-time as messages are received from the server, providing a fluid and accurate view of the system's state.

## Technology Stack

- **Backend:** [Node.js](https://nodejs.org/), [Express.js](https://expressjs.com/), [ws (WebSockets)](https://www.npmjs.com/package/ws), [screenshot-desktop](https://www.npmjs.com/package/screenshot-desktop), [sharp](https://sharp.pixelplumbing.com/)
- **Frontend:** [React](https://reactjs.org/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v16+) installed.
- **Windows Operating System** (required by `screenshot-desktop` and `Monitorian`).
- **`Monitorian.exe`:** Download the latest release from [Monitorian's GitHub page](https://github.com/emoacht/Monitorian/releases) and place `Monitorian.exe` in the `server/` directory, or in a location included in your system's PATH.

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
# Or for auto-reloading during development:
npm run dev
```
The server will start on `http://localhost:3001` or the next available port if 3001 is in use. Check the console output to see which port was selected.

**2. Frontend UI Setup**

The project is already configured. Simply open a new terminal in the project's root directory. The frontend will automatically find and connect to the running backend server.

*Note: The frontend will be served by the development environment you are using.*

### Configuration

After the first run, a `config.json` file will be created in the `server/` directory. You can manually edit this file if needed.

**Important:** The backend attempts to guess the correct identifier for each monitor to pass to `Monitorian.exe`. If brightness adjustments are not working, you can run `Monitorian.exe /get` in a command prompt to see the correct names and update the `monitorianName` field in `config.json` accordingly.