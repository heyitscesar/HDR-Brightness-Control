const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let serverProcess;
let tray;

const serverPath = path.join(__dirname, 'server', 'server.js');
const iconPath = path.join(__dirname, 'assets', 'icon.png'); // Path for the tray icon

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log(`[Main Process] Using preload script at: ${preloadPath}`);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath
    },
    icon: iconPath // Set window icon
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Instead of quitting, hide the window to the tray
  mainWindow.on('close', (event) => {
    if (process.platform !== 'darwin') { // Standard for Windows apps
        event.preventDefault();
        mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
    console.log('Starting backend server process...');
    serverProcess = fork(
        serverPath,
        [],
        {
            env: { ...process.env, NODE_ENV: 'production' },
            silent: false
        }
    );

    // Listen for the 'ready' message from the server child process
    serverProcess.on('message', (message) => {
        if (message.status === 'ready' && mainWindow) {
            console.log(`Server is ready on port ${message.port}. Notifying renderer.`);
            // Send the port number to the renderer process (frontend)
            mainWindow.webContents.send('server-ready', { port: message.port });
        }
    });

    serverProcess.on('exit', (code) => {
        console.log(`Server process exited with code ${code}`);
    });
}

app.on('ready', () => {
    startServer();
    createWindow();

    // --- System Tray Setup ---
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
        { 
            label: 'Show App', 
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                } else {
                    createWindow();
                }
            } 
        },
        { 
            label: 'Quit', 
            click: () => {
                app.quit(); // This will trigger 'will-quit' event
            } 
        }
    ]);

    tray.setToolTip('Adaptive Brightness Control');
    tray.setContextMenu(contextMenu);
    
    // Show/hide window on left-click
    tray.on('click', () => {
        if (mainWindow) {
            mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        }
    });
});

// Remove default quit behavior
app.on('window-all-closed', () => {
  // This is intentionally left blank. The app should not quit when the window closes.
  // Quitting is handled by the tray menu.
});

app.on('will-quit', () => {
    if (serverProcess) {
        console.log('Terminating backend server process...');
        serverProcess.kill();
        serverProcess = null;
    }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});