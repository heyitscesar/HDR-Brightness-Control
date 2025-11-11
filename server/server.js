const express = require('express');
const cors = require('cors');
const screenshot = require('screenshot-desktop');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const ddciControl = require('./ddciControl');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORTS_TO_TRY = [3001, 3002, 3003, 3004, 3005, 3006];
const CONFIG_PATH = path.join(__dirname, 'config.json');
// In dev mode (running via `npm run dev`), the server is not a child process, so `process.send` will be falsy.
// In production (forked by Electron's main.js), `process.send` will be a function.
const isDev = !process.send;
const DEV_PORT = 3001;

app.use(cors());
app.use(express.json());

// --- STATE MANAGEMENT ---
let monitorsState = [];
const activeIntervals = {}; // Stores timeout IDs

// --- PERSISTENCE ---

function saveStateToFile() {
  try {
    const stateToSave = monitorsState.map(({ settings, isActive, id, deviceId }) => ({
      id,
      deviceId,
      isActive,
      settings,
    }));
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(stateToSave, null, 2), 'utf-8');
  } catch (error)
{
    console.error('Error saving state to config.json:', error);
  }
}

function loadStateFromFile() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading state from config.json:', error);
  }
  return [];
}

// --- WEBSOCKETS ---

wss.on('connection', ws => {
  console.log('Frontend client connected via WebSocket.');
  ws.on('close', () => {
    console.log('Frontend client disconnected.');
  });
});

function broadcast(data) {
  const jsonData = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(jsonData);
    }
  });
}

// --- CORE LOGIC ---

function scaleBrightness(input, settings) {
  let value = (input * settings.thresholdMultiplier) + settings.minThreshold;
  if (value > 100) value = 100;
  if (value < 0) value = 0;
  return value;
}

async function calculatePerceivedBrightness(buffer, settings) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let totalBrightness = 0;

  const fineStructureConstant = 7.2973525693;
  const pi = 3.141592653;
  const eulerNumber = 2.718281828;
  const weinbergAngle = 0.1702;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    totalBrightness += (fineStructureConstant * r + pi * g + eulerNumber * b) * weinbergAngle;
  }

  const avgBrightness = totalBrightness / (info.width * info.height);
  const scaled = scaleBrightness(avgBrightness, settings);
  return (scaled / 255) * 100;
}

const DEBUG_IMAGE_PATH = 'debug/';
async function saveDebugImage(buffer, monitorId) {
    if (!fs.existsSync(DEBUG_IMAGE_PATH)) fs.mkdirSync(DEBUG_IMAGE_PATH);
    const filename = `debug-${monitorId.replace(/\\/g, '_')}-${Date.now()}.jpg`;
    await sharp(buffer).toFile(path.join(DEBUG_IMAGE_PATH, filename));
}

async function runAdaptiveBrightness(monitor) {
  try {
    const imageBuffer = await screenshot({ screen: monitor.id });
    const calculatedBrightness = await calculatePerceivedBrightness(imageBuffer, monitor.settings);
    
    monitor.currentScreenBrightness = calculatedBrightness;

    if (monitor.settings.debug) {
      await saveDebugImage(imageBuffer, monitor.id);
    }

    const targetBrightness = Math.max(
      monitor.settings.minBrightness,
      Math.min(monitor.settings.maxBrightness, calculatedBrightness)
    );

    if (
      monitor.previousBrightness === null ||
      Math.abs(targetBrightness - monitor.previousBrightness) >= monitor.settings.brightnessThreshold
    ) {
      await ddciControl.setBrightness(monitor.deviceId, targetBrightness);
      monitor.targetMonitorBrightness = targetBrightness;
      monitor.previousBrightness = targetBrightness;
      if (monitor.error) monitor.error = null;
    }
  } catch (error) {
    console.error(`Error processing monitor ${monitor.name} (${monitor.id}):`, error.message);
    monitor.error = `DDC/CI Error: ${error.message}. Check device ID in settings.`;
    toggleService(monitor, false); // Stop on error
  } finally {
    broadcast({ type: 'monitor-update', payload: monitor });
  }
}

