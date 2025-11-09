# Global Objective & Roadmap

## High-Level Objective

To evolve the Adaptive Brightness Control application from a functional proof-of-concept for developers into a polished, reliable, and user-friendly desktop utility that is easily distributable and accessible to a non-technical audience.

---

## Strategic Roadmap

The project will be developed across three distinct phases, prioritizing stability and user experience first, followed by productization and advanced feature development.

### Phase 1: Usability & Robustness (Complete)

**Goal:** Address the most critical points of failure and improve the core user experience to make the application reliable for everyday use without manual file editing.

-   **[COMPLETED] UI-Based Monitor Mapping:** The settings modal now includes a feature to detect and select the correct `Monitorian.exe` identifier from a dropdown list, eliminating the need for manual JSON editing.
-   **[COMPLETED] Safer Polling Loop:** The backend's `setInterval` logic has been replaced with a recursive `setTimeout` pattern, ensuring stability and preventing resource contention under heavy load.
-   **[COMPLETED] Graceful Degradation (Demo Mode):** The frontend now automatically falls back to a read-only "Demo Mode" with sample data if the backend server is unreachable, ensuring a good user experience even when the connection is down.

### Phase 2: Productization (Next Steps)

**Goal:** Package the application for easy distribution and installation, removing the need for a technical setup process.

1.  **Package with Electron:**
    *   **Problem:** The application requires users to install Node.js and run two separate terminal commands, which is a major barrier for the average user.
    *   **Solution:**
        *   Integrate [Electron](https://www.electronjs.org/) to bundle the Node.js backend and the React frontend into a single, installable `.exe` file for Windows.
        *   The Electron main process will manage the lifecycle of the backend server and display the web UI in a native window.

2.  **Add Application Branding & System Tray Integration:**
    *   **Solution:**
        *   Design and add an application icon.
        *   Implement a system tray icon for running the application in the background, with context menu options to open the dashboard or quit the app.

### Phase 3: Advanced Features (Long-Term)

**Goal:** Expand the application's feature set to provide more powerful and context-aware brightness control.

1.  **User-Defined Profiles:**
    *   **Concept:** Allow users to create and save different settings profiles (e.g., "Gaming," "Reading," "Movie Mode") and switch between them.

2.  **Time-Based Adjustments:**
    *   **Concept:** Introduce a "Night Light" feature that automatically lowers the maximum brightness and applies a warmer tone after sunset.

3.  **Explore Alternative Brightness Controls:**
    *   **Concept:** Research and potentially integrate other methods of controlling monitor brightness (e.g., via WMI or other libraries) to reduce the hard dependency on `Monitorian.exe` and improve compatibility.

4.  **Localization (i18n):**
    *   **Concept:** Add support for multiple languages in the user interface.
