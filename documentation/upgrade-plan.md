# Electron Upgrade & Productization Plan

## 1. Objective

To package the existing Node.js backend and React frontend into a single, installable, and user-friendly desktop application for Windows using the Electron framework. This plan directly corresponds to "Phase 2: Productization" in the global roadmap.

## 2. Motivation

The application's primary limitation is its developer-centric setup, which requires users to have Node.js installed and manage two separate command-line processes. This is a significant barrier to entry for a non-technical audience. Migrating to Electron will resolve this by:

-   Creating a single, double-clickable `.exe` installer.
-   Eliminating the need for any pre-installed dependencies like Node.js.
-   Providing a more native user experience with features like a system tray icon.

## 3. Key Tasks & Action Plan

### Task 1: Project Scaffolding & Dependency Setup (Complete)

-   **[COMPLETED]** Initialize Root `package.json`: A new `package.json` has been created in the project root to manage the Electron application.
-   **[COMPLETED]** Install Dependencies: `electron` and `electron-builder` have been added as development dependencies.
-   **[COMPLETED]** Update Scripts: The root `package.json` now has a `start` script to launch the Electron app.

### Task 2: Create the Electron Main Process (Complete)

-   **[COMPLETED]** Create `main.js`: The main entrypoint for Electron has been created.
-   **[COMPLETED]** Window Management: The script successfully creates a `BrowserWindow` and loads the React frontend.
-   **[COMPLETED]** Backend Lifecycle Management: The main process now uses `child_process.fork()` to start the `server/server.js` and ensures it is terminated when the application quits.
-   **[COMPLETED]** Security: Basic Electron security best practices (`nodeIntegration: false`, `contextIsolation: true`) have been implemented, including the addition of a `preload.js` script.

### Task 3: System Tray Integration (Complete)

-   **[COMPLETED]** Create Tray Icon: The `main.js` script now creates a system tray icon on launch.
-   **[COMPLETED]** Implement Context Menu: The tray icon has a context menu with "Show App" and "Quit" options.
-   **[COMPLETED]** Handle Window Closing: Closing the main window now hides it, allowing the app to run in the background. The app is quit via the tray menu.

### Task 4: Build & Packaging Configuration (Next)

1.  **Configure `electron-builder`:** Add a `build` section to the root `package.json` to configure the packaging process.
2.  **File Inclusion:**
    -   Ensure the entire `/server` directory, including its `node_modules` and the critical `ControlMyMonitor.exe` (if present), is included in the final packaged application.
    -   Specify the location of the built React app assets.
3.  **Installer Configuration:**
    -   Define the `appId`, `productName`, and other metadata.
    -   Configure the Windows (`win`) target to create an NSIS installer (`.exe`).
    -   Assign an application icon (`.ico` file) for the executable and installer.

### Task 5: Code & Structure Refinements

1.  **Consolidate `node_modules`:** Where possible, hoist dependencies to the root `package.json` to simplify the project structure. The `/server` directory will still need its own `package.json` for production dependencies.
2.  **Update Documentation:** Update `readme.md` with new installation and running instructions for the final Electron application.

## 4. Updated Project Structure (Post-Upgrade)

```
/
├── server/                 # Node.js backend (largely unchanged)
├── src/                    # React frontend (unchanged)
├── assets/                 # For icons, etc.
│   └── icon.png
├── main.js                 # Electron main process entrypoint
├── preload.js              # Electron preload script
├── package.json            # Root package file for the Electron app
└── ... other config files
```

## 5. Success Criteria

The upgrade will be considered successful when:

-   A single command (`npm run dist`) produces a distributable `.exe` installer.
-   The installed application runs without requiring any external dependencies (like Node.js).
-   All existing features—brightness control, settings, real-time updates—function identically to the current version.
-   The application starts with the computer (optional) and can be minimized to the system tray.
-   The application can be closed and fully exited from the system tray menu.