function toggleService(monitor, start) {
    if (start && !monitor.deviceId) {
        console.log(`Cannot start service for monitor ${monitor.name}: No DDC/CI Device ID is configured.`);
        monitor.isActive = false; // Ensure it's off
        monitor.error = "Cannot start: A DDC/CI Device ID must be selected in settings.";
        broadcast({ type: 'monitor-update', payload: monitor });
        saveStateToFile(); // Persist the inactive state
        return;
    }

    if (activeIntervals[monitor.id]) {
        clearTimeout(activeIntervals[monitor.id]);
        delete activeIntervals[monitor.id];
    }

    if (start) {
        console.log(`Starting service for monitor: ${monitor.name} (using device ID: '${monitor.deviceId}')`);
        monitor.isActive = true;
        monitor.error = null;
        monitor.previousBrightness = null;

        const loop = async () => {
            await runAdaptiveBrightness(monitor);
            if (monitor.isActive) {
                activeIntervals[monitor.id] = setTimeout(loop, monitor.settings.pollInterval);
            }
        };
        loop();
    } else {
        console.log(`Stopping service for monitor: ${monitor.name}`);
        monitor.isActive = false;
    }
    broadcast({ type: 'monitor-update', payload: monitor });
}


// --- API ENDPOINTS ---
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.get('/api/monitors', (req, res) => res.json(monitorsState));

app.get('/api/ddci-devices', async (req, res) => {
  try {
    const result = await ddciControl.getAvailableMonitors();
    res.json(result);
  } catch (error) {
      console.error('Failed to get DDC/CI devices:', error);
      res.status(500).json({ message: error.message, tool: ddciControl.getActiveTool() || 'none', devices: [] });
  }
});

app.post('/api/monitors/:id/toggle', (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ message: 'Invalid payload: isActive must be a boolean.' });
  }

  const monitor = monitorsState.find(m => m.id === id);
  if (!monitor) return res.status(404).json({ message: 'Monitor not found' });

  toggleService(monitor, isActive);
  saveStateToFile();
  res.status(200).json({ success: true, isActive: monitor.isActive });
});

app.post('/api/monitors/:id/settings', (req, res) => {
    const { id } = req.params;
    const { settings, deviceId } = req.body;

    if (!settings || typeof settings !== 'object' || typeof deviceId !== 'string') {
        return res.status(400).json({ message: 'Invalid payload: must provide settings object and deviceId string.' });
    }

    const monitorIndex = monitorsState.findIndex(m => m.id === id);
    if (monitorIndex === -1) return res.status(404).json({ message: 'Monitor not found' });

    const monitor = monitorsState[monitorIndex];
    const wasActive = monitor.isActive;

    if (wasActive) toggleService(monitor, false);

    // Only update known settings to prevent injection of unknown properties
    const allowedSettings = Object.keys(monitor.settings);
    const sanitizedSettings = { ...monitor.settings };
    for (const key of allowedSettings) {
        if (settings[key] !== undefined) {
            sanitizedSettings[key] = settings[key];
        }
    }

    monitorsState[monitorIndex].settings = sanitizedSettings;
    monitorsState[monitorIndex].deviceId = deviceId;
    monitorsState[monitorIndex].error = null; // Clear any previous configuration errors

    console.log(`Updated settings for ${monitor.name}`);

    if (wasActive) toggleService(monitorsState[monitorIndex], true);

    saveStateToFile();
    broadcast({ type: 'monitor-update', payload: monitorsState[monitorIndex] });
    res.status(200).json({ success: true });
});


// --- SERVER INITIALIZATION ---

async function initializeMonitors() {
  try {
    const displays = await screenshot.listDisplays();
    const savedStates = loadStateFromFile();
    
    const defaultSettings = {
      brightnessThreshold: 1,
      minBrightness: 0,
      maxBrightness: 100,
      pollInterval: 1000,
      minThreshold: 33,
      thresholdMultiplier: 0.33,
      debug: false,
    };

    monitorsState = displays.map(d => {
      const saved = savedStates.find(s => s.id === d.id.toString());
      const deviceId = saved?.deviceId || ''; // Default to empty string; user must configure it.
      let error = null;

      // If the monitor was saved as active but now has no device ID, it needs configuration.
      if (saved?.isActive && !deviceId) {
          error = "Monitor needs configuration. Please select a DDC/CI Device ID in the settings.";
      }

      return {
        id: d.id.toString(),
        name: d.name,
        deviceId: deviceId,
        // It cannot be active if there's no device ID.
        isActive: saved?.isActive && !!deviceId ? true : false,
        settings: { ...defaultSettings, ...(saved?.settings || {}) },
        // Transient state
        currentScreenBrightness: 0,
        targetMonitorBrightness: 0,
        previousBrightness: null,
        error: error,
      };
    });

    console.log('Initialized monitors:', monitorsState.map(m => ({ id: m.id, name: m.name, deviceId: m.deviceId, isActive: m.isActive })));
    saveStateToFile();

    // The services for active monitors will be started AFTER the initial test.
  } catch (error) {
    console.error('Failed to initialize monitors:', error);
    process.exit(1);
  }
}

