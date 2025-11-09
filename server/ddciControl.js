const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execPromise = promisify(exec);

const CONTROL_MY_MONITOR_PATH = path.join(__dirname, 'ControlMyMonitor.exe');
const CMM_OUTPUT_FILE = path.join(__dirname, 'monitors.txt');

let activeTool = null; // 'monitorian' or 'controlmymonitor'
let isInitialized = false;

/**
 * Checks for the presence of the control executables and determines which one to use.
 */
async function initialize() {
    try {
        // Try Monitorian first (check if it's in PATH)
        await execPromise('where Monitorian.exe');
        console.log('DDC/CI Control: Using Monitorian.exe (Primary)');
        activeTool = 'monitorian';
    } catch (error) {
        // If Monitorian is not found, check for ControlMyMonitor locally
        if (fs.existsSync(CONTROL_MY_MONITOR_PATH)) {
            console.log('DDC/CI Control: Using ControlMyMonitor.exe (Fallback)');
            activeTool = 'controlmymonitor';
        } else {
            console.error('DDC/CI Control Error: Neither Monitorian.exe nor ControlMyMonitor.exe could be found.');
            activeTool = null;
        }
    }
    isInitialized = true;
}

/**
 * Gets a list of available monitor identifiers using the active tool.
 * @returns {Promise<{tool: string, devices: string[]}>}
 */
async function getAvailableMonitors() {
    if (!activeTool) throw new Error('No DDC/CI control tool is available.');

    if (activeTool === 'monitorian') {
        const { stdout } = await execPromise('Monitorian.exe /get');
        const devices = stdout.split('\n')
            .map(line => line.trim())
            .filter(line => line.match(/^\d+:/))
            .map(line => line.split(':')[0]);
        return { tool: activeTool, devices };
    }

    if (activeTool === 'controlmymonitor') {
        // Use /smonitordeferred to save monitor list to a file
        await execPromise(`"${CONTROL_MY_MONITOR_PATH}" /smonitordeferred "${CMM_OUTPUT_FILE}"`);
        const data = fs.readFileSync(CMM_OUTPUT_FILE, 'utf-8');
        const devices = data.split('\r\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('ID='))
            .map(line => line.substring(3)); // Extract value after "ID="
        fs.unlinkSync(CMM_OUTPUT_FILE); // Clean up the file
        return { tool: activeTool, devices };
    }

    return { tool: 'none', devices: [] };
}

/**
 * Sets the brightness for a specific monitor using the active tool.
 * @param {string} deviceId - The identifier for the monitor.
 * @param {number} brightness - The brightness level (0-100).
 * @returns {Promise<void>}
 */
function setBrightness(deviceId, brightness) {
    return new Promise((resolve, reject) => {
        if (!activeTool) {
            return reject(new Error('No DDC/CI control tool is available.'));
        }

        const roundedBrightness = Math.round(brightness);
        let command;

        if (activeTool === 'monitorian') {
            command = `Monitorian.exe /set "${deviceId}" ${roundedBrightness} B`;
        } else if (activeTool === 'controlmymonitor') {
            // VCP code for brightness is 10
            command = `"${CONTROL_MY_MONITOR_PATH}" /SetValue "${deviceId}" 10 ${roundedBrightness}`;
        } else {
            return reject(new Error('Unknown DDC/CI control tool.'));
        }

        exec(command, (error) => {
            if (error) {
                console.error(`[${deviceId}] DDC/CI Error with ${activeTool}: ${error.message}`);
                reject(error);
            } else {
                console.log(`[${deviceId}] DDC/CI Brightness set to ${roundedBrightness}% using ${activeTool}`);
                resolve();
            }
        });
    });
}


module.exports = {
    initialize,
    getAvailableMonitors,
    setBrightness,
    isInitialized: () => isInitialized,
    getActiveTool: () => activeTool,
};