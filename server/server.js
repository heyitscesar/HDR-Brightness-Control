const express = require('express');
const cors = require('cors');
const screenshot = require('screenshot-desktop');
const sharp = require('sharp');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORTS_TO_TRY = [3001, 3002, 3003, 3004, 3005, 3006];
const CONFIG_PATH = path.join(__dirname, 'config.json');

app.use(cors());
app.use(express.json());

// --- STATE MANAGEMENT ---
let monitorsState = [];
const activeIntervals = {};

// --- PERSISTENCE ---

function saveStateToFile() {
  try {
    // Only save settings and isActive status, not transient data
    const stateToSave = monitorsState.map(({ settings, isActive, id, monitorianName }) => ({
      id,
      monitorianName,
      isActive,
      settings,
    }));
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(stateToSave, null, 2), 'utf-8');
  } catch (error) {
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

function adjustMonitorBrightness(monitorName, brightness) {
  return new Promise((resolve, reject) => {
    const command = `Monitorian.exe /set "${monitorName}" ${Math.round(brightness)} B`;
    exec(command, (error) => {
      if (error) {
        console.error(`[${monitorName}] Error adjusting brightness: ${error.message}`);
        reject(error);
      } else {
        console.log(`[${monitorName}] Brightness adjusted to ${brightness.toFixed(0)}%`);
        resolve();
      }
    });
  });
}

const DEBUG_IMAGE_PATH = 'debug/';
async function saveDebugImage(buffer, brightness, monitorId) {
    if (!fs.existsSync(DEBUG_IMAGE_PATH)) fs.mkdirSync(DEBUG_IMAGE_PATH);
    const filename = `debug-${monitorId}-${Date.now()}.jpg`;
    await sharp(buffer).toFile(path.join(DEBUG_IMAGE_PATH, filename));
}

async function runAdaptiveBrightness(monitor) {
  try {
    const imageBuffer = await screenshot({ screen: monitor.id });
    const calculatedBrightness = await calculatePerceivedBrightness(imageBuffer, monitor.settings);
    
    monitor.currentScreenBrightness = calculatedBrightness;

    if (monitor.settings.debug) {
      await saveDebugImage(imageBuffer, calculatedBrightness, monitor.id);
    }

    const targetBrightness = Math.max(
      monitor.settings.minBrightness,
      Math.min(monitor.settings.maxBrightness, calculatedBrightness)
    );

    if (
      monitor.previousBrightness === null ||
      Math.abs(targetBrightness - monitor.previousBrightness) >= monitor.settings.brightnessThreshold
    ) {
      await adjustMonitorBrightness(monitor.monitorianName, targetBrightness);
      monitor.targetMonitorBrightness = targetBrightness;
      monitor.previousBrightness = targetBrightness;
      // Clear previous error on success
      if (monitor.error) monitor.error = null;
    }
  } catch (error) {
    monitor.error = `Loop Error: ${error.message}. Check Monitorian name in config.json.`;
    // Stop the service for this monitor on error to prevent spamming logs
    toggleService(monitor, false);
  } finally {
    // Broadcast state regardless of success or failure so UI updates
    broadcast({ type: 'monitor-update', payload: monitor });
  }
}

function toggleService(monitor, start) {
    if (start && !activeIntervals[monitor.id]) {
        console.log(`Starting service for monitor: ${monitor.name} (using Monitorian name: '${monitor.monitorianName}')`);
        monitor.isActive = true;
        monitor.error = null;
        monitor.previousBrightness = null;
        runAdaptiveBrightness(monitor);
        activeIntervals[monitor.id] = setInterval(() => runAdaptiveBrightness(monitor), monitor.settings.pollInterval);
    } else if (!start && activeIntervals[monitor.id]) {
        console.log(`Stopping service for monitor: ${monitor.name}`);
        monitor.isActive = false;
        clearInterval(activeIntervals[monitor.id]);
        delete activeIntervals[monitor.id];
    }
    broadcast({ type: 'monitor-update', payload: monitor });
}


// --- API ENDPOINTS ---
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.get('/api/monitors', (req, res) => res.json(monitorsState));

app.post('/api/monitors/:id/toggle', (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  const monitor = monitorsState.find(m => m.id === id);

  if (!monitor) return res.status(404).json({ message: 'Monitor not found' });

  toggleService(monitor, isActive);
  saveStateToFile();
  res.status(200).json({ success: true, isActive: monitor.isActive });
});

app.post('/api/monitors/:id/settings', (req, res) => {
    const { id } = req.params;
    const newSettings = req.body;
    const monitorIndex = monitorsState.findIndex(m => m.id === id);

    if (monitorIndex === -1) return res.status(404).json({ message: 'Monitor not found' });

    const monitor = monitorsState[monitorIndex];
    const wasActive = monitor.isActive;

    if (wasActive) toggleService(monitor, false);

    monitorsState[monitorIndex].settings = { ...monitor.settings, ...newSettings };
    console.log(`Updated settings for ${monitor.name}`);

    if (wasActive) toggleService(monitorsState[monitorIndex], true);

    saveStateToFile();
    broadcast({ type: 'monitor-update', payload: monitorsState[monitorIndex] });
    res.status(200).json({ success: true, settings: monitorsState[monitorIndex].settings });
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
      
      // ** FIX: Intelligently determine the default Monitorian name **
      // Extracts the trailing number from names like '\\.\DISPLAY1' to get '1'
      const match = d.name.match(/(\d+)$/);
      const defaultMonitorianName = match ? match[1] : d.name;

      return {
        id: d.id.toString(),
        name: d.name,
        monitorianName: saved?.monitorianName || defaultMonitorianName,
        isActive: saved?.isActive || false,
        settings: saved?.settings || JSON.parse(JSON.stringify(defaultSettings)),
        // Transient state
        currentScreenBrightness: 0,
        targetMonitorBrightness: 0,
        previousBrightness: null,
        error: null,
      };
    });

    console.log('Initialized monitors:', monitorsState.map(m => ({ id: m.id, name: m.name, monitorianName: m.monitorianName })));
    saveStateToFile(); // Save the reconciled state

    // Automatically start services for monitors that were active
    monitorsState.forEach(m => {
        if (m.isActive) {
            // Re-set to false so toggleService starts it properly
            m.isActive = false; 
            toggleService(m, true);
        }
    });

  } catch (error) {
    console.error('Failed to initialize monitors:', error);
    process.exit(1);
  }
}

function startServer(ports) {
    if (!ports.length) {
        console.error("All fallback ports are in use. Could not start server.");
        process.exit(1);
    }
    const port = ports[0];
    
    // Clear previous listeners to avoid duplicates from recursive calls
    server.removeAllListeners();
    server.listen(port);

    server.on('listening', () => {
        console.log(`Server with WebSocket running on http://localhost:${port}`);
        console.log('Ensure Monitorian.exe is in the same directory or in your system PATH.');
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`Port ${port} is in use, trying next port...`);
            startServer(ports.slice(1));
        } else {
            console.error("Server startup error:", err);
            process.exit(1);
        }
    });
}

// --- Main Execution ---
(async () => {
    console.log("Initializing monitor configuration...");
    await initializeMonitors();
    console.log("Initialization complete. Starting server...");
    startServer(PORTS_TO_TRY);
})();
