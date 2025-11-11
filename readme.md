# Adaptive Monitor Brightness UI & Server

This project is a full-stack application to control and fine-tune an adaptive brightness service for multiple monitors, packaged as a modern desktop application with Electron and Vite.

## Documentation

All detailed documentation for this project, including setup instructions, architecture overview, and future roadmap, has been moved to the `/documentation` directory.

**Please start by reading the main documentation file: [./documentation/readme.md](./documentation/readme.md)**

## Quick Start

### Prerequisites

-   [Node.js](https://nodejs.org/en/) (v16+) installed.
-   **Windows Operating System**.
-   **DDC/CI Control Utilities:** At least one of the following is required:
    -   **Primary:** `Monitorian.exe` available in your system's PATH.
    -   **Fallback:** `ControlMyMonitor.exe` placed inside the `/server` directory.

### Installation

1.  **Install Backend Dependencies:**
    ```bash
    # Navigate to the server directory and install its dependencies
    cd server
    npm install
    ```
2.  **Install Root Application Dependencies:**
    ```bash
    # Go back to the root and install Electron & Vite dependencies
    cd ..
    npm install
    ```

### Running the Application

-   **For Development (with hot-reloading):**
    ```bash
    # From the project root
    npm run dev
    ```
-   **To Run the Production Build:**
    ```bash
    # From the project root
    npm start
    ```