/**
 * Runs a quick brightness test on all monitors to confirm DDC/CI control.
 * This test updates the monitor's state with an error if it fails.
 */
async function runInitialBrightnessTest() {
  console.log('[TEST] Starting initial brightness test for all monitors...');
  const testBrightnessLevels = [20, 80, 50]; // A more visually distinct test sequence.
  const finalBrightness = testBrightnessLevels[testBrightnessLevels.length - 1];
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  for (const monitor of monitorsState) {
    if (!monitor.deviceId) {
        console.log(`[TEST] SKIPPED for monitor ${monitor.name}: No Device ID configured.`);
        continue;
    }
    console.log(`[TEST] Testing monitor: ${monitor.name} (Device ID: ${monitor.deviceId})`);
    try {
      for (const level of testBrightnessLevels) {
        await ddciControl.setBrightness(monitor.deviceId, level);
        await delay(500);
      }
      
      console.log(`[TEST] Test for ${monitor.name} successful. Brightness left at ${finalBrightness}%.`);
      
      // If a previous test failed, clear the error on success.
      if (monitor.error && monitor.error.startsWith('[Test Failed]')) {
        monitor.error = null;
      }
    } catch (error) {
      console.error(`[TEST] FAILED for monitor ${monitor.name}. Error: ${error.message}`);
      // Set an error on the monitor state so the UI can display it.
      monitor.error = `[Test Failed] DDC/CI command failed: ${error.message}. Check if the correct Device ID is selected in settings.`;
      // Forcibly disable a monitor that fails the test.
      if (monitor.isActive) {
        console.log(`[TEST] Deactivating monitor ${monitor.name} due to failed test.`);
        monitor.isActive = false;
      }
    }
  }
  console.log('[TEST] Initial brightness test complete.');
}

function startActiveServices() {
    monitorsState.forEach(m => {
        if (m.isActive) {
            // Re-check here to be safe.
            if (m.deviceId) {
                // Find the latest state object to start the service with.
                const monitorToStart = monitorsState.find(s => s.id === m.id);
                toggleService(monitorToStart, true);
            }
        }
    });
}

function startProdServer(ports) {
    if (!ports.length) {
        console.error("All fallback ports are in use. Could not start server.");
        process.exit(1);
    }
    const port = ports[0];
    
    server.removeAllListeners();
    server.listen(port);

    server.on('listening', () => {
        console.log(`Server with WebSocket running on http://localhost:${port}`);
        // Signal to the parent process (main.js) that the server is ready
        if (process.send) {
            process.send({ status: 'ready', port });
        }
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`Port ${port} is in use, trying next port...`);
            startProdServer(ports.slice(1));
        } else {
            console.error("Server startup error:", err);
            process.exit(1);
        }
    });
}

// --- Main Execution & Global Error Handling ---
(async () => {
    try {
        console.log("Initializing DDC/CI control module...");
        await ddciControl.initialize();
        if (!ddciControl.isInitialized() || !ddciControl.getActiveTool()) {
            console.error("Could not initialize DDC/CI control. Please ensure ControlMyMonitor.exe or Monitorian.exe is available. Exiting.");
            process.exit(1);
        }
        console.log("Initializing monitor configuration...");
        await initializeMonitors();

        // Run the diagnostic test before starting services.
        await runInitialBrightnessTest();
        
        // Now that the test is done, start services for any monitors marked as active.
        startActiveServices();

        console.log("Initialization complete. Starting server...");
        
        if (isDev) {
            // In dev mode, use a fixed port and skip the port-finding logic.
            server.listen(DEV_PORT, () => {
                console.log(`[DEV MODE] Server with WebSocket running on http://localhost:${DEV_PORT}`);
            });
            server.on('error', (err) => {
                console.error("[DEV MODE] Server startup error:", err);
                process.exit(1);
            });
        } else {
            // In production, use the port-finding logic and signal Electron.
            startProdServer(PORTS_TO_TRY);
        }

    } catch (initError) {
        console.error("A critical error occurred during initialization:", initError);
        process.exit(1);
    }
})();

process.on('uncaughtException', (error, origin) => {
    console.error(`\n--- Uncaught Exception at: ${origin} ---`);
    console.error(error);
    console.error("Server is in an unstable state. Shutting down.");
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\n--- Unhandled Promise Rejection ---');
    console.error('Reason:', reason);
    console.error('Promise:', promise);
